"""Quotation models."""

from decimal import Decimal
from django.db import models
from django.conf import settings


class CotizacionMaterial(models.Model):
    """Quote from a supplier for a material request."""
    
    class EstadoChoices(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente'
        RECIBIDA = 'recibida', 'Recibida'
        SELECCIONADA = 'seleccionada', 'Seleccionada'
        RECHAZADA = 'rechazada', 'Rechazada'
    
    solicitud = models.ForeignKey(
        'procurement.SolicitudMaterial',
        on_delete=models.CASCADE,
        related_name='cotizaciones',
        verbose_name='Solicitud'
    )
    proveedor = models.ForeignKey(
        'companies.Proveedor',
        on_delete=models.PROTECT,
        related_name='cotizaciones',
        verbose_name='Proveedor'
    )
    
    numero = models.CharField(max_length=50, unique=True, verbose_name='Número')
    fecha = models.DateField(verbose_name='Fecha de cotización')
    vigencia = models.DateField(null=True, blank=True, verbose_name='Vigencia')
    
    # Totals
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='Subtotal')
    iva = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='IVA')
    total = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='Total')
    
    # Conditions
    tiempo_entrega = models.CharField(max_length=100, blank=True, verbose_name='Tiempo de entrega')
    condiciones_pago = models.TextField(blank=True, verbose_name='Condiciones de pago')
    notas = models.TextField(blank=True, verbose_name='Notas')
    
    # Status
    estado = models.CharField(
        max_length=20,
        choices=EstadoChoices.choices,
        default=EstadoChoices.PENDIENTE,
        verbose_name='Estado'
    )
    
    # Attachments
    documento = models.FileField(upload_to='cotizaciones/', blank=True, null=True, verbose_name='Documento')
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Cotización'
        verbose_name_plural = 'Cotizaciones'
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.numero} - {self.proveedor.razon_social}"

    def save(self, *args, **kwargs):
        if not self.numero:
            from django.utils import timezone
            year = timezone.now().year
            count = CotizacionMaterial.objects.filter(created_at__year=year).count() + 1
            self.numero = f"COT-{year}-{count:05d}"
        super().save(*args, **kwargs)

    def update_totals(self):
        """Recalculate totals from details."""
        subtotal = self.detalles.aggregate(
            total=models.Sum('subtotal')
        )['total'] or Decimal('0')
        self.subtotal = subtotal
        self.iva = subtotal * Decimal('0.16')
        self.total = subtotal + self.iva
        self.save(update_fields=['subtotal', 'iva', 'total'])


class CotizacionDetalle(models.Model):

    
    cotizacion = models.ForeignKey(
        CotizacionMaterial,
        on_delete=models.CASCADE,
        related_name='detalles',
        verbose_name='Cotización'
    )
    detalle_material = models.ForeignKey(
        'procurement.DetalleMaterial',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cotizaciones',
        verbose_name='Detalle de solicitud'
    )
    
    
    concepto = models.CharField(max_length=500, verbose_name='Concepto')
    descripcion = models.TextField(blank=True, verbose_name='Descripción')
    cantidad = models.DecimalField(max_digits=15, decimal_places=4, verbose_name='Cantidad')
    unidad = models.CharField(max_length=50, verbose_name='Unidad')
    
    
    precio_unitario = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Precio unitario')
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Subtotal')

    class Meta:
        verbose_name = 'Detalle de Cotización'
        verbose_name_plural = 'Detalles de Cotización'

    def __str__(self):
        return f"{self.concepto} - {self.cotizacion.numero}"

    def save(self, *args, **kwargs):
        self.subtotal = self.cantidad * self.precio_unitario
        super().save(*args, **kwargs)
