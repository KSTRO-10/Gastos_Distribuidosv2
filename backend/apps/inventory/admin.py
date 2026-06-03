from django.contrib import admin
from .models import EntregaBienes, EntregaDetalle, EvidenciaEntrega, SalidaBienes, SalidaDetalle


class EntregaDetalleInline(admin.TabularInline):
    model = EntregaDetalle
    extra = 1


class EvidenciaEntregaInline(admin.TabularInline):
    model = EvidenciaEntrega
    extra = 1


@admin.register(EntregaBienes)
class EntregaBienesAdmin(admin.ModelAdmin):
    list_display = ['numero', 'orden', 'fecha_recepcion', 'recibido_por', 'completa']
    list_filter = ['completa', 'fecha_recepcion']
    search_fields = ['numero', 'orden__numero']
    readonly_fields = ['numero', 'created_at', 'updated_at']
    inlines = [EntregaDetalleInline, EvidenciaEntregaInline]


class SalidaDetalleInline(admin.TabularInline):
    model = SalidaDetalle
    extra = 1


@admin.register(SalidaBienes)
class SalidaBienesAdmin(admin.ModelAdmin):
    list_display = ['numero', 'almacen', 'destino_area', 'fecha', 'confirmada']
    list_filter = ['confirmada', 'fecha', 'almacen', 'destino_area']
    search_fields = ['numero', 'almacen__name', 'destino_area__name']
    readonly_fields = ['numero', 'created_at', 'updated_at']
    inlines = [SalidaDetalleInline]
