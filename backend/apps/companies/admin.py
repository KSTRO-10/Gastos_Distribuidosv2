from django.contrib import admin
from .models import Company, Proveedor, ProductoProveedor, FirmanteDocumento


class FirmanteDocumentoInline(admin.TabularInline):
    model = FirmanteDocumento
    extra = 1
    fields = ['tipo_documento', 'cargo', 'nombre', 'user', 'sello_imagen', 'orden']
    ordering = ['tipo_documento', 'orden']


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['razon_social', 'rfc', 'email', 'is_active', 'created_at']
    list_filter = ['is_active', 'estado', 'created_at']
    search_fields = ['razon_social', 'rfc', 'nombre_comercial', 'email']
    readonly_fields = ['created_at', 'updated_at', 'created_by']
    
    fieldsets = (
        ('Información General', {
            'fields': ('rfc', 'razon_social', 'nombre_comercial')
        }),
        ('Branding', {
            'fields': ('logo', 'membrete', 'pie_pagina')
        }),
        ('Dirección', {
            'fields': ('calle', 'numero_exterior', 'numero_interior', 'colonia', 
                      'municipio', 'estado', 'codigo_postal')
        }),
        ('Contacto', {
            'fields': ('telefono', 'email')
        }),
        ('Estado', {
            'fields': ('is_active',)
        }),
        ('Auditoría', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    inlines = [FirmanteDocumentoInline]


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ['razon_social', 'rfc', 'contacto_email', 'estado', 'created_at']
    list_filter = ['estado', 'created_at']
    search_fields = ['razon_social', 'rfc', 'contacto_nombre', 'contacto_email']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ProductoProveedor)
class ProductoProveedorAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'proveedor', 'cog', 'unidad', 'precio_unitario', 'is_active', 'updated_at']
    list_filter = ['is_active', 'proveedor', 'cog']
    search_fields = ['nombre', 'descripcion', 'marca', 'proveedor__razon_social', 'cog__codigo']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['proveedor', 'cog']
