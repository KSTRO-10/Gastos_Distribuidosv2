import logging
import datetime
import uuid
from decimal import Decimal
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.forms.models import model_to_dict
from apps.notifications.middleware import get_current_request

from apps.accounts.models import User, Role
from apps.procurement.models import SolicitudMaterial
from apps.quotations.models import CotizacionMaterial
from apps.orders.models import OrdenCompra
from apps.invoices.models import Factura
from apps.notifications.models import Notification

logger = logging.getLogger(__name__)


# --- PRE_SAVE: Capturar estados anteriores para comparar cambios ---


@receiver(pre_save, sender=SolicitudMaterial)
def capturar_estado_anterior_solicitud(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = SolicitudMaterial.objects.get(pk=instance.pk)
            instance._old_estado = old_instance.estado
        except SolicitudMaterial.DoesNotExist:
            instance._old_estado = None
    else:
        instance._old_estado = None


@receiver(pre_save, sender=CotizacionMaterial)
def capturar_estado_anterior_cotizacion(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = CotizacionMaterial.objects.get(pk=instance.pk)
            instance._old_estado = old_instance.estado
        except CotizacionMaterial.DoesNotExist:
            instance._old_estado = None
    else:
        instance._old_estado = None


@receiver(pre_save, sender=OrdenCompra)
def capturar_estado_anterior_orden(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = OrdenCompra.objects.get(pk=instance.pk)
            instance._old_estado = old_instance.estado
        except OrdenCompra.DoesNotExist:
            instance._old_estado = None
    else:
        instance._old_estado = None


@receiver(pre_save, sender=Factura)
def capturar_estado_anterior_factura(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = Factura.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except Factura.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(pre_save, sender=User)
def capturar_verificacion_ine_anterior(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = User.objects.get(pk=instance.pk)
            instance._old_ine_verificada = old_instance.ine_verificada
            instance._old_ine_rechazada = old_instance.ine_rechazada
        except User.DoesNotExist:
            instance._old_ine_verificada = False
            instance._old_ine_rechazada = False
    else:
        instance._old_ine_verificada = False
        instance._old_ine_rechazada = False


# --- POST_SAVE: Crear notificaciones al detectar cambios significativos ---


@receiver(post_save, sender=SolicitudMaterial)
def notificar_cambios_solicitud(sender, instance, created, **kwargs):
    try:
        old_estado = getattr(instance, "_old_estado", None)
        nuevo_estado = instance.estado

        # Si el estado no cambió y no es una solicitud recién creada, salir.
        if not created and old_estado == nuevo_estado:
            return

        # 1. Al pasar a 'enviado': Notificar a Adquisiciones y Admin
        if nuevo_estado == SolicitudMaterial.EstadoChoices.ENVIADO:
            adqs_and_admins = User.objects.filter(
                role__name__in=[Role.RoleType.ADQUISICIONES, Role.RoleType.ADMIN],
                is_active=True,
            )
            for user in adqs_and_admins:
                Notification.objects.create(
                    user=user,
                    tipo=Notification.TipoChoices.INFO,
                    title="Nueva solicitud recibida",
                    message=f"La solicitud {
                        instance.numero} del área '{
                        instance.area.name}' ha sido enviada para cotización.",
                    action_url=f"/solicitudes/{
                        instance.id}",
                )

        # 2. Requiere verificación INE: Notificar al creador de la solicitud
        elif nuevo_estado == SolicitudMaterial.EstadoChoices.PENDIENTE_VERIFICACION:
            Notification.objects.create(
                user=instance.created_by,
                tipo=Notification.TipoChoices.WARNING,
                title="Verificación de INE requerida",
                message=f"La solicitud {
                    instance.numero} está pausada en espera de que subas y se verifique tu documento INE.",
                action_url=f"/solicitudes/{
                    instance.id}",
            )

        # 3. INE Rechazada: Notificar al creador
        elif nuevo_estado == SolicitudMaterial.EstadoChoices.INE_RECHAZADA:
            Notification.objects.create(
                user=instance.created_by,
                tipo=Notification.TipoChoices.ERROR,
                title="INE Rechazada",
                message=f"La verificación de tu INE para la solicitud {
                    instance.numero} fue rechazada. Motivo: {
                    instance.ine_rechazo_motivo or 'No especificado'}.",
                action_url=f"/solicitudes/{
                    instance.id}",
            )

        # 4. En Cotización: Notificar al creador
        elif (
            nuevo_estado == SolicitudMaterial.EstadoChoices.EN_COTIZACION
            and old_estado == SolicitudMaterial.EstadoChoices.ENVIADO
        ):
            Notification.objects.create(
                user=instance.created_by,
                tipo=Notification.TipoChoices.INFO,
                title="Solicitud en cotización",
                message=f"Tu solicitud {instance.numero} ha pasado a la etapa de cotización.",
                action_url=f"/solicitudes/{instance.id}",
            )

        # 5. En Autorización: Notificar a Tesorería y Admin
        elif nuevo_estado == SolicitudMaterial.EstadoChoices.EN_AUTORIZACION:
            tesos_and_admins = User.objects.filter(
                role__name__in=[Role.RoleType.TESORERIA, Role.RoleType.ADMIN],
                is_active=True,
            )
            for user in tesos_and_admins:
                Notification.objects.create(
                    user=user,
                    tipo=Notification.TipoChoices.WARNING,
                    title="Aprobación presupuestaria requerida",
                    message=f"La solicitud {instance.numero} requiere de tu autorización presupuestal.",
                    action_url=f"/cotizaciones/comparar/{instance.id}",
                )

        # 6. Autorizado: Notificar al creador
        elif nuevo_estado == SolicitudMaterial.EstadoChoices.AUTORIZADO:
            Notification.objects.create(
                user=instance.created_by,
                tipo=Notification.TipoChoices.SUCCESS,
                title="Solicitud Autorizada",
                message=f"¡Buenas noticias! Tu solicitud {
                    instance.numero} ha sido autorizada presupuestalmente.",
                action_url=f"/solicitudes/{
                    instance.id}",
            )

        # 7. Cancelado: Notificar al creador
        elif nuevo_estado == SolicitudMaterial.EstadoChoices.CANCELADO:
            Notification.objects.create(
                user=instance.created_by,
                tipo=Notification.TipoChoices.ERROR,
                title="Solicitud Cancelada",
                message=f"La solicitud {instance.numero} ha sido cancelada.",
                action_url=f"/solicitudes/{instance.id}",
            )

    except Exception as e:
        logger.error(f"Error al enviar notificaciones de SolicitudMaterial: {
                str(e)}")


