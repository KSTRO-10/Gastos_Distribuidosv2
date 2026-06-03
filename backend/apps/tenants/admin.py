from django.contrib import admin
from .models import Tenant, Domain, SolicitudGubernamental


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['schema_name', 'name', 'rfc', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'rfc']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ['domain', 'tenant', 'is_primary']
    list_filter = ['is_primary']
    search_fields = ['domain', 'tenant__name']


@admin.register(SolicitudGubernamental)
class SolicitudGubernamentalAdmin(admin.ModelAdmin):
    list_display = ['nombre_organizacion', 'rfc', 'email_solicitante', 'estado', 'created_at']
    list_filter = ['estado', 'created_at']
    search_fields = ['nombre_organizacion', 'rfc', 'nombre_solicitante', 'email_solicitante']
    readonly_fields = ['created_at', 'updated_at', 'reviewed_at']
    
    fieldsets = (
        ('Datos del Solicitante', {
            'fields': ('nombre_solicitante', 'email_solicitante', 'telefono')
        }),
        ('Datos de la Organización', {
            'fields': ('nombre_organizacion', 'rfc', 'direccion')
        }),
        ('Estado', {
            'fields': ('estado', 'rejection_reason', 'tenant')
        }),
        ('Auditoría', {
            'fields': ('created_at', 'updated_at', 'reviewed_by', 'reviewed_at'),
            'classes': ('collapse',)
        }),
    )
