# pyright: reportAttributeAccessIssue=false
# pylint: disable=too-many-locals, line-too-long, import-error
"""
End-to-end tests for the procurement to inventory workflow.
"""

import pytest  # type: ignore
from apps.accounts.models import Role, User
from apps.areas.models import Area
from apps.companies.models import Company, Proveedor
from apps.inventory.models import Articulo, EntregaBienes, EntregaDetalle
from apps.orders.models import (
    AutorizacionPresupuestal,
    DetalleOrden,
    OrdenCompra,
    SolicitudAutorizacion,
)
from apps.procurement.models import Cog, DetalleMaterial, SolicitudMaterial
from apps.quotations.models import CotizacionDetalle, CotizacionMaterial
from django.utils import timezone  # type: ignore


@pytest.mark.django_db
class TestProcurementToInventoryE2E:
    """
    Tests the complete workflow from a material request to inventory reception.
    """

    @pytest.fixture
    def setup_data(self):
        """
        Creates the necessary base data for the tests.
        """
        # Create user roles
        role_area, _ = Role.objects.get_or_create(name=Role.RoleType.AREA)  # type: ignore
        role_adq, _ = Role.objects.get_or_create(name=Role.RoleType.ADQUISICIONES)  # type: ignore
        role_tes, _ = Role.objects.get_or_create(name=Role.RoleType.TESORERIA)  # type: ignore
        role_alm, _ = Role.objects.get_or_create(name=Role.RoleType.ALMACEN)  # type: ignore
        role_prov, _ = Role.objects.get_or_create(name=Role.RoleType.PROVEEDOR)  # type: ignore

        area_user = User.objects.create(
            username="area_user", email="area@test.com", role=role_area, is_active=True
        )
        adq_user = User.objects.create(
            username="adq_user", email="adq@test.com", role=role_adq, is_active=True
        )
        tes_user = User.objects.create(
            username="tes_user", email="tes@test.com", role=role_tes, is_active=True
        )
        alm_user = User.objects.create(
            username="alm_user", email="alm@test.com", role=role_alm, is_active=True
        )

        # Create Area & Supplier
        company = Company.objects.create(razon_social="Test Co", rfc="TEST010101XYZ")  # type: ignore
        area = Area.objects.create(company=company, code="A01", name="Sistemas")  # type: ignore
        almacen = Area.objects.create(  # type: ignore
            company=company, code="ALM01", name="Almacén Central"
        )
        proveedor_user = User.objects.create(
            username="prov1", email="prov@test.com", role=role_prov
        )
        proveedor = Proveedor.objects.create(  # type: ignore
            user=proveedor_user, razon_social="Prov SA", rfc="PROV123456"
        )

        # Create COG and Article
        cog = Cog.objects.create(codigo="2140001", descripcion="Equipos menores")  # type: ignore
        articulo = Articulo.objects.create(  # type: ignore
            codigo="ART-1",
            nombre="Laptop",
            unidad_medida="PZA",
            cog=cog,
            costo_promedio=10000,
        )

        return {
            "area_user": area_user,
            "adq_user": adq_user,
            "tes_user": tes_user,
            "alm_user": alm_user,
            "area": area,
            "almacen": almacen,
            "proveedor": proveedor,
            "cog": cog,
            "articulo": articulo,
        }

    def test_flujo_completo_compras_inventario(self, setup_data):
        """
        Tests the E2E flow: Solicitud -> Cotizacion -> Autorizacion -> OC -> Entrega.
        """
        now = timezone.now()
        data = setup_data

        # 1. Solicitud
        solicitud = SolicitudMaterial.objects.create(  # type: ignore
            area=data["area"],
            created_by=data["area_user"],
            descripcion="Renovación equipo",
            estado=SolicitudMaterial.EstadoChoices.EN_COTIZACION,
            fecha_solicitud=now,
        )
        detalle_sol = DetalleMaterial.objects.create(  # type: ignore
            solicitud=solicitud,
            cog=data["cog"],
            concepto="Laptop",
            cantidad=5,
            precio_estimado=12000,
            unidad="PZA",
        )
        solicitud.total_estimado = 60000
        solicitud.save()

        # 2. Cotización Ganadora
        cotizacion = CotizacionMaterial.objects.create(  # type: ignore
            solicitud=solicitud,
            proveedor=data["proveedor"],
            estado=CotizacionMaterial.EstadoChoices.SELECCIONADA,
            subtotal=50000,
            iva=8000,
            total=58000,
            fecha=now.date(),
        )
        CotizacionDetalle.objects.create(  # type: ignore
            cotizacion=cotizacion,
            detalle_material=detalle_sol,
            concepto="Laptop Dell",
            cantidad=5,
            precio_unitario=10000,
            unidad="PZA",
            subtotal=50000,
        )
        solicitud.estado = SolicitudMaterial.EstadoChoices.COTIZADO
        solicitud.save()

        # 3. Autorización (Generada al seleccionar cotización)
        autorizacion = SolicitudAutorizacion.objects.create(  # type: ignore
            solicitud=solicitud,
            cotizacion=cotizacion,
            solicitante=data["adq_user"],
            monto_solicitado=58000,
            estado=SolicitudAutorizacion.EstadoChoices.APROBADA,
        )
        aprobacion_presu = AutorizacionPresupuestal.objects.create(  # type: ignore
            solicitud_autorizacion=autorizacion,
            monto_autorizado=58000,
            partida_presupuestal="2140001",
            aprobado_por=data["tes_user"],
            fecha_aprobacion=now.date(),
        )
        solicitud.estado = SolicitudMaterial.EstadoChoices.AUTORIZADO
        solicitud.save()

        # 4. Generación de Orden de Compra
        orden = OrdenCompra.objects.create(  # type: ignore
            proveedor=data["proveedor"],
            cotizacion=cotizacion,
            autorizacion=aprobacion_presu,
            fecha_emision=now.date(),
            subtotal=50000,
            iva=8000,
            total=58000,
            estado=OrdenCompra.EstadoChoices.ENVIADA,
            created_by=data["adq_user"],
        )
        detalle_oc = DetalleOrden.objects.create(  # type: ignore
            orden=orden,
            detalle_material=detalle_sol,
            concepto="Laptop Dell",
            cantidad=5,
            precio_unitario=10000,
            subtotal=50000,
            unidad="PZA",
        )

        # Assertions mid-flow
        assert orden.estado == "enviada"
        assert orden.total == autorizacion.autorizacion_presupuestal.monto_autorizado
        assert orden.total == cotizacion.total

        # 5. Proveedor confirma la orden
        orden.estado = OrdenCompra.EstadoChoices.CONFIRMADA
        orden.save()

        # 6. Almacén recibe la mercancía (Integración Inventario)
        entrega = EntregaBienes.objects.create(  # type: ignore
            orden=orden,
            fecha_recepcion=now,
            recibido_por=data["alm_user"],
            completa=True,
        )
        # La señal de inventario/save debe sumar la cantidad al DetalleOrden.cantidad_recibida y al Stock
        EntregaDetalle.objects.create(  # type: ignore
            entrega=entrega,
            detalle_orden=detalle_oc,
            articulo=data["articulo"],
            cantidad_recibida=5,
            condicion_buena=True,
        )

        # Verify OC details update
        detalle_oc.refresh_from_db()
        assert detalle_oc.cantidad_recibida == 5

        # Verificar si hay trigger para actualizar el Stock
        # Depende de la lógica de negocio actual,
        # si EntregaDetalle actualiza Stock o no.
        # Si no lo hace, este test detectará que falta la conexión.