@receiver(post_save, sender=CotizacionMaterial)
def notificar_cambios_cotizacion(sender, instance, created, **kwargs):
    try:
        old_estado = getattr(instance, "_old_estado", None)
        nuevo_estado = instance.estado

        if not created and old_estado == nuevo_estado:
            return

        # 1. Al pasar de pendiente a recibida (cuando el proveedor cotiza)
        if nuevo_estado == CotizacionMaterial.EstadoChoices.RECIBIDA:
            adqs_and_admins = User.objects.filter(
                role__name__in=[Role.RoleType.ADQUISICIONES, Role.RoleType.ADMIN],
                is_active=True,
            )
            for user in adqs_and_admins:
                Notification.objects.create(
                    user=user,
                    tipo=Notification.TipoChoices.SUCCESS,
                    title="Cotización recibida",
                    message=f"El proveedor '{
                        instance.proveedor.razon_social}' ha enviado la cotización {
                        instance.numero} para la solicitud {
                        instance.solicitud.numero}.",
                    action_url=f"/cotizaciones/{
                        instance.id}",
                )

        # 2. Al ser seleccionada como ganadora
        elif nuevo_estado == CotizacionMaterial.EstadoChoices.SELECCIONADA:
            proveedor_user = instance.proveedor.user
            if proveedor_user and proveedor_user.is_active:
                Notification.objects.create(
                    user=proveedor_user,
                    tipo=Notification.TipoChoices.SUCCESS,
                    title="¡Cotización Ganadora!",
                    message=f"Tu cotización {
                        instance.numero} para la solicitud {
                        instance.solicitud.numero} ha sido seleccionada.",
                    action_url="/portal/cotizaciones",
                )

    except Exception as e:
        logger.error(f"Error al enviar notificaciones de CotizacionMaterial: {
                str(e)}")


