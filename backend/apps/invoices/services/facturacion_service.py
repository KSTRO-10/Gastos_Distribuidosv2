from decimal import Decimal
from django.db import transaction  # type: ignore
from apps.invoices.models import Factura, FacturaHistorial, LotePago, Pago


class FacturacionService:
    @staticmethod
    def validar_3_way_match(
        factura: Factura, aprobado: bool, comentarios: str, usuario
    ) -> Factura:
        """
        Ejecuta la resolución del 3-Way Match de una factura (Autorizar CXP o Rechazar).
        """
        with transaction.atomic():  # type: ignore
            if (
                factura.status != Factura.EstadoChoices.VALIDANDO
                and factura.status != Factura.EstadoChoices.PROCESADA
            ):
                raise ValueError(
                    f"La factura no está en estado válido para autorización. Estado actual: {factura.status}"
                )

            estado_anterior = factura.status
            estado_nuevo = (
                Factura.EstadoChoices.AUTORIZADA.value
                if aprobado
                else Factura.EstadoChoices.RECHAZADA.value
            )

            # Validaciones de negocio
            if aprobado:
                # Bloqueo si no hay orden de compra vinculada
                if not factura.orden_compra:
                    raise ValueError(
                        "No se puede autorizar el pago sin una Orden de Compra vinculada."
                    )

                if not factura.recepcion:
                    raise ValueError(
                        "No se puede autorizar el pago sin una Recepción (Entrega de Bienes) vinculada."
                    )

                # Tolerancia de montos (1% o $1.00 de diferencia)
                orden = factura.orden_compra
                if abs(factura.total - orden.total) > Decimal("1.00") and abs(
                    factura.total - orden.total
                ) / orden.total > Decimal("0.01"):
                    raise ValueError(
                        f"El total de la factura ({factura.total}) excede la tolerancia permitida respecto a la orden ({orden.total})."
                    )

            # Actualizar estado de factura
            factura.status = estado_nuevo  # type: ignore
            factura.save(update_fields=["status", "updated_at"])

            # Registrar en el historial de auditoría
            FacturaHistorial.objects.create(  # type: ignore
                factura=factura,
                estado_anterior=estado_anterior,
                estado_nuevo=estado_nuevo,
                comentarios=comentarios,
                usuario=usuario,
            )

            return factura

    @staticmethod
    def programar_pagos(
        factura_ids: list, fecha_pago, cuenta_origen: str, usuario
    ) -> LotePago:
        """
        Crea un Lote de Pago para un conjunto de facturas autorizadas.
        """
        with transaction.atomic():  # type: ignore
            facturas = Factura.objects.filter(id__in=factura_ids, status=Factura.EstadoChoices.AUTORIZADA)  # type: ignore
            if facturas.count() != len(factura_ids):
                raise ValueError(
                    "Algunas facturas no existen o no están en estado 'Autorizada CXP'."
                )

            # Crear el lote de programación
            lote = LotePago.objects.create(  # type: ignore
                fecha_pago=fecha_pago,
                cuenta_origen=cuenta_origen,
                estado=LotePago.EstadoChoices.PROGRAMADO,
                creado_por=usuario,
            )

            # Actualizar las facturas y crear historial
            for factura in facturas:
                estado_anterior = factura.status
                factura.status = Factura.EstadoChoices.PROGRAMADA  # type: ignore
                factura.save(update_fields=["status", "updated_at"])

                FacturaHistorial.objects.create(  # type: ignore
                    factura=factura,
                    estado_anterior=estado_anterior,
                    estado_nuevo=Factura.EstadoChoices.PROGRAMADA,
                    comentarios=f"Programada en el lote {lote.id} para {fecha_pago}",
                    usuario=usuario,
                )

            return lote

    @staticmethod
    def registrar_pago(
        factura: Factura,
        comprobante,
        referencia: str,
        monto: Decimal,
        fecha_pago,
        usuario,
    ) -> Pago:
        """
        Registra el pago físico/bancario de una factura programada.
        """
        with transaction.atomic():  # type: ignore
            # Bloqueo para lectura/escritura concurrente
            factura = Factura.objects.select_for_update().get(id=factura.id)  # type: ignore

            if factura.status != Factura.EstadoChoices.PROGRAMADA:
                raise ValueError(
                    f"La factura no está programada para pago. Estado actual: {factura.status}"
                )

            estado_anterior = factura.status
            factura.status = Factura.EstadoChoices.PAGADA  # type: ignore
            factura.save(update_fields=["status", "updated_at"])

            pago = Pago.objects.create(  # type: ignore
                factura=factura,
                monto=monto,
                fecha_pago=fecha_pago,
                comprobante=comprobante,
                referencia=referencia,
                creado_por=usuario,
            )

            FacturaHistorial.objects.create(  # type: ignore
                factura=factura,
                estado_anterior=estado_anterior,
                estado_nuevo=Factura.EstadoChoices.PAGADA,
                comentarios=f"Pago registrado: {referencia}",
                usuario=usuario,
            )

            return pago
