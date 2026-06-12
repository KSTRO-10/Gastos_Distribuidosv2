from typing import Any
"""Inventory models - Deliveries and warehouse movements."""

from django.db import models
from django.conf import settings


class Articulo(models.Model):
    """Catálogo maestro de artículos para inventario."""

    objects: Any
    DoesNotExist: Any

    codigo = models.CharField(max_length=50, unique=True, verbose_name="Código SKU")
    nombre = models.CharField(max_length=255, verbose_name="Nombre del artículo")
    descripcion = models.TextField(blank=True, verbose_name="Descripción")
    unidad_medida = models.CharField(max_length=50, verbose_name="Unidad de medida")
    cog = models.ForeignKey(
        "procurement.Cog",
        on_delete=models.PROTECT,
        related_name="articulos",
        verbose_name="Partida COG",
    )
    costo_promedio = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, verbose_name="Costo promedio"
    )

    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Artículo"
        verbose_name_plural = "Artículos"
        ordering = ["nombre"]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class Stock(models.Model):
    """Existencias actuales de un artículo en un almacén."""

    objects: Any
    DoesNotExist: Any

    almacen = models.ForeignKey(
        "areas.Area",
        on_delete=models.PROTECT,
        related_name="stocks",
        verbose_name="Almacén",
    )
    articulo = models.ForeignKey(
        Articulo,
        on_delete=models.PROTECT,
        related_name="stocks",
        verbose_name="Artículo",
    )
    cantidad = models.DecimalField(
        max_digits=15, decimal_places=4, default=0, verbose_name="Existencia actual"
    )
    cantidad_reservada = models.DecimalField(
        max_digits=15, decimal_places=4, default=0, verbose_name="Cantidad reservada"
    )

    class EstadoArticuloChoices(models.TextChoices):
        DISPONIBLE = "disponible", "Disponible"
        DANADO = "danado", "Dañado"
        EN_GARANTIA = "en_garantia", "En Garantía"
        BAJA_DEFINITIVA = "baja", "Baja Definitiva"

    estado_articulo = models.CharField(
        max_length=20,
        choices=EstadoArticuloChoices.choices,
        default=EstadoArticuloChoices.DISPONIBLE,
        verbose_name="Estado del artículo",
    )
    lote_referencia = models.CharField(
        max_length=100, blank=True, verbose_name="Lote Referencia"
    )
    fecha_caducidad_referencia = models.DateField(
        null=True, blank=True, verbose_name="Caducidad Referencia"
    )
    numero_serie_referencia = models.CharField(
        max_length=100, blank=True, verbose_name="No. Serie Referencia"
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Stock"
        verbose_name_plural = "Stocks"
        unique_together = ["almacen", "articulo"]

    def __str__(self):
        return f"{self.articulo.nombre} en {self.almacen.name}: {self.cantidad}"


class Auditoria(models.Model):
    """Auditoría de inventario físico vs sistema."""

    objects: Any
    DoesNotExist: Any

    class EstadoChoices(models.TextChoices):
        BORRADOR = "borrador", "En Proceso"
        PENDIENTE = "pendiente", "Pendiente de Autorización"
        CERRADA = "cerrada", "Cerrada"
        RECHAZADA = "rechazada", "Rechazada"

    numero = models.CharField(max_length=50, unique=True, verbose_name="Folio")
    almacen = models.ForeignKey(
        "areas.Area",
        on_delete=models.PROTECT,
        related_name="auditorias",
        verbose_name="Almacén",
    )
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(
        max_length=20, choices=EstadoChoices.choices, default=EstadoChoices.BORRADOR
    )

    # Responsables
    creada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="auditorias_creadas",
    )
    autorizada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="auditorias_autorizadas",
    )
    notas = models.TextField(blank=True)

    class Meta:
        verbose_name = "Auditoría"
        verbose_name_plural = "Auditorías"
        ordering = ["-fecha_inicio"]

    def __str__(self):
        return self.numero

    def save(self, *args, **kwargs):
        if not self.numero:
            from django.utils import timezone

            year = timezone.now().year
            count = Auditoria.objects.filter(fecha_inicio__year=year).count() + 1
            self.numero = f"AUD-{year}-{count:05d}"
        super().save(*args, **kwargs)


