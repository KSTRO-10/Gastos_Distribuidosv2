from django.contrib import admin
from .models import Factura, FacturaDetalle, DistribucionGasto


class FacturaDetalleInline(admin.TabularInline):
    model = FacturaDetalle
    extra = 0
    readonly_fields = ['clave_prod_serv', 'descripcion', 'cantidad', 'valor_unitario', 'importe']


class DistribucionGastoInline(admin.TabularInline):
    model = DistribucionGasto
    extra = 1


@admin.register(Factura)
class FacturaAdmin(admin.ModelAdmin):
    list_display = ['uuid_cfdi', 'proveedor', 'folio', 'total', 'status', 'fecha', 'created_at']
    list_filter = ['status', 'proveedor', 'fecha', 'created_at']
    search_fields = ['uuid_cfdi', 'folio', 'proveedor__razon_social', 'rfc_emisor']
    readonly_fields = ['uuid_cfdi', 'parsed_json', 'created_at', 'updated_at']
    inlines = [FacturaDetalleInline, DistribucionGastoInline]
    
    fieldsets = (
        ('Archivos', {
            'fields': ('xml_file', 'pdf_file', 'proveedor')
        }),
        ('Datos CFDI', {
            'fields': ('uuid_cfdi', 'folio', 'serie', 'fecha', 'tipo_comprobante', 'uso_cfdi')
        }),
        ('Emisor/Receptor', {
            'fields': ('rfc_emisor', 'nombre_emisor', 'rfc_receptor', 'nombre_receptor')
        }),
        ('Montos', {
            'fields': ('subtotal', 'descuento', 'iva', 'isr', 'iva_retenido', 'total')
        }),
        ('Pago', {
            'fields': ('forma_pago', 'metodo_pago', 'moneda', 'tipo_cambio')
        }),
        ('Estado', {
            'fields': ('status', 'error_message')
        }),
        ('Datos Parseados', {
            'fields': ('parsed_json',),
            'classes': ('collapse',)
        }),
        ('Auditoría', {
            'fields': ('uploaded_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DistribucionGasto)
class DistribucionGastoAdmin(admin.ModelAdmin):
    list_display = ['factura', 'area', 'monto', 'porcentaje', 'created_at']
    list_filter = ['area', 'created_at']
    search_fields = ['factura__uuid_cfdi', 'area__name']