@receiver(post_save, sender=OrdenCompra)
def notificar_cambios_orden(sender, instance, created, **kwargs):
    try:
        old_estado = getattr(instance, "_old_estado", None)
        nuevo_estado = instance.estado

        if not created and old_estado == nuevo_estado:
            return

        # 1. Al pasar a 'enviada': Notificar al proveedor
        if nuevo_estado == OrdenCompra.EstadoChoices.ENVIADA:
            proveedor_user = instance.proveedor.user
            if proveedor_user and proveedor_user.is_active:
                Notification.objects.create(
                    user=proveedor_user,
                    tipo=Notification.TipoChoices.INFO,
                    title="Nueva Orden de Compra",
                    message=f"Has recibido la Orden de Compra {
                        instance.numero} de total {
                        instance.total} MXN. Por favor confírmala en tu portal.",
                    action_url="/portal/ordenes",
                )

        # 2. Al ser confirmada por el proveedor: Notificar a Adquisiciones y
        # Admin
        elif nuevo_estado == OrdenCompra.EstadoChoices.CONFIRMADA:
            adqs_and_admins = User.objects.filter(
                role__name__in=[Role.RoleType.ADQUISICIONES, Role.RoleType.ADMIN],
                is_active=True,
            )
            for user in adqs_and_admins:
                Notification.objects.create(
                    user=user,
                    tipo=Notification.TipoChoices.SUCCESS,
                    title="Orden de Compra Confirmada",
                    message=f"El proveedor '{
                        instance.proveedor.razon_social}' ha confirmado la Orden de Compra {
                        instance.numero}.",
                    action_url=f"/ordenes/{
                        instance.id}",
                )

    except Exception as e:
        logger.error(f"Error al enviar notificaciones de OrdenCompra: {
                str(e)}")


@receiver(post_save, sender=Factura)
def notificar_cambios_factura(sender, instance, created, **kwargs):
    try:
        old_status = getattr(instance, "_old_status", None)
        nuevo_status = instance.status

        if not created and old_status == nuevo_status:
            return

        # 1. Al procesarse exitosamente: Notificar a Tesorería y Admin
        if nuevo_status == Factura.EstadoChoices.PROCESADA:
            tesos_and_admins = User.objects.filter(
                role__name__in=[Role.RoleType.TESORERIA, Role.RoleType.ADMIN],
                is_active=True,
            )
            proveedor_nombre = (
                instance.proveedor.razon_social
                if instance.proveedor
                else instance.nombre_emisor
            )
            for user in tesos_and_admins:
                Notification.objects.create(
                    user=user,
                    tipo=Notification.TipoChoices.SUCCESS,
                    title="Factura procesada",
                    message=f"La factura {
                        instance.folio or 'S/F'} del proveedor '{proveedor_nombre}' por ${
                        instance.total} MXN fue procesada exitosamente.",
                    action_url=f"/facturas/{
                        instance.id}",
                )

        # 2. Error en procesamiento: Notificar a quien la subió
        elif nuevo_status == Factura.EstadoChoices.ERROR:
            Notification.objects.create(
                user=instance.uploaded_by,
                tipo=Notification.TipoChoices.ERROR,
                title="Error al procesar factura",
                message=f"Hubo un error al procesar la factura {
                    instance.folio or 'S/F'}. Detalles: {
                    instance.error_message}.",
                action_url=(
                    "/facturas"
                    if not instance.uploaded_by.is_proveedor
                    else "/portal/facturas"
                ),
            )

    except Exception as e:
        logger.error(f"Error al enviar notificaciones de Factura: {str(e)}")