class AuditoriaDetalle(models.Model):

    objects: Any
    DoesNotExist: Any

    auditoria = models.ForeignKey(
        Auditoria, on_delete=models.CASCADE, related_name="detalles"
    )
    articulo = models.ForeignKey(Articulo, on_delete=models.PROTECT)

    existencia_sistema = models.DecimalField(max_digits=15, decimal_places=4)
    existencia_fisica = models.DecimalField(max_digits=15, decimal_places=4)
    diferencia = models.DecimalField(
        max_digits=15, decimal_places=4, help_text="fisica - sistema"
    )

    justificacion = models.TextField(blank=True)

    class Meta:
        verbose_name = "Detalle de Auditoría"
        verbose_name_plural = "Detalles de Auditoría"

    def save(self, *args, **kwargs):
        self.diferencia = self.existencia_fisica - self.existencia_sistema
        super().save(*args, **kwargs)


class EntregaBienes(models.Model):
    """Goods receipt from supplier."""

    objects: Any
    DoesNotExist: Any

    orden = models.ForeignKey(
        "orders.OrdenCompra",
        on_delete=models.PROTECT,
        related_name="entregas",
        verbose_name="Orden de Compra",
    )
    factura = models.ForeignKey(
        "invoices.Factura",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="entregas",
        verbose_name="Factura",
    )

    numero = models.CharField(
        max_length=50, unique=True, verbose_name="Número de recepción"
    )
    fecha_recepcion = models.DateTimeField(verbose_name="Fecha de recepción")
    notas = models.TextField(blank=True, verbose_name="Notas")

    # Receiver
    recibido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="entregas_recibidas",
        verbose_name="Recibido por",
    )

    # Status
    completa = models.BooleanField(default=False, verbose_name="Entrega completa")

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Entrega de Bienes"
        verbose_name_plural = "Entregas de Bienes"
        ordering = ["-fecha_recepcion"]

    def __str__(self):
        return f"{self.numero} - {self.orden.numero}"

    def save(self, *args, **kwargs):
        if not self.numero:
            from django.utils import timezone

            year = timezone.now().year
            count = EntregaBienes.objects.filter(created_at__year=year).count() + 1
            self.numero = f"REC-{year}-{count:05d}"
        super().save(*args, **kwargs)


class EntregaDetalle(models.Model):
    """Line item in a delivery."""

    objects: Any
    DoesNotExist: Any

    entrega = models.ForeignKey(
        EntregaBienes,
        on_delete=models.CASCADE,
        related_name="detalles",
        verbose_name="Entrega",
    )
    detalle_orden = models.ForeignKey(
        "orders.DetalleOrden",
        on_delete=models.PROTECT,
        related_name="entregas",
        verbose_name="Detalle de Orden",
    )
    articulo = models.ForeignKey(
        Articulo,
        on_delete=models.PROTECT,
        related_name="entregas",
        verbose_name="Artículo",
        null=True,
        blank=True,
    )

    cantidad_recibida = models.DecimalField(
        max_digits=15, decimal_places=4, verbose_name="Cantidad recibida"
    )
    notas = models.TextField(blank=True, verbose_name="Notas")

    # Condition
    condicion_buena = models.BooleanField(default=True, verbose_name="Buena condición")
    observaciones_condicion = models.TextField(
        blank=True, verbose_name="Observaciones de condición"
    )

    # Trazabilidad
    lote = models.CharField(max_length=100, blank=True, verbose_name="Lote")
    fecha_caducidad = models.DateField(
        null=True, blank=True, verbose_name="Fecha de Caducidad"
    )
    numero_serie = models.CharField(
        max_length=100, blank=True, verbose_name="Número de Serie"
    )

    class Meta:
        verbose_name = "Detalle de Entrega"
        verbose_name_plural = "Detalles de Entrega"

    def __str__(self):
        return f"{self.detalle_orden.concepto} - {self.cantidad_recibida}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update received quantity in order detail
        self.detalle_orden.cantidad_recibida += self.cantidad_recibida
        self.detalle_orden.save()


