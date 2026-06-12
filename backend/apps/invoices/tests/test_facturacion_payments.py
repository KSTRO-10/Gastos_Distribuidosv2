from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.companies.models import Proveedor
from apps.invoices.models import Factura, Pago
from apps.accounts.models import Role

User = get_user_model()


class FacturacionPaymentsTests(APITestCase):
    def setUp(self):
        self.role_tesoreria = Role.objects.create(name=Role.RoleType.TESORERIA)
        self.user = User.objects.create_user(
            username="tesorero", email="tesorero@pay.com", role=self.role_tesoreria
        )
        self.proveedor = Proveedor.objects.create(razon_social="P1", rfc="P1234")
        self.factura = Factura.objects.create(
            proveedor=self.proveedor,
            total=100,
            status=Factura.EstadoChoices.AUTORIZADA,
            uploaded_by=self.user,
            xml_file="dummy.xml",
        )

    def test_flujo_pago_completo(self):
        self.client.force_authenticate(user=self.user)

        # 1. Programar Pago
        data = {
            "factura_ids": [self.factura.id],
            "fecha_pago": "2026-02-01",
            "cuenta_origen": "123456",
        }
        response = self.client.post(
            "/api/invoices/programar_pago_masivo/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.factura.refresh_from_db()
        self.assertEqual(self.factura.status, Factura.EstadoChoices.PROGRAMADA)

        # 2. Registrar Pago
        file = SimpleUploadedFile(
            "comprobante.pdf", b"file_content", content_type="application/pdf"
        )
        data_pago = {
            "fecha_pago": "2026-02-01",
            "monto": "100.00",
            "referencia": "REF-001",
            "comprobante": file,
        }
        response = self.client.post(
            f"/api/invoices/{self.factura.id}/registrar_pago/",
            data_pago,
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.factura.refresh_from_db()
        self.assertEqual(self.factura.status, Factura.EstadoChoices.PAGADA)
        self.assertEqual(Pago.objects.count(), 1)

        # 3. Intentar modificar factura pagada
        response = self.client.patch(
            f"/api/invoices/{self.factura.id}/", {"total": 200}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Intentar pagar duplicado (debe fallar porque ya no está en PROGRAMADA)
        file2 = SimpleUploadedFile(
            "comprobante2.pdf", b"file_content", content_type="application/pdf"
        )
        data_pago2 = {
            "fecha_pago": "2026-02-01",
            "monto": "100.00",
            "referencia": "REF-002",
            "comprobante": file2,
        }
        response = self.client.post(
            f"/api/invoices/{self.factura.id}/registrar_pago/",
            data_pago2,
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
