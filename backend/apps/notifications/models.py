from typing import Any
"""Notification models."""

from django.db import models
from django.conf import settings


class Notification(models.Model):
    """User notification."""
    objects: Any
    DoesNotExist: Any
    
    class TipoChoices(models.TextChoices):
        INFO = 'info', 'Información'
        SUCCESS = 'success', 'Éxito'
        WARNING = 'warning', 'Advertencia'
        ERROR = 'error', 'Error'
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='Usuario'
    )
    
    tipo = models.CharField(
        max_length=20,
        choices=TipoChoices.choices,
        default=TipoChoices.INFO,
        verbose_name='Tipo'
    )
    title = models.CharField(max_length=255, verbose_name='Título')
    message = models.TextField(verbose_name='Mensaje')
    
    # Link to related object
    action_url = models.CharField(max_length=500, blank=True, verbose_name='URL de acción')
    
    # Status
    read = models.BooleanField(default=False, verbose_name='Leída')
    read_at = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de lectura')
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.user.email}"


class ActivityLog(models.Model):
    """System activity log."""
    objects: Any
    DoesNotExist: Any
    
    class AccionChoices(models.TextChoices):
        CREAR = 'crear', 'Crear'
        ACTUALIZAR = 'actualizar', 'Actualizar'
        ELIMINAR = 'eliminar', 'Eliminar'
        APROBAR = 'aprobar', 'Aprobar'
        RECHAZAR = 'rechazar', 'Rechazar'
        SUBIR = 'subir', 'Subir archivo'
        GENERAR = 'generar', 'Generar documento'
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='activity_logs',
        verbose_name='Usuario'
    )
    
    accion = models.CharField(
        max_length=20,
        choices=AccionChoices.choices,
        verbose_name='Acción'
    )
    modelo = models.CharField(max_length=100, verbose_name='Modelo')
    objeto_id = models.PositiveIntegerField(verbose_name='ID del objeto')
    descripcion = models.TextField(blank=True, verbose_name='Descripción')
    
    # Extra data
    datos_anteriores = models.JSONField(default=dict, blank=True, verbose_name='Datos anteriores')
    datos_nuevos = models.JSONField(default=dict, blank=True, verbose_name='Datos nuevos')
    
    # Request info
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP')
    user_agent = models.CharField(max_length=500, blank=True, verbose_name='User Agent')
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Log de Actividad'
        verbose_name_plural = 'Logs de Actividad'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_accion_display()} {self.modelo} #{self.objeto_id}"