class EvidenciaEntrega(models.Model):
    """Photo evidence for a delivery."""

    objects: Any
    DoesNotExist: Any

    entrega = models.ForeignKey(
        EntregaBienes,
        on_delete=models.CASCADE,
        related_name="evidencias",
        verbose_name="Entrega",
    )

    imagen = models.ImageField(upload_to="evidencias/entregas/", verbose_name="Imagen")
    descripcion = models.CharField(
        max_length=255, blank=True, verbose_name="Descripción"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Evidencia de Entrega"
        verbose_name_plural = "Evidencias de Entrega"


class SalidaBienes(models.Model):
    """Goods output to areas."""

    objects: Any
    DoesNotExist: Any

    almacen = models.ForeignKey(
        "areas.Area",
        on_delete=models.PROTECT,
        related_name="salidas_almacen",
        verbose_name="Almacén origen",
    )
    destino_area = models.ForeignKey(
        "areas.Area",
        on_delete=models.PROTECT,
        related_name="salidas_recibidas",
        verbose_name="Área destino",
    )

    numero = models.CharField(
        max_length=50, unique=True, verbose_name="Número de salida"
    )
    fecha = models.DateTimeField(verbose_name="Fecha de salida")
    referencia = models.CharField(max_length=100, blank=True, verbose_name="Referencia")
    notas = models.TextField(blank=True, verbose_name="Notas")

    # Responsible
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="salidas_autorizadas",
        verbose_name="Responsable",
    )

    # Confirmation
    confirmada = models.BooleanField(
        default=False, verbose_name="Confirmada por destino"
    )
    confirmada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="salidas_confirmadas",
        verbose_name="Confirmada por",
    )
    fecha_confirmacion = models.DateTimeField(
        null=True, blank=True, verbose_name="Fecha de confirmación"
    )

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Salida de Bienes"
        verbose_name_plural = "Salidas de Bienes"
        ordering = ["-fecha"]

    def __str__(self):
        return f"{self.numero} - {self.destino_area.name}"

    def save(self, *args, **kwargs):
        if not self.numero:
            from django.utils import timezone

            year = timezone.now().year
            count = SalidaBienes.objects.filter(created_at__year=year).count() + 1
            self.numero = f"SAL-{year}-{count:05d}"
        super().save(*args, **kwargs)


class SalidaDetalle(models.Model):
    """Line item in a goods output."""

    objects: Any
    DoesNotExist: Any

    salida = models.ForeignKey(
        SalidaBienes,
        on_delete=models.CASCADE,
        related_name="detalles",
        verbose_name="Salida",
    )

    articulo = models.ForeignKey(
        Articulo,
        on_delete=models.PROTECT,
        related_name="salidas",
        verbose_name="Artículo",
        null=True,  # Temporal para migraciones
    )
    descripcion = models.TextField(blank=True, verbose_name="Descripción")
    cantidad = models.DecimalField(
        max_digits=15, decimal_places=4, verbose_name="Cantidad"
    )

    class Meta:
        verbose_name = "Detalle de Salida"
        verbose_name_plural = "Detalles de Salida"

    def __str__(self):
        return f"{self.articulo.nombre if self.articulo else 'Sin artículo'} - {self.cantidad}"


class DevolucionInterna(models.Model):
    """Devolución de bienes de un área al almacén."""

    objects: Any
    DoesNotExist: Any

    class EstadoChoices(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        COMPLETADA = "completada", "Completada"
        RECHAZADA = "rechazada", "Rechazada"

    numero = models.CharField(max_length=50, unique=True, verbose_name="Folio")
    area_origen = models.ForeignKey(
        "areas.Area",
        on_delete=models.PROTECT,
        related_name="devoluciones_enviadas",
        verbose_name="Área origen",
    )
    almacen_destino = models.ForeignKey(
        "areas.Area",
        on_delete=models.PROTECT,
        related_name="devoluciones_recibidas",
        verbose_name="Almacén destino",
    )
    salida_origen = models.ForeignKey(
        "SalidaBienes",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="devoluciones",
        verbose_name="Salida origen",
    )
    solicitante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="devoluciones_solicitadas",
        verbose_name="Solicitante",
    )
    recibido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="devoluciones_confirmadas",
        verbose_name="Recibido por",
    )

    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_recepcion = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(
        max_length=20,
        choices=EstadoChoices.choices,
        default=EstadoChoices.PENDIENTE,
        verbose_name="Estado",
    )
    notas = models.TextField(blank=True, verbose_name="Notas")

    class Meta:
        verbose_name = "Devolución Interna"
        verbose_name_plural = "Devoluciones Internas"
        ordering = ["-fecha_solicitud"]

    def __str__(self):
        return self.numero

    def save(self, *args, **kwargs):
        if not self.numero:
            from django.utils import timezone

            year = timezone.now().year
            count = (
                DevolucionInterna.objects.filter(fecha_solicitud__year=year).count() + 1
            )
            self.numero = f"DEV-{year}-{count:05d}"
        super().save(*args, **kwargs)