@receiver(post_save, sender=User)
def notificar_verificacion_ine(sender, instance, created, **kwargs):
    try:
        if created:
            return

        old_verificada = getattr(instance, "_old_ine_verificada", False)
        old_rechazada = getattr(instance, "_old_ine_rechazada", False)

        # Si ahora está verificada y antes no lo estaba
        if instance.ine_verificada and not old_verificada:
            Notification.objects.create(
                user=instance,
                tipo=Notification.TipoChoices.SUCCESS,
                title="Identificación INE Verificada",
                message="Tu documento INE ha sido verificado exitosamente por el administrador.",
                action_url="/perfil",
            )

        # Si ahora está rechazada y antes no lo estaba
        elif instance.ine_rechazada and not old_rechazada:
            Notification.objects.create(
                user=instance,
                tipo=Notification.TipoChoices.ERROR,
                title="Identificación INE Rechazada",
                message=f"Tu documento INE fue rechazado. Motivo: {
                    instance.ine_rechazo_motivo or 'No especificado'}. Sube un documento válido.",
                action_url="/perfil",
            )

    except Exception as e:
        logger.error(f"Error al enviar notificaciones de Verificación de INE: {
                str(e)}")


def model_to_dict_json(instance):
    from django.db.models.fields.files import FieldFile

    try:
        d = model_to_dict(instance)
    except Exception:
        return {}

    serializable = {}
    for k, v in d.items():
        if isinstance(v, Decimal):
            serializable[k] = float(v)
        elif isinstance(v, (datetime.datetime, datetime.date, datetime.time)):
            serializable[k] = v.isoformat()
        elif isinstance(v, uuid.UUID):
            serializable[k] = str(v)
        elif isinstance(v, FieldFile):
            serializable[k] = v.url if v else None
        else:
            try:
                import json

                json.dumps(v)
                serializable[k] = v
            except TypeError:
                serializable[k] = str(v)
    return serializable


@receiver(pre_save)
def capture_old_data_on_pre_save(sender, instance, **kwargs):
    if sender._meta.model_name in ["activitylog", "notification"]:
        return
    if not sender.__module__.startswith("apps."):
        return

    request = get_current_request()
    if not request:
        return

    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            instance._old_data_dict = model_to_dict_json(old_instance)
        except Exception:
            instance._old_data_dict = {}
    else:
        instance._old_data_dict = {}


@receiver(post_save)
def log_activity_on_save(sender, instance, created, **kwargs):
    if sender._meta.model_name in ["activitylog", "notification"]:
        return
    if not sender.__module__.startswith("apps."):
        return

    request = get_current_request()
    if not request:
        return

    from apps.notifications.models import ActivityLog

    user = request.user if (request.user and request.user.is_authenticated) else None

    if created:
        accion = ActivityLog.AccionChoices.CREAR
        datos_anteriores = {}
        datos_nuevos = model_to_dict_json(instance)
    else:
        accion = ActivityLog.AccionChoices.ACTUALIZAR
        datos_anteriores = getattr(instance, "_old_data_dict", {})
        datos_nuevos = model_to_dict_json(instance)

    ip_address = request.META.get("REMOTE_ADDR")
    user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]
    descripcion = f"{accion.capitalize()} {sender._meta.verbose_name or sender.__name__} #{instance.pk}"

    ActivityLog.objects.create(
        user=user,
        accion=accion,
        modelo=sender.__name__,
        objeto_id=instance.pk,
        descripcion=descripcion,
        datos_anteriores=datos_anteriores,
        datos_nuevos=datos_nuevos,
        ip_address=ip_address,
        user_agent=user_agent,
    )


@receiver(post_delete)
def log_activity_on_delete(sender, instance, **kwargs):
    if sender._meta.model_name in ["activitylog", "notification"]:
        return
    if not sender.__module__.startswith("apps."):
        return

    request = get_current_request()
    if not request:
        return

    from apps.notifications.models import ActivityLog

    user = request.user if (request.user and request.user.is_authenticated) else None
    accion = ActivityLog.AccionChoices.ELIMINAR
    datos_anteriores = model_to_dict_json(instance)
    datos_nuevos = {}

    ip_address = request.META.get("REMOTE_ADDR")
    user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]
    descripcion = (
        f"Eliminar {sender._meta.verbose_name or sender.__name__} #{instance.pk}"
    )

    ActivityLog.objects.create(
        user=user,
        accion=accion,
        modelo=sender.__name__,
        objeto_id=instance.pk,
        descripcion=descripcion,
        datos_anteriores=datos_anteriores,
        datos_nuevos=datos_nuevos,
        ip_address=ip_address,
        user_agent=user_agent,
    )
