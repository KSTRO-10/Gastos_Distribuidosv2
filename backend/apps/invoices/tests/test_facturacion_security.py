from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework import status
from apps.areas.models import Area
from apps.companies.models import Proveedor, Company
from apps.invoices.models import Factura, DistribucionGasto, FacturaDetalle
from apps.accounts.models import Role

User = get_user_model()


class FacturacionSecurityTests(APITestCase):
    def setUp(self):
        self.role_area = Role.objects.create(name=Role.RoleType.AREA)
        self.role_tesoreria = Role.objects.create(name=Role.RoleType.TESORERIA)

        self.company = Company.objects.create(rfc="COMP123", razon_social="Test Co")
        self.area1 = Area.objects.create(name="Area 1", code="A1", company=self.company)
        self.area2 = Area.objects.create(name="Area 2", code="A2", company=self.company)
        self.user_area1 = User.objects.create_user(
            username="u1", email="u1@sec.com", area=self.area1, role=self.role_area
        )
        self.user_area2 = User.objects.create_user(
            username="u2", email="u2@sec.com", area=self.area2, role=self.role_area
        )
        self.user_tesoreria = User.objects.create_user(
            username="t1", email="t1@sec.com", role=self.role_tesoreria
        )

        self.proveedor = Proveedor.objects.create(razon_social="P1", rfc="P1234")

        # Invoices
        self.f1 = Factura.objects.create(
            proveedor=self.proveedor,
            total=10,
            uploaded_by=self.user_tesoreria,
            xml_file="dummy1.xml",
        )
        self.f2 = Factura.objects.create(
            proveedor=self.proveedor,
            total=20,
            uploaded_by=self.user_tesoreria,
            xml_file="dummy2.xml",
        )

        # Conceptos
        c1 = FacturaDetalle.objects.create(
            factura=self.f1, descripcion="c1", cantidad=1, valor_unitario=10, importe=10
        )
        c2 = FacturaDetalle.objects.create(
            factura=self.f2, descripcion="c2", cantidad=1, valor_unitario=20, importe=20
        )

        # Distribuciones
        DistribucionGasto.objects.create(
            factura=self.f1,
            concepto=c1,
            area=self.area1,
            monto=10,
            created_by=self.user_tesoreria,
        )
        DistribucionGasto.objects.create(
            factura=self.f2,
            concepto=c2,
            area=self.area2,
            monto=20,
            created_by=self.user_tesoreria,
        )

    def test_aislamiento_areas(self):
        # User 1 should only see f1
        self.client.force_authenticate(user=self.user_area1)
        response = self.client.get("/api/invoices/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = (
            response.data.get("results", response.data)
            if isinstance(response.data, dict)
            else response.data
        )
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], self.f1.id)

        # User 2 should only see f2
        self.client.force_authenticate(user=self.user_area2)
        response = self.client.get("/api/invoices/")
        results = (
            response.data.get("results", response.data)
            if isinstance(response.data, dict)
            else response.data
        )
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], self.f2.id)

    def test_tesoreria_ve_todo(self):
        self.client.force_authenticate(user=self.user_tesoreria)
        response = self.client.get("/api/invoices/")
        results = (
            response.data.get("results", response.data)
            if isinstance(response.data, dict)
            else response.data
        )
        self.assertEqual(len(results), 2)
