from django.contrib import admin
from .models import Cog, SolicitudMaterial, DetalleMaterial


@admin.register(Cog)
class CogAdmin(admin.ModelAdmin):
    list_display = ['codigo', 'descripcion', 'capitulo', 'is_active']
    list_filter = ['capitulo', 'is_active']
    search_fields = ['codigo', 'descripcion']


class DetalleMaterialInline(admin.TabularInline):
    model = DetalleMaterial
    extra = 1
    autocomplete_fields = ['cog']


@admin.register(SolicitudMaterial)
class SolicitudMaterialAdmin(admin.ModelAdmin):
    list_display = ['numero', 'area', 'estado', 'total_estimado', 'urgente', 'created_at']
    list_filter = ['estado', 'urgente', 'area__company', 'created_at']
    search_fields = ['numero', 'descripcion', 'area__name']
    autocomplete_fields = ['area', 'created_by']
    readonly_fields = ['numero', 'created_at', 'updated_at']
    inlines = [DetalleMaterialInline]


@admin.register(DetalleMaterial)
class DetalleMaterialAdmin(admin.ModelAdmin):
    list_display = ['solicitud', 'concepto', 'cantidad', 'unidad', 'cog', 'precio_estimado']
    list_filter = ['cog', 'solicitud__estado']
    search_fields = ['concepto', 'solicitud__numero']
    autocomplete_fields = ['solicitud', 'cog']
