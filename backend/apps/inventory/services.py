"""
Inventory business logic services.
"""

from django.db import transaction
from django.core.exceptions import ValidationError
from .models import (
    Stock,
    EntregaBienes,
    SalidaBienes,
    DevolucionInterna,
    AjusteInventario,
    AjusteInventarioDetalle,
)
from ..notifications.models import ActivityLog


class InventoryService:
    @staticmethod
    def add_stock(almacen, articulo, cantidad, user=None, referencia=""):
        """Añade existencias al stock de un artículo en un almacén."""
        if cantidad <= 0:
            raise ValidationError("La cantidad a añadir debe ser mayor a cero.")

        with transaction.atomic():
            stock, created = Stock.objects.select_for_update().get_or_create(
                almacen=almacen,
                articulo=articulo,
                defaults={"cantidad": 0, "cantidad_reservada": 0},
            )

            datos_anteriores = {"cantidad": float(stock.cantidad)}

            stock.cantidad += cantidad
            stock.save()

            datos_nuevos = {"cantidad": float(stock.cantidad)}

            # Registrar en bitácora si hay usuario
            if user:
                ActivityLog.objects.create(
                    user=user,
                    accion=ActivityLog.AccionChoices.ACTUALIZAR,
                    modelo="Stock",
                    objeto_id=stock.id,
                    descripcion=f"Ingreso de stock: +{cantidad}. Referencia: {referencia}",
                    datos_anteriores=datos_anteriores,
                    datos_nuevos=datos_nuevos,
                )

            return stock

    @staticmethod
    def remove_stock(almacen, articulo, cantidad, user=None, referencia=""):
        """Resta existencias del stock de un artículo en un almacén."""
        if cantidad <= 0:
            raise ValidationError("La cantidad a restar debe ser mayor a cero.")

        with transaction.atomic():
            try:
                stock = Stock.objects.select_for_update().get(
                    almacen=almacen, articulo=articulo
                )
            except Stock.DoesNotExist:
                raise ValidationError(
                    f"No existe stock para el artículo {articulo.nombre} en el almacén {almacen.name}."
                )

            if stock.estado_articulo != Stock.EstadoArticuloChoices.DISPONIBLE:
                raise ValidationError(
                    f"El artículo {articulo.nombre} no se puede extraer porque su estado es: {stock.get_estado_articulo_display()}."
                )

            if stock.cantidad < cantidad:
                raise ValidationError(
                    f"Stock insuficiente para el artículo {articulo.nombre}. Disponible: {stock.cantidad}"
                )

            datos_anteriores = {"cantidad": float(stock.cantidad)}

            stock.cantidad -= cantidad
            stock.save()

            datos_nuevos = {"cantidad": float(stock.cantidad)}

            # Registrar en bitácora
            if user:
                ActivityLog.objects.create(
                    user=user,
                    accion=ActivityLog.AccionChoices.ACTUALIZAR,
                    modelo="Stock",
                    objeto_id=stock.id,
                    descripcion=f"Salida de stock: -{cantidad}. Referencia: {referencia}",
                    datos_anteriores=datos_anteriores,
                    datos_nuevos=datos_nuevos,
                )

            return stock

    @staticmethod
    @transaction.atomic
    def procesar_entrega(entrega: EntregaBienes, almacen_destino, user):
        """
        Procesa una entrega de bienes, sumando todo al stock.
        Requiere que el modelo EntregaBienes se pase como argumento,
        y define a qué almacén se ingresarán los bienes.
        """
        if entrega.completa:
            raise ValidationError(
                "Esta entrega ya fue procesada y marcada como completa."
            )

        for detalle in entrega.detalles.all():
            if detalle.articulo and detalle.cantidad_recibida > 0:
                InventoryService.add_stock(
                    almacen=almacen_destino,
                    articulo=detalle.articulo,
                    cantidad=detalle.cantidad_recibida,
                    user=user,
                    referencia=f"Entrega: {entrega.numero}",
                )

        entrega.completa = True
        entrega.save(update_fields=["completa"])
        return entrega

    @staticmethod
    @transaction.atomic
    def confirmar_salida(salida: SalidaBienes, user):
        """
        El área destino confirma la recepción de los bienes.
        En este punto, descontamos del stock del almacén origen.
        """
        if salida.confirmada:
            raise ValidationError("Esta salida ya fue confirmada previamente.")

        for detalle in salida.detalles.all():
            if detalle.articulo and detalle.cantidad > 0:
                InventoryService.remove_stock(
                    almacen=salida.almacen,
                    articulo=detalle.articulo,
                    cantidad=detalle.cantidad,
                    user=user,
                    referencia=f"Salida: {salida.numero}",
                )

        salida.confirmada = True
        salida.confirmada_por = user
        from django.utils import timezone

        salida.fecha_confirmacion = timezone.now()
        salida.save(
            update_fields=["confirmada", "confirmada_por", "fecha_confirmacion"]
        )
        return salida

    @staticmethod
    @transaction.atomic
    def confirmar_devolucion_interna(devolucion: DevolucionInterna, user):
        """
        El almacén confirma la recepción física de los bienes devueltos por el área.
        En este punto, aumentamos el stock del almacén destino.
        """
        if devolucion.estado != DevolucionInterna.EstadoChoices.PENDIENTE:
            raise ValidationError("Esta devolución ya no está pendiente.")

        for detalle in devolucion.detalles.all():
            if detalle.articulo and detalle.cantidad > 0:
                InventoryService.add_stock(
                    almacen=devolucion.almacen_destino,
                    articulo=detalle.articulo,
                    cantidad=detalle.cantidad,
                    user=user,
                    referencia=f"Devolución: {devolucion.numero}",
                )

        devolucion.estado = DevolucionInterna.EstadoChoices.COMPLETADA
        devolucion.recibido_por = user
        from django.utils import timezone

        devolucion.fecha_recepcion = timezone.now()
        devolucion.save(update_fields=["estado", "recibido_por", "fecha_recepcion"])
        return devolucion

    @staticmethod
    @transaction.atomic
    def aprobar_ajuste(ajuste: AjusteInventario, user):
        """
        Un administrador aprueba un ajuste de inventario.
        Aplica los movimientos de suma o resta al stock según los detalles.
        """
        if ajuste.estado != AjusteInventario.EstadoChoices.PENDIENTE:
            raise ValidationError("Este ajuste ya fue procesado.")

        for detalle in ajuste.detalles.all():
            if detalle.articulo and detalle.cantidad > 0:
                if detalle.tipo == AjusteInventarioDetalle.TipoAjuste.SUMA:
                    InventoryService.add_stock(
                        almacen=ajuste.almacen,
                        articulo=detalle.articulo,
                        cantidad=detalle.cantidad,
                        user=user,
                        referencia=f"Ajuste (+): {ajuste.numero}",
                    )
                elif detalle.tipo == AjusteInventarioDetalle.TipoAjuste.RESTA:
                    InventoryService.remove_stock(
                        almacen=ajuste.almacen,
                        articulo=detalle.articulo,
                        cantidad=detalle.cantidad,
                        user=user,
                        referencia=f"Ajuste (-): {ajuste.numero}",
                    )

                    # Opcional: actualizar estado_articulo si es baja
                    if ajuste.motivo_general in [
                        AjusteInventario.MotivoChoices.PERDIDA,
                        AjusteInventario.MotivoChoices.DANO,
                    ]:
                        try:
                            from .models import Stock

                            stock = Stock.objects.get(
                                almacen=ajuste.almacen, articulo=detalle.articulo
                            )
                            stock.estado_articulo = (
                                Stock.EstadoArticuloChoices.BAJA_DEFINITIVA
                            )
                            stock.save(update_fields=["estado_articulo"])
                        except Stock.DoesNotExist:
                            pass

        ajuste.estado = AjusteInventario.EstadoChoices.APROBADO
        ajuste.autorizador = user
        from django.utils import timezone

        ajuste.fecha_autorizacion = timezone.now()
        ajuste.save(update_fields=["estado", "autorizador", "fecha_autorizacion"])
        return ajuste
