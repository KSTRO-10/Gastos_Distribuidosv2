from rest_framework import serializers
from decimal import Decimal
from .models import SolicitudAutorizacion, AutorizacionPresupuestal, OrdenCompra, DetalleOrden


class AutorizacionPresupuestalSerializer(serializers.ModelSerializer):
    aprobado_por_nombre = serializers.CharField(source='aprobado_por.full_name', read_only=True)
    
    class Meta:
        model = AutorizacionPresupuestal
        fields = [
            'id', 'monto_autorizado', 'partida_presupuestal',
            'fecha_aprobacion', 'observaciones', 'aprobado_por',
            'aprobado_por_nombre', 'created_at'
        ]
        read_only_fields = ['id', 'aprobado_por', 'created_at']


class SolicitudAutorizacionSerializer(serializers.ModelSerializer):
    solicitud_numero = serializers.CharField(source='solicitud.numero', read_only=True)
    cotizacion_numero = serializers.CharField(source='cotizacion.numero', read_only=True)
    solicitante_nombre = serializers.CharField(source='solicitante.full_name', read_only=True)
    autorizacion_presupuestal = AutorizacionPresupuestalSerializer(read_only=True)
    
    class Meta:
        model = SolicitudAutorizacion
        fields = [
            'id', 'numero', 'solicitud', 'solicitud_numero',
            'cotizacion', 'cotizacion_numero', 'fecha_solicitud',
            'monto_solicitado', 'justificacion', 'estado', 'motivo_rechazo',
            'solicitante', 'solicitante_nombre', 'autorizacion_presupuestal',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'numero', 'solicitante', 'motivo_rechazo', 'created_at', 'updated_at']


class DetalleOrdenSerializer(serializers.ModelSerializer):
    cantidad_pendiente = serializers.DecimalField(max_digits=15, decimal_places=4, read_only=True)
    
    class Meta:
        model = DetalleOrden
        fields = [
            'id', 'detalle_material', 'concepto', 'descripcion',
            'cantidad', 'unidad', 'precio_unitario', 'subtotal',
            'cantidad_recibida', 'cantidad_pendiente'
        ]
        read_only_fields = ['id', 'subtotal']


class OrdenCompraSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.razon_social', read_only=True)
    detalles = DetalleOrdenSerializer(many=True, read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = OrdenCompra
        fields = [
            'id', 'numero', 'proveedor', 'proveedor_nombre',
            'autorizacion', 'cotizacion', 'fecha_emision',
            'fecha_entrega_esperada', 'subtotal', 'iva', 'total',
            'condiciones_pago', 'lugar_entrega', 'notas',
            'estado', 'estado_display', 'referencia_externa',
            'detalles', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'numero', 'subtotal', 'iva', 'total', 'created_at', 'updated_at']


class OrdenCompraCreateSerializer(serializers.ModelSerializer):
    detalles = DetalleOrdenSerializer(many=True)
    
    class Meta:
        model = OrdenCompra
        fields = [
            'proveedor', 'autorizacion', 'cotizacion', 'fecha_emision',
            'fecha_entrega_esperada', 'condiciones_pago', 'lugar_entrega',
            'notas', 'detalles'
        ]
    
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        orden = OrdenCompra.objects.create(**validated_data)
        
        subtotal = 0
        for detalle_data in detalles_data:
            detalle = DetalleOrden.objects.create(orden=orden, **detalle_data)
            subtotal += detalle.subtotal
        
        orden.subtotal = subtotal
        orden.iva = subtotal * Decimal('0.16')
        orden.total = subtotal + orden.iva
        orden.save()
        
        return orden
    
    def update(self, instance, validated_data):
        detalles_data = validated_data.pop('detalles', None)
        
        # Update orden fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Replace detalles if provided
        if detalles_data is not None:
            instance.detalles.all().delete()
            subtotal = 0
            for detalle_data in detalles_data:
                detalle = DetalleOrden.objects.create(orden=instance, **detalle_data)
                subtotal += detalle.subtotal
            
            instance.subtotal = subtotal
            instance.iva = subtotal * Decimal('0.16')
            instance.total = subtotal + instance.iva
            instance.save()
        
        return instance
