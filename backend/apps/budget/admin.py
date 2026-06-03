from django.contrib import admin
from .models import PlantillaPresupuestal, ItemClavePres


class ItemClavePresInline(admin.TabularInline):
    model = ItemClavePres
    extra = 0
    readonly_fields = ['cog', 'descripcion', 'unidad_ejecutora_gasto']
    fields = [
        'unidad_ejecutora_gasto', 'cog', 'cog_fondo', 'cog_desagregacion',
        'clasificador_programatico', 'tipo_gasto', 'finalidad_funcion',
        'fuente_financiamiento', 'clasificador_economico',
        'actividad_institucional', 'programa_presupuestario',
        'accion', 'descripcion',
    ]


@admin.register(PlantillaPresupuestal)
class PlantillaPresupuestalAdmin(admin.ModelAdmin):
    list_display = [
        'nombre', 'ejercicio_fiscal', 'entidad_federativa',
        'clasificador_administrativo', 'created_by', 'created_at',
    ]
    list_filter = ['ejercicio_fiscal', 'entidad_federativa', 'created_at']
    search_fields = ['nombre', 'entidad_federativa', 'clasificador_administrativo']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [ItemClavePresInline]

    fieldsets = (
        ('Identificación', {
            'fields': ('tenant', 'nombre', 'ejercicio_fiscal')
        }),
        ('Clasificadores', {
            'fields': (
                'entidad_federativa', 'clasificador_administrativo',
                'no_municipio_ramo', 'unidad_administrativa',
            )
        }),
        ('Auditoría', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ItemClavePres)
class ItemClavePresAdmin(admin.ModelAdmin):
    list_display = ['plantilla', 'cog', 'unidad_ejecutora_gasto', 'descripcion_corta']
    list_filter = ['plantilla__ejercicio_fiscal', 'cog']
    search_fields = ['cog', 'descripcion', 'unidad_ejecutora_gasto']

    @admin.display(description='Descripción')
    def descripcion_corta(self, obj):
        return obj.descripcion[:80] + '...' if len(obj.descripcion) > 80 else obj.descripcion
