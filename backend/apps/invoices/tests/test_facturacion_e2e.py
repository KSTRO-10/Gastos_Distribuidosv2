from django.test import TestCase
from decimal import Decimal
from django.contrib.auth import get_user_model
from apps.areas.models import Area
from apps.companies.models import Proveedor, Company
from apps.orders.models import OrdenCompra
from apps.inventory.models import EntregaBienes
from apps.invoices.models import Factura
from apps.invoices.services import FacturacionService
from apps.accounts.models import Role

User = get_user_model()


class FacturacionE2ETests(TestCase):
    def setUp(self):
        self.role_area = Role.objects.create(name=Role.RoleType.AREA)
        self.company = Company.objects.create(rfc="COMP123", razon_social="Test Co")
        self.area = Area.objects.create(
            name="Test Area", code="TA", company=self.company
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@e2e.com",
            area=self.area,
            role=self.role_area,
        )
        self.proveedor = Proveedor.objects.create(
            razon_social="Test Proveedor", rfc="TEST123456789"
        )

        self.orden = OrdenCompra.objects.create(
            proveedor=self.proveedor,
            numero="OC-1",
            total=Decimal("100.00"),
            created_by=self.user,
            fecha_emision="2026-01-01",
        )

    def test_3_way_match_success(self):
        # Create recepcion
        recepcion = EntregaBienes.objects.create(
            orden=self.orden,
            numero="REC-1",
            fecha_recepcion="2026-01-02",
            recibido_por=self.user,
        )

        # Create factura
        factura = Factura.objects.create(
            proveedor=self.proveedor,
            orden_compra=self.orden,
            recepcion=recepcion,
            total=Decimal("100.00"),
            status=Factura.EstadoChoices.VALIDANDO,
            uploaded_by=self.user,
            xml_file="dummy.xml",
        )

        # Validate
        resultado = FacturacionService.validar_3_way_match(
            factura, True, "OK", self.user
        )
        self.assertEqual(resultado.status, Factura.EstadoChoices.AUTORIZADA)

    def test_3_way_match_fails_sin_recepcion(self):
        # Factura sin recepcion
        factura = Factura.objects.create(
            proveedor=self.proveedor,
            orden_compra=self.orden,
            total=Decimal("100.00"),
            status=Factura.EstadoChoices.VALIDANDO,
            uploaded_by=self.user,
            xml_file="dummy.xml",
        )

        with self.assertRaisesMessage(
            ValueError,
            "No se puede autorizar el pago sin una Recepción (Entrega de Bienes) vinculada.",
        ):
            FacturacionService.validar_3_way_match(factura, True, "OK", self.user)

    def test_3_way_match_fails_tolerancia(self):
        # Create recepcion
        recepcion = EntregaBienes.objects.create(
            orden=self.orden,
            numero="REC-2",
            fecha_recepcion="2026-01-02",
            recibido_por=self.user,
        )

        # Create factura with different total (OC is 100, Factura is 200)
        factura = Factura.objects.create(
            proveedor=self.proveedor,
            orden_compra=self.orden,
            recepcion=recepcion,
            total=Decimal("200.00"),
            status=Factura.EstadoChoices.VALIDANDO,
            uploaded_by=self.user,
            xml_file="dummy.xml",
        )

        with self.assertRaisesMessage(ValueError, "El total de la factura"):
            FacturacionService.validar_3_way_match(factura, True, "OK", self.user)
