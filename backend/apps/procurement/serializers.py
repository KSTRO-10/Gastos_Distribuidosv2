from rest_framework import serializers
from .models import Cog, SolicitudMaterial, DetalleMaterial


class CogSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cog
        fields = ['id', 'codigo', 'descripcion', 'capitulo', 'concepto', 
                  'partida_generica', 'partida_especifica', 'palabras_clave', 'is_active']


class DetalleMaterialSerializer(serializers.ModelSerializer):
    cog_codigo = serializers.CharField(source='cog.codigo', read_only=True)
    cog_descripcion = serializers.CharField(source='cog.descripcion', read_only=True)
    subtotal_estimado = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    
    class Meta:
        model = DetalleMaterial
        fields = [
            'id', 'concepto', 'descripcion', 'cantidad', 'unidad',
            'cog', 'cog_codigo', 'cog_descripcion', 'precio_estimado',
            'subtotal_estimado', 'notas', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SolicitudMaterialSerializer(serializers.ModelSerializer):
    area_name = serializers.CharField(source='area.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    detalles = DetalleMaterialSerializer(many=True, read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    ine_documento = serializers.SerializerMethodField()
    ine_rechazo_motivo = serializers.CharField(source='created_by.ine_rechazo_motivo', read_only=True)
    
    class Meta:
        model = SolicitudMaterial
        fields = [
            'id', 'numero', 'area', 'area_name', 'fecha_solicitud',
            'descripcion', 'justificacion', 'eje_rector',
            'programa_presupuestario', 'actividad', 'estado', 'estado_display',
            'total_estimado', 'urgente', 'fecha_requerida',
            'created_by', 'created_by_name', 'detalles',
            'ine_documento', 'ine_rechazo_motivo',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'numero', 'total_estimado', 'created_by', 'created_at', 'updated_at']
    
    def get_ine_documento(self, obj):
        if obj.created_by and obj.created_by.ine_documento:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.created_by.ine_documento.url)
            return obj.created_by.ine_documento.url
        return None


class SolicitudMaterialCreateSerializer(serializers.ModelSerializer):
    detalles = DetalleMaterialSerializer(many=True)
    
    class Meta:
        model = SolicitudMaterial
        fields = [
            'area', 'fecha_solicitud', 'descripcion', 'justificacion',
            'eje_rector', 'programa_presupuestario', 'actividad',
            'urgente', 'fecha_requerida', 'detalles'
        ]
    
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        
        solicitud = SolicitudMaterial.objects.create(**validated_data)
        
        for detalle_data in detalles_data:
            DetalleMaterial.objects.create(solicitud=solicitud, **detalle_data)
        
        solicitud.update_total()
        return solicitud
    
    def update(self, instance, validated_data):
        detalles_data = validated_data.pop('detalles', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if detalles_data is not None:
            instance.detalles.all().delete()
            for detalle_data in detalles_data:
                DetalleMaterial.objects.create(solicitud=instance, **detalle_data)
            instance.update_total()
        
        return instance
