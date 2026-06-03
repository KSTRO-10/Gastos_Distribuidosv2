from rest_framework import serializers
from .models import PlantillaPresupuestal, ItemClavePres


class ItemClavePresSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemClavePres
        fields = [
            'id', 'plantilla', 'unidad_ejecutora_gasto', 'cog',
            'cog_fondo', 'cog_desagregacion', 'clasificador_programatico',
            'tipo_gasto', 'finalidad_funcion', 'fuente_financiamiento',
            'clasificador_economico', 'actividad_institucional',
            'programa_presupuestario', 'accion', 'descripcion',
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'plantilla': {'required': False},
        }


class PlantillaPresupuestalSerializer(serializers.ModelSerializer):
    """Serializer completo con items anidados (para detalle)."""

    items = ItemClavePresSerializer(many=True, read_only=True)
    items_count = serializers.IntegerField(source='items.count', read_only=True)
    created_by_nombre = serializers.CharField(
        source='created_by.full_name', read_only=True
    )

    class Meta:
        model = PlantillaPresupuestal
        fields = [
            'id', 'tenant', 'nombre', 'ejercicio_fiscal',
            'entidad_federativa', 'clasificador_administrativo',
            'no_municipio_ramo', 'unidad_administrativa',
            'created_by', 'created_by_nombre',
            'created_at', 'updated_at',
            'items_count', 'items',
        ]
        read_only_fields = ['id', 'tenant', 'created_by', 'created_at', 'updated_at']


class PlantillaPresupuestalListSerializer(serializers.ModelSerializer):
    """Serializer ligero sin items (para listado)."""

    items_count = serializers.IntegerField(source='items.count', read_only=True)
    created_by_nombre = serializers.CharField(
        source='created_by.full_name', read_only=True
    )

    class Meta:
        model = PlantillaPresupuestal
        fields = [
            'id', 'nombre', 'ejercicio_fiscal',
            'entidad_federativa', 'clasificador_administrativo',
            'no_municipio_ramo', 'unidad_administrativa',
            'created_by', 'created_by_nombre',
            'created_at', 'updated_at',
            'items_count',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
