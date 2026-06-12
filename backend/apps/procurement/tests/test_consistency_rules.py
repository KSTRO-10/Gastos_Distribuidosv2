import pytest
from apps.procurement.models import SolicitudMaterial
from apps.quotations.models import CotizacionMaterial
from apps.orders.models import SolicitudAutorizacion, OrdenCompra


@pytest.mark.django_db
class TestProcurementConsistency:

    def test_ordenes_tienen_autorizacion_valida(self):
        """Verifica que cada OrdenCompra esté ligada a una SolicitudAutorizacion en estado APROBADA."""
        ordenes = OrdenCompra.objects.all()
        for orden in ordenes:
            assert (
                orden.autorizacion is not None
            ), f"La OC {orden.numero} no tiene autorización."
            assert (
                orden.autorizacion.estado
                == SolicitudAutorizacion.EstadoChoices.APROBADA
            ), f"La OC {orden.numero} tiene autorización en estado {orden.autorizacion.estado}."

    def test_unicidad_cotizacion_ganadora(self):
        """Asegura que ninguna Solicitud tenga más de una cotización seleccionada."""
        solicitudes = SolicitudMaterial.objects.all()
        for solicitud in solicitudes:
            cotizaciones_seleccionadas = CotizacionMaterial.objects.filter(
                solicitud=solicitud,
                estado=CotizacionMaterial.EstadoChoices.SELECCIONADA,
            ).count()
            assert (
                cotizaciones_seleccionadas <= 1
            ), f"La Solicitud {solicitud.numero} tiene {cotizaciones_seleccionadas} cotizaciones seleccionadas."

    def test_igualdad_montos_autorizados(self):
        """Comprueba que el total de la OC sea <= al monto de la autorización presupuestal."""
        ordenes = OrdenCompra.objects.all()
        for orden in ordenes:
            aprobacion = orden.autorizacion.autorizacion_presupuestal
            assert (
                aprobacion is not None
            ), f"OC {orden.numero} no tiene registro en AutorizacionPresupuestal."
            assert (
                orden.total <= aprobacion.monto_autorizado
            ), f"OC {orden.numero} excede monto autorizado: {orden.total} > {aprobacion.monto_autorizado}."

    def test_trazabilidad_cotizacion_orden(self):
        """Verifica que la OC apunte a la misma Cotización que la Autorización."""
        ordenes = OrdenCompra.objects.all()
        for orden in ordenes:
            assert (
                orden.cotizacion_id == orden.autorizacion.cotizacion_id
            ), f"OC {orden.numero} apunta a una cotización diferente a la de su autorización."
