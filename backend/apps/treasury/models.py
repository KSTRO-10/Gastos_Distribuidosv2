from django.db import models
from django.conf import settings
from apps.invoices.models import Factura
from apps.areas.models import Area


class SolicitudGasto(models.Model):
    ESTADO_CHOICES = [
        ('BORRADOR', 'Borrador'),
        ('ENVIADA', 'Enviada'),
        ('AUTORIZADA', 'Autorizada'),
        ('RECHAZADA', 'Rechazada'),
    ]
    numero = models.CharField(max_length=20, unique=True, editable=False)
    factura = models.ForeignKey(Factura, on_delete=models.PROTECT,
                related_name='solicitudes_gasto')
    fondo_programa = models.CharField(max_length=200)
    tipo_material = models.CharField(max_length=200)
    fecha_solicitud = models.DateField(auto_now_add=True)
    solicitante = models.ForeignKey(settings.AUTH_USER_MODEL,
                on_delete=models.PROTECT, related_name='solicitudes_gasto')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES,
                default='BORRADOR')
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.numero:
            from django.utils import timezone
            year = timezone.now().year
            last = SolicitudGasto.objects.filter(
                numero__startswith=f'SOG-{year}').count()
            self.numero = f'SOG-{year}-{str(last+1).zfill(5)}'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.numero


class ItemSolicitudGasto(models.Model):
    solicitud_gasto = models.ForeignKey(SolicitudGasto,
                on_delete=models.CASCADE, related_name='items')
    area = models.ForeignKey(Area, on_delete=models.PROTECT)
    clave_presupuestaria = models.CharField(max_length=200)
    concepto_bien = models.CharField(max_length=200)
    descripcion_adquirido = models.CharField(max_length=200)
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)
    costo_total = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        ordering = ['area__name', 'concepto_bien']

    def __str__(self):
        return f'{self.solicitud_gasto.numero} - {self.area.name} - {self.concepto_bien}'


class SolicitudPago(models.Model):
    ESTADO_CHOICES = [
        ('BORRADOR', 'Borrador'),
        ('ENVIADA', 'Enviada'),
        ('PAGADA', 'Pagada'),
        ('RECHAZADA', 'Rechazada'),
    ]
    numero = models.CharField(max_length=20, unique=True, editable=False)
    solicitud_gasto = models.OneToOneField(SolicitudGasto,
                on_delete=models.PROTECT, related_name='solicitud_pago')
    banco = models.CharField(max_length=100)
    numero_cuenta = models.CharField(max_length=50)
    cog_clave = models.CharField(max_length=20)
    cog_nombre = models.CharField(max_length=200)
    fecha_solicitud = models.DateField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES,
                default='BORRADOR')
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.numero:
            from django.utils import timezone
            year = timezone.now().year
            last = SolicitudPago.objects.filter(
                numero__startswith=f'SOP-{year}').count()
            self.numero = f'SOP-{year}-{str(last+1).zfill(5)}'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.numero


class ItemSolicitudPago(models.Model):
    solicitud_pago = models.ForeignKey(SolicitudPago,
                on_delete=models.CASCADE, related_name='items')
    area = models.ForeignKey(Area, on_delete=models.PROTECT)
    clave_presupuestaria = models.CharField(max_length=200)
    importe = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        ordering = ['area__name']

    def __str__(self):
        return f'{self.solicitud_pago.numero} - {self.area.name}'
