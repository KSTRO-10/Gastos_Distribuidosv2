from rest_framework import serializers
from .models import EntregaBienes, EntregaDetalle, EvidenciaEntrega, SalidaBienes, SalidaDetalle


class EvidenciaEntregaSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvidenciaEntrega
        fields = ['id', 'imagen', 'descripcion', 'created_at']
        read_only_fields = ['id', 'created_at']


class EntregaDetalleSerializer(serializers.ModelSerializer):
    concepto = serializers.CharField(source='detalle_orden.concepto', read_only=True)
    
    class Meta:
        model = EntregaDetalle
        fields = [
            'id', 'detalle_orden', 'concepto', 'cantidad_recibida',
            'notas', 'condicion_buena', 'observaciones_condicion'
        ]
        read_only_fields = ['id']


class EntregaBienesSerializer(serializers.ModelSerializer):
    orden_numero = serializers.CharField(source='orden.numero', read_only=True)
    recibido_por_nombre = serializers.CharField(source='recibido_por.full_name', read_only=True)
    detalles = EntregaDetalleSerializer(many=True, read_only=True)
    evidencias = EvidenciaEntregaSerializer(many=True, read_only=True)
    
    class Meta:
        model = EntregaBienes
        fields = [
            'id', 'numero', 'orden', 'orden_numero', 'factura',
            'fecha_recepcion', 'notas', 'recibido_por', 'recibido_por_nombre',
            'completa', 'detalles', 'evidencias', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'numero', 'recibido_por', 'created_at', 'updated_at']


class EntregaBienesCreateSerializer(serializers.ModelSerializer):
    detalles = EntregaDetalleSerializer(many=True)
    
    class Meta:
        model = EntregaBienes
        fields = ['id', 'orden', 'factura', 'fecha_recepcion', 'notas', 'completa', 'detalles']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        entrega = EntregaBienes.objects.create(**validated_data)
        
        for detalle_data in detalles_data:
            EntregaDetalle.objects.create(entrega=entrega, **detalle_data)
        
        # Actualizar estado de la orden de compra según cantidades recibidas
        entrega.orden.actualizar_estado_entrega()
        
        return entrega


class SalidaDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalidaDetalle
        fields = ['id', 'material', 'descripcion', 'cantidad', 'unidad']
        read_only_fields = ['id']


class SalidaBienesSerializer(serializers.ModelSerializer):
    almacen_nombre = serializers.CharField(source='almacen.name', read_only=True)
    destino_nombre = serializers.CharField(source='destino_area.name', read_only=True)
    responsable_nombre = serializers.CharField(source='responsable.full_name', read_only=True)
    detalles = SalidaDetalleSerializer(many=True, read_only=True)
    
    class Meta:
        model = SalidaBienes
        fields = [
            'id', 'numero', 'almacen', 'almacen_nombre',
            'destino_area', 'destino_nombre', 'fecha', 'referencia',
            'notas', 'responsable', 'responsable_nombre',
            'confirmada', 'confirmada_por', 'fecha_confirmacion',
            'detalles', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'numero', 'responsable', 'confirmada_por', 
                          'fecha_confirmacion', 'created_at', 'updated_at']


class SalidaBienesCreateSerializer(serializers.ModelSerializer):
    detalles = SalidaDetalleSerializer(many=True)
    
    class Meta:
        model = SalidaBienes
        fields = ['almacen', 'destino_area', 'fecha', 'referencia', 'notas', 'detalles']
    
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        salida = SalidaBienes.objects.create(**validated_data)
        
        for detalle_data in detalles_data:
            SalidaDetalle.objects.create(salida=salida, **detalle_data)
        
        return salida
