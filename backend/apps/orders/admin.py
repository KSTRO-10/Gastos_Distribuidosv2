from django.contrib import admin
from .models import SolicitudAutorizacion, AutorizacionPresupuestal, OrdenCompra, DetalleOrden


@admin.register(SolicitudAutorizacion)
class SolicitudAutorizacionAdmin(admin.ModelAdmin):
    list_display = ['numero', 'solicitud', 'monto_solicitado', 'estado', 'fecha_solicitud']
    list_filter = ['estado', 'fecha_solicitud']
    search_fields = ['numero', 'solicitud__numero']
    readonly_fields = ['numero', 'created_at', 'updated_at']


@admin.register(AutorizacionPresupuestal)
class AutorizacionPresupuestalAdmin(admin.ModelAdmin):
    list_display = ['solicitud_autorizacion', 'monto_autorizado', 'aprobado_por', 'fecha_aprobacion']
    list_filter = ['fecha_aprobacion', 'aprobado_por']
    readonly_fields = ['created_at']


class DetalleOrdenInline(admin.TabularInline):
    model = DetalleOrden
    extra = 1


@admin.register(OrdenCompra)
class OrdenCompraAdmin(admin.ModelAdmin):
    list_display = ['numero', 'proveedor', 'total', 'estado', 'fecha_emision']
    list_filter = ['estado', 'proveedor', 'fecha_emision']
    search_fields = ['numero', 'proveedor__razon_social']
    readonly_fields = ['numero', 'created_at', 'updated_at']
    inlines = [DetalleOrdenInline]
