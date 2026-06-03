from rest_framework import serializers
from .models import CotizacionMaterial, CotizacionDetalle


class CotizacionDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotizacionDetalle
        fields = [
            'id', 'detalle_material', 'concepto', 'descripcion',
            'cantidad', 'unidad', 'precio_unitario', 'subtotal'
        ]
        read_only_fields = ['id', 'subtotal']


class CotizacionMaterialSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.razon_social', read_only=True)
    solicitud_numero = serializers.CharField(source='solicitud.numero', read_only=True)
    detalles = CotizacionDetalleSerializer(many=True, read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    tiene_orden = serializers.SerializerMethodField()

    def get_tiene_orden(self, obj):
        return obj.ordenes_compra.exists()
    
    class Meta:
        model = CotizacionMaterial
        fields = [
            'id', 'numero', 'solicitud', 'solicitud_numero',
            'proveedor', 'proveedor_nombre', 'fecha', 'vigencia',
            'subtotal', 'iva', 'total', 'tiempo_entrega',
            'condiciones_pago', 'notas', 'estado', 'estado_display',
            'documento', 'detalles', 'tiene_orden', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'numero', 'subtotal', 'iva', 'total', 'created_at', 'updated_at']


class CotizacionMaterialCreateSerializer(serializers.ModelSerializer):
    detalles = CotizacionDetalleSerializer(many=True)
    
    class Meta:
        model = CotizacionMaterial
        fields = [
            'solicitud', 'proveedor', 'fecha', 'vigencia',
            'tiempo_entrega', 'condiciones_pago', 'notas', 'documento', 'detalles'
        ]
    
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        cotizacion = CotizacionMaterial.objects.create(**validated_data)
        
        for detalle_data in detalles_data:
            CotizacionDetalle.objects.create(cotizacion=cotizacion, **detalle_data)
        
        cotizacion.update_totals()
        return cotizacion
    
    def update(self, instance, validated_data):
        detalles_data = validated_data.pop('detalles', None)
        
        # Update cotizacion fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Replace detalles if provided
        if detalles_data is not None:
            instance.detalles.all().delete()
            for detalle_data in detalles_data:
                CotizacionDetalle.objects.create(cotizacion=instance, **detalle_data)
            instance.update_totals()
        
        return instance
