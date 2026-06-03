from django.contrib import admin
from .models import CotizacionMaterial, CotizacionDetalle


class CotizacionDetalleInline(admin.TabularInline):
    model = CotizacionDetalle
    extra = 1


@admin.register(CotizacionMaterial)
class CotizacionMaterialAdmin(admin.ModelAdmin):
    list_display = ['numero', 'solicitud', 'proveedor', 'total', 'estado', 'fecha']
    list_filter = ['estado', 'proveedor', 'fecha']
    search_fields = ['numero', 'solicitud__numero', 'proveedor__razon_social']
    readonly_fields = ['numero', 'created_at', 'updated_at']
    inlines = [CotizacionDetalleInline]
