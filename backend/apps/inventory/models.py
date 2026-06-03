"""Inventory models - Deliveries and warehouse movements."""

from django.db import models
from django.conf import settings


class EntregaBienes(models.Model):
    """Goods receipt from supplier."""
    
    orden = models.ForeignKey(
        'orders.OrdenCompra',
        on_delete=models.PROTECT,
        related_name='entregas',
        verbose_name='Orden de Compra'
    )
    factura = models.ForeignKey(
        'invoices.Factura',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='entregas',
        verbose_name='Factura'
    )
    
    numero = models.CharField(max_length=50, unique=True, verbose_name='Número de recepción')
    fecha_recepcion = models.DateTimeField(verbose_name='Fecha de recepción')
    notas = models.TextField(blank=True, verbose_name='Notas')
    
    # Receiver
    recibido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='entregas_recibidas',
        verbose_name='Recibido por'
    )
    
    # Status
    completa = models.BooleanField(default=False, verbose_name='Entrega completa')
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Entrega de Bienes'
        verbose_name_plural = 'Entregas de Bienes'
        ordering = ['-fecha_recepcion']

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
    
    entrega = models.ForeignKey(
        EntregaBienes,
        on_delete=models.CASCADE,
        related_name='detalles',
        verbose_name='Entrega'
    )
    detalle_orden = models.ForeignKey(
        'orders.DetalleOrden',
        on_delete=models.PROTECT,
        related_name='entregas',
        verbose_name='Detalle de Orden'
    )
    
    cantidad_recibida = models.DecimalField(max_digits=15, decimal_places=4, verbose_name='Cantidad recibida')
    notas = models.TextField(blank=True, verbose_name='Notas')
    
    # Condition
    condicion_buena = models.BooleanField(default=True, verbose_name='Buena condición')
    observaciones_condicion = models.TextField(blank=True, verbose_name='Observaciones de condición')

    class Meta:
        verbose_name = 'Detalle de Entrega'
        verbose_name_plural = 'Detalles de Entrega'

    def __str__(self):
        return f"{self.detalle_orden.concepto} - {self.cantidad_recibida}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update received quantity in order detail
        self.detalle_orden.cantidad_recibida += self.cantidad_recibida
        self.detalle_orden.save()


class EvidenciaEntrega(models.Model):
    """Photo evidence for a delivery."""
    
    entrega = models.ForeignKey(
        EntregaBienes,
        on_delete=models.CASCADE,
        related_name='evidencias',
        verbose_name='Entrega'
    )
    
    imagen = models.ImageField(upload_to='evidencias/entregas/', verbose_name='Imagen')
    descripcion = models.CharField(max_length=255, blank=True, verbose_name='Descripción')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Evidencia de Entrega'
        verbose_name_plural = 'Evidencias de Entrega'


class SalidaBienes(models.Model):
    """Goods output to areas."""
    
    almacen = models.ForeignKey(
        'areas.Area',
        on_delete=models.PROTECT,
        related_name='salidas_almacen',
        verbose_name='Almacén origen'
    )
    destino_area = models.ForeignKey(
        'areas.Area',
        on_delete=models.PROTECT,
        related_name='salidas_recibidas',
        verbose_name='Área destino'
    )
    
    numero = models.CharField(max_length=50, unique=True, verbose_name='Número de salida')
    fecha = models.DateTimeField(verbose_name='Fecha de salida')
    referencia = models.CharField(max_length=100, blank=True, verbose_name='Referencia')
    notas = models.TextField(blank=True, verbose_name='Notas')
    
    # Responsible
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='salidas_autorizadas',
        verbose_name='Responsable'
    )
    
    # Confirmation
    confirmada = models.BooleanField(default=False, verbose_name='Confirmada por destino')
    confirmada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='salidas_confirmadas',
        verbose_name='Confirmada por'
    )
    fecha_confirmacion = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de confirmación')
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Salida de Bienes'
        verbose_name_plural = 'Salidas de Bienes'
        ordering = ['-fecha']

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
    
    salida = models.ForeignKey(
        SalidaBienes,
        on_delete=models.CASCADE,
        related_name='detalles',
        verbose_name='Salida'
    )
    
    material = models.CharField(max_length=500, verbose_name='Material')
    descripcion = models.TextField(blank=True, verbose_name='Descripción')
    cantidad = models.DecimalField(max_digits=15, decimal_places=4, verbose_name='Cantidad')
    unidad = models.CharField(max_length=50, verbose_name='Unidad')

    class Meta:
        verbose_name = 'Detalle de Salida'
        verbose_name_plural = 'Detalles de Salida'

    def __str__(self):
        return f"{self.material} - {self.cantidad} {self.unidad}"
