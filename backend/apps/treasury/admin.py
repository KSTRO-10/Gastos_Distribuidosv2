from django.contrib import admin
from .models import SolicitudGasto, ItemSolicitudGasto, SolicitudPago, ItemSolicitudPago


@admin.register(SolicitudGasto)
class SolicitudGastoAdmin(admin.ModelAdmin):
    list_display = ['numero', 'factura', 'fondo_programa', 'estado', 'fecha_solicitud']
    list_filter = ['estado', 'fecha_solicitud']
    search_fields = ['numero', 'fondo_programa', 'tipo_material']
    readonly_fields = ['numero', 'created_at']


@admin.register(ItemSolicitudGasto)
class ItemSolicitudGastoAdmin(admin.ModelAdmin):
    list_display = ['solicitud_gasto', 'area', 'concepto_bien', 'cantidad', 'precio_unitario', 'costo_total']
    list_filter = ['area']
    search_fields = ['solicitud_gasto__numero', 'concepto_bien', 'descripcion_adquirido']


@admin.register(SolicitudPago)
class SolicitudPagoAdmin(admin.ModelAdmin):
    list_display = ['numero', 'solicitud_gasto', 'banco', 'cog_clave', 'estado', 'fecha_solicitud']
    list_filter = ['estado', 'fecha_solicitud', 'banco']
    search_fields = ['numero', 'cog_clave', 'cog_nombre']
    readonly_fields = ['numero', 'created_at']


@admin.register(ItemSolicitudPago)
class ItemSolicitudPagoAdmin(admin.ModelAdmin):
    list_display = ['solicitud_pago', 'area', 'clave_presupuestaria', 'importe']
    list_filter = ['area']
    search_fields = ['solicitud_pago__numero', 'clave_presupuestaria']