class DevolucionDetalle(models.Model):
    """Renglones de una devolución interna."""

    objects: Any
    DoesNotExist: Any

    devolucion = models.ForeignKey(
        DevolucionInterna, on_delete=models.CASCADE, related_name="detalles"
    )
    articulo = models.ForeignKey(Articulo, on_delete=models.PROTECT)
    cantidad = models.DecimalField(max_digits=15, decimal_places=4)

    class Meta:
        verbose_name = "Detalle de Devolución"
        verbose_name_plural = "Detalles de Devolución"


class AjusteInventario(models.Model):
    """Ajustes directos al inventario (Mermas, Caducidades, Robos)."""

    objects: Any
    DoesNotExist: Any

    class EstadoChoices(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente"
        APROBADO = "aprobado", "Aprobado"
        RECHAZADO = "rechazado", "Rechazado"

    class MotivoChoices(models.TextChoices):
        DANO = "dano", "Daño"
        ROBO = "robo", "Robo"
        CADUCIDAD = "caducidad", "Caducidad"
        ERROR_CAPTURA = "error", "Error de captura"
        PERDIDA = "perdida", "Pérdida"
        ADMINISTRATIVO = "admin", "Ajuste administrativo"
        OTRO = "otro", "Otro"

    numero = models.CharField(max_length=50, unique=True, verbose_name="Folio")
    almacen = models.ForeignKey(
        "areas.Area",
        on_delete=models.PROTECT,
        related_name="ajustes",
        verbose_name="Almacén",
    )
    solicitante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="ajustes_solicitados",
        verbose_name="Solicitante",
    )
    autorizador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ajustes_autorizados",
        verbose_name="Autorizador",
    )

    estado = models.CharField(
        max_length=20,
        choices=EstadoChoices.choices,
        default=EstadoChoices.PENDIENTE,
        verbose_name="Estado",
    )
    motivo_general = models.CharField(
        max_length=20,
        choices=MotivoChoices.choices,
        default=MotivoChoices.OTRO,
        verbose_name="Motivo",
    )

    justificacion = models.TextField(verbose_name="Justificación detallada")

    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_autorizacion = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Ajuste de Inventario"
        verbose_name_plural = "Ajustes de Inventario"
        ordering = ["-fecha_solicitud"]

    def __str__(self):
        return self.numero

    def save(self, *args, **kwargs):
        if not self.numero:
            from django.utils import timezone

            year = timezone.now().year
            count = (
                AjusteInventario.objects.filter(fecha_solicitud__year=year).count() + 1
            )
            self.numero = f"AJU-{year}-{count:05d}"
        super().save(*args, **kwargs)


class AjusteInventarioDetalle(models.Model):
    """Renglones de un ajuste de inventario."""

    objects: Any
    DoesNotExist: Any

    class TipoAjuste(models.TextChoices):
        SUMA = "suma", "Suma"
        RESTA = "resta", "Resta"

    ajuste = models.ForeignKey(
        AjusteInventario, on_delete=models.CASCADE, related_name="detalles"
    )
    articulo = models.ForeignKey(Articulo, on_delete=models.PROTECT)
    cantidad = models.DecimalField(max_digits=15, decimal_places=4)
    tipo = models.CharField(
        max_length=10, choices=TipoAjuste.choices, verbose_name="Tipo de ajuste"
    )

    class Meta:
        verbose_name = "Detalle de Ajuste"
        verbose_name_plural = "Detalles de Ajuste"


class EvidenciaAjuste(models.Model):
    """Evidencias fotográficas múltiples para un ajuste."""

    objects: Any
    DoesNotExist: Any

    ajuste = models.ForeignKey(
        AjusteInventario,
        on_delete=models.CASCADE,
        related_name="evidencias",
        verbose_name="Ajuste",
    )
    imagen = models.ImageField(upload_to="evidencias/ajustes/", verbose_name="Imagen")
    descripcion = models.CharField(
        max_length=255, blank=True, verbose_name="Descripción"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Evidencia de Ajuste"
        verbose_name_plural = "Evidencias de Ajuste"
