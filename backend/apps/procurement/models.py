from typing import Any
"""
Procurement models - Material requests and COG catalog.
"""

from django.db import models
from django.conf import settings


class Cog(models.Model):
    """
    COG (Clasificador por Objeto del Gasto) catalog.
    Mexican government expenditure classification.
    """
    objects: Any
    DoesNotExist: Any
    
    codigo = models.CharField(max_length=20, unique=True, verbose_name='Código')
    descripcion = models.CharField(max_length=500, verbose_name='Descripción')
    capitulo = models.CharField(max_length=10, blank=True, verbose_name='Capítulo')
    concepto = models.CharField(max_length=10, blank=True, verbose_name='Concepto')
    partida_generica = models.CharField(max_length=10, blank=True, verbose_name='Partida Genérica')
    partida_especifica = models.CharField(max_length=10, blank=True, verbose_name='Partida Específica')
    palabras_clave = models.TextField(
        blank=True,
        verbose_name='Palabras Clave',
        help_text='Términos de búsqueda separados por coma para facilitar la localización del COG'
    )
    is_active = models.BooleanField(default=True, verbose_name='Activo')

    class Meta:
        verbose_name = 'COG'
        verbose_name_plural = 'COG (Clasificador)'
        ordering = ['codigo']

    def __str__(self):
        return f"{self.codigo} - {self.descripcion}"


class SolicitudMaterial(models.Model):
    """
    Material request created by an area.
    """
    objects: Any
    DoesNotExist: Any
    
    class EstadoChoices(models.TextChoices):
        PENDIENTE_VERIFICACION = 'pendiente_verificacion', 'Pendiente de Verificación INE'
        INE_RECHAZADA = 'ine_rechazada', 'INE Rechazada'
        BORRADOR = 'borrador', 'Borrador'
        ENVIADO = 'enviado', 'Enviado'
        EN_COTIZACION = 'en_cotizacion', 'En Cotización'
        COTIZADO = 'cotizado', 'Cotizado'
        EN_AUTORIZACION = 'en_autorizacion', 'En Autorización'
        AUTORIZADO = 'autorizado', 'Autorizado'
        EN_ORDEN = 'en_orden', 'En Orden de Compra'
        PARCIAL = 'parcial', 'Parcialmente Entregado'
        ENTREGADO = 'entregado', 'Entregado'
        CANCELADO = 'cancelado', 'Cancelado'
    
    # Relations
    area = models.ForeignKey(
        'areas.Area',
        on_delete=models.PROTECT,
        related_name='solicitudes_material',
        verbose_name='Área solicitante'
    )
    
    # Basic info
    numero = models.CharField(max_length=50, unique=True, verbose_name='Número de solicitud')
    fecha_solicitud = models.DateField(verbose_name='Fecha de solicitud')
    descripcion = models.TextField(blank=True, verbose_name='Descripción general')
    justificacion = models.TextField(blank=True, verbose_name='Justificación')
    eje_rector = models.TextField(
        blank=True,
        verbose_name='Eje Rector',
        help_text='Ej: Bienestar Social, Ambiente Sano, etc.'
    )
    programa_presupuestario = models.TextField(
        blank=True,
        verbose_name='Programa Presupuestario',
        help_text='Ej: Apoyar y subsidiar con recursos económicos a grupos vulnerables'
    )
    actividad = models.TextField(
        blank=True,
        verbose_name='Actividad o Acción',
        help_text='Ej: Apoyar económicamente o en especie a solicitudes procedentes'
    )
    
    # Status
    estado = models.CharField(
        max_length=30,
        choices=EstadoChoices.choices,
        default=EstadoChoices.BORRADOR,
        verbose_name='Estado'
    )
    
    # Totals
    total_estimado = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name='Total estimado'
    )
    
    # Priority
    urgente = models.BooleanField(default=False, verbose_name='Urgente')
    fecha_requerida = models.DateField(null=True, blank=True, verbose_name='Fecha requerida')
    
    # INE Verification
    ine_documento = models.FileField(
        upload_to="ine_solicitudes/",
        blank=True,
        null=True,
        verbose_name="Documento INE",
    )
    ine_rechazo_motivo = models.TextField(
        blank=True, default="", verbose_name="Motivo de rechazo de INE"
    )
    
    # Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='solicitudes_creadas',
        verbose_name='Creado por'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')

    class Meta:
        verbose_name = 'Solicitud de Material'
        verbose_name_plural = 'Solicitudes de Material'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.numero} - {self.area.name}"

    def save(self, *args, **kwargs):
        if not self.numero:
            # Generate unique number with transaction safety
            from django.utils import timezone
            from django.db import transaction
            
            year = timezone.now().year
            
            # Use transaction to prevent race conditions
            with transaction.atomic():
                # Get the last solicitud number for this year
                last_solicitud = SolicitudMaterial.objects.filter(
                    numero__startswith=f"SOL-{year}-"
                ).select_for_update().order_by('-numero').first()
                
                if last_solicitud:
                    # Extract the counter from the last numero
                    try:
                        last_number = int(last_solicitud.numero.split('-')[-1])
                        count = last_number + 1
                    except (ValueError, IndexError):
                        count = 1
                else:
                    count = 1
                
                self.numero = f"SOL-{year}-{count:05d}"
        
        super().save(*args, **kwargs)
    
    def update_total(self):
        """Recalculate total from details."""
        total = self.detalles.aggregate(
            total=models.Sum(
                models.F('cantidad') * models.F('precio_estimado'),
                output_field=models.DecimalField()
            )
        )['total'] or 0
        self.total_estimado = total
        self.save(update_fields=['total_estimado'])


class DetalleMaterial(models.Model):
    """
    Material request line item.
    """
    objects: Any
    DoesNotExist: Any
    
    solicitud = models.ForeignKey(
        SolicitudMaterial,
        on_delete=models.CASCADE,
        related_name='detalles',
        verbose_name='Solicitud'
    )
    
    # Item details
    concepto = models.CharField(max_length=500, verbose_name='Concepto')
    descripcion = models.TextField(blank=True, verbose_name='Descripción detallada')
    cantidad = models.DecimalField(max_digits=15, decimal_places=4, verbose_name='Cantidad')
    unidad = models.CharField(max_length=50, verbose_name='Unidad de medida')
    
    # COG classification
    cog = models.ForeignKey(
        Cog,
        on_delete=models.PROTECT,
        related_name='detalles_material',
        verbose_name='COG'
    )
    
    # Pricing (estimated)
    precio_estimado = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0,
        verbose_name='Precio estimado unitario'
    )
    
    # Notes
    notas = models.TextField(blank=True, verbose_name='Notas')
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')

    class Meta:
        verbose_name = 'Detalle de Material'
        verbose_name_plural = 'Detalles de Material'
        ordering = ['id']

    def __str__(self):
        return f"{self.concepto} ({self.cantidad} {self.unidad})"

    @property
    def subtotal_estimado(self):
        return self.cantidad * self.precio_estimado
