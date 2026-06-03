"""Document models - PDF generation and storage."""

from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class PDFDocument(models.Model):
    """Generated PDF document."""
    
    class TipoChoices(models.TextChoices):
        SOLICITUD = 'solicitud', 'Solicitud de Material'
        COTIZACION = 'cotizacion', 'Cotización'
        AUTORIZACION = 'autorizacion', 'Autorización Presupuestal'
        ORDEN_COMPRA = 'orden_compra', 'Orden de Compra'
        ENTREGA = 'entrega', 'Entrega de Bienes'
        SALIDA = 'salida', 'Salida de Bienes'
        REPORTE = 'reporte', 'Reporte'
    
    # Generic relation to any model
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Document info
    tipo = models.CharField(
        max_length=20,
        choices=TipoChoices.choices,
        verbose_name='Tipo'
    )
    nombre = models.CharField(max_length=255, verbose_name='Nombre')
    descripcion = models.TextField(blank=True, verbose_name='Descripción')
    
    # File
    pdf_file = models.FileField(upload_to='documents/pdf/', verbose_name='Archivo PDF')
    
    # Generation info
    generated_by_task = models.CharField(max_length=100, blank=True, verbose_name='Task ID')
    template_used = models.CharField(max_length=100, blank=True, verbose_name='Plantilla')
    
    # Audit
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='documents_generated',
        verbose_name='Generado por'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de generación')

    class Meta:
        verbose_name = 'Documento PDF'
        verbose_name_plural = 'Documentos PDF'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_display()})"


class Media(models.Model):
    """Generic media file storage."""
    
    file = models.FileField(upload_to='media/files/', verbose_name='Archivo')
    original_name = models.CharField(max_length=255, verbose_name='Nombre original')
    content_type = models.CharField(max_length=100, blank=True, verbose_name='Tipo de contenido')
    size = models.PositiveIntegerField(default=0, verbose_name='Tamaño (bytes)')
    
    # Owner
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='media_files',
        verbose_name='Propietario'
    )
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True, verbose_name='Metadatos')
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Archivo Media'
        verbose_name_plural = 'Archivos Media'

    def __str__(self):
        return self.original_name
