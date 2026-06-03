"""
Tenant models for multi-tenancy.
"""

from django.db import models
from django.conf import settings as django_settings

# Conditional import for django-tenants support
USE_TENANTS = hasattr(django_settings, 'TENANT_MODEL') and bool(django_settings.TENANT_MODEL)
if USE_TENANTS:
    try:
        from django_tenants.models import TenantMixin, DomainMixin
    except ImportError:
        USE_TENANTS = False

if USE_TENANTS:
    class Tenant(TenantMixin):
        """
        Tenant model representing each organization/company in the system.
        Each tenant has its own PostgreSQL schema.
        """
        name = models.CharField(max_length=255, verbose_name='Nombre')
        rfc = models.CharField(max_length=13, blank=True, verbose_name='RFC')
        created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
        updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')
        is_active = models.BooleanField(default=True, verbose_name='Activo')
        
        # Settings stored as JSON
        settings = models.JSONField(default=dict, blank=True, verbose_name='Configuración')
        
        # Tenant identification
        auto_create_schema = True
        auto_drop_schema = True

        class Meta:
            verbose_name = 'Tenant'
            verbose_name_plural = 'Tenants'
            ordering = ['name']

        def __str__(self):
            return self.name


    class Domain(DomainMixin):
        """
        Domain model for tenant URL routing.
        """
        
        class Meta:
            verbose_name = 'Dominio'
            verbose_name_plural = 'Dominios'

        def __str__(self):
            return self.domain

else:
    # Simplified models for SQLite/local development
    class Tenant(models.Model):
        """
        Simplified Tenant model for local development (no multi-tenancy).
        """
        schema_name = models.CharField(max_length=63, unique=True, default='public')
        name = models.CharField(max_length=255, verbose_name='Nombre')
        rfc = models.CharField(max_length=13, blank=True, verbose_name='RFC')
        created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
        updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')
        is_active = models.BooleanField(default=True, verbose_name='Activo')
        settings = models.JSONField(default=dict, blank=True, verbose_name='Configuración')

        class Meta:
            verbose_name = 'Tenant'
            verbose_name_plural = 'Tenants'
            ordering = ['name']

        def __str__(self):
            return self.name


    class Domain(models.Model):
        """
        Simplified Domain model for local development.
        """
        domain = models.CharField(max_length=253, unique=True)
        tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='domains')
        is_primary = models.BooleanField(default=True)
        
        class Meta:
            verbose_name = 'Dominio'
            verbose_name_plural = 'Dominios'

        def __str__(self):
            return self.domain


class SolicitudGubernamental(models.Model):
    """
    Government registration request to become a tenant.
    Admin must approve before creating the tenant.
    """
    
    class EstadoChoices(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente'
        APROBADA = 'aprobada', 'Aprobada'
        RECHAZADA = 'rechazada', 'Rechazada'
    
    # Applicant data
    nombre_solicitante = models.CharField(max_length=255, verbose_name='Nombre del solicitante')
    email_solicitante = models.EmailField(verbose_name='Email del solicitante')
    telefono = models.CharField(max_length=20, blank=True, verbose_name='Teléfono')
    
    # Organization data
    nombre_organizacion = models.CharField(max_length=255, verbose_name='Nombre de la organización')
    rfc = models.CharField(max_length=13, verbose_name='RFC')
    direccion = models.TextField(blank=True, verbose_name='Dirección')
    
    # Request state
    estado = models.CharField(
        max_length=20,
        choices=EstadoChoices.choices,
        default=EstadoChoices.PENDIENTE,
        verbose_name='Estado'
    )
    
    # Attachments
    attachments = models.JSONField(default=list, blank=True, verbose_name='Archivos adjuntos')
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de solicitud')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')
    reviewed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_requests',
        verbose_name='Revisado por'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de revisión')
    rejection_reason = models.TextField(blank=True, verbose_name='Motivo de rechazo')
    
    # Link to created tenant
    tenant = models.OneToOneField(
        Tenant,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registration_request',
        verbose_name='Tenant creado'
    )

    class Meta:
        verbose_name = 'Solicitud Gubernamental'
        verbose_name_plural = 'Solicitudes Gubernamentales'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.nombre_organizacion} - {self.estado}"
