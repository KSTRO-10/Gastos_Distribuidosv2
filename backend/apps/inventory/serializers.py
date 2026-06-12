from rest_framework import serializers
from .models import (
    Articulo, Stock,
    Auditoria, AuditoriaDetalle,
    EntregaBienes, EntregaDetalle, EvidenciaEntrega, SalidaBienes, SalidaDetalle,
    DevolucionInterna, DevolucionDetalle, AjusteInventario, AjusteInventarioDetalle
)


class ArticuloSerializer(serializers.ModelSerializer):
    cog_descripcion = serializers.CharField(source='cog.descripcion', read_only=True)

    class Meta:
        model = Articulo
        fields = [
            'id', 'codigo', 'nombre', 'descripcion', 'unidad_medida',
            'cog', 'cog_descripcion', 'costo_promedio', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StockSerializer(serializers.ModelSerializer):
    almacen_nombre = serializers.CharField(source='almacen.name', read_only=True)
    articulo_nombre = serializers.CharField(source='articulo.nombre', read_only=True)
    articulo_codigo = serializers.CharField(source='articulo.codigo', read_only=True)

    class Meta:
        model = Stock
        fields = [
            'id', 'almacen', 'almacen_nombre',
            'articulo', 'articulo_nombre', 'articulo_codigo',
            'cantidad', 'cantidad_reservada', 'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']



class AuditoriaDetalleSerializer(serializers.ModelSerializer):
    articulo_nombre = serializers.CharField(source='articulo.nombre', read_only=True)

    class Meta:
        model = AuditoriaDetalle
        fields = [
            'id', 'articulo', 'articulo_nombre',
            'existencia_sistema', 'existencia_fisica', 'diferencia', 'justificacion',
        ]
        read_only_fields = ['id', 'diferencia']


class AuditoriaSerializer(serializers.ModelSerializer):
    almacen_nombre = serializers.CharField(source='almacen.name', read_only=True)
    creada_por_nombre = serializers.CharField(source='creada_por.full_name', read_only=True)
    autorizada_por_nombre = serializers.SerializerMethodField()
    detalles = AuditoriaDetalleSerializer(many=True, read_only=True)

    def get_autorizada_por_nombre(self, obj):
        if obj.autorizada_por:
            return getattr(obj.autorizada_por, 'full_name', str(obj.autorizada_por))
        return None

    class Meta:
        model = Auditoria
        fields = [
            'id', 'numero', 'almacen', 'almacen_nombre',
            'fecha_inicio', 'fecha_cierre', 'estado',
            'creada_por', 'creada_por_nombre',
            'autorizada_por', 'autorizada_por_nombre',
            'notas', 'detalles',
        ]
        read_only_fields = [
            'id', 'numero', 'fecha_inicio', 'fecha_cierre',
            'estado', 'creada_por', 'autorizada_por',
        ]


class AuditoriaCreateSerializer(serializers.ModelSerializer):
    detalles = AuditoriaDetalleSerializer(many=True)

    class Meta:
        model = Auditoria
        fields = ['id', 'almacen', 'notas', 'detalles']
        read_only_fields = ['id']

    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        auditoria = Auditoria.objects.create(**validated_data)
        for detalle_data in detalles_data:
            AuditoriaDetalle.objects.create(auditoria=auditoria, **detalle_data)
        return auditoria


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
    articulo_nombre = serializers.CharField(source='articulo.nombre', read_only=True)
    
    class Meta:
        model = SalidaDetalle
        fields = ['id', 'articulo', 'articulo_nombre', 'descripcion', 'cantidad']
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


class DevolucionDetalleSerializer(serializers.ModelSerializer):
    articulo_nombre = serializers.CharField(source='articulo.nombre', read_only=True)
    
    class Meta:
        model = DevolucionDetalle
        fields = ['id', 'articulo', 'articulo_nombre', 'cantidad']
        read_only_fields = ['id']


class DevolucionInternaSerializer(serializers.ModelSerializer):
    area_origen_nombre = serializers.CharField(source='area_origen.name', read_only=True)
    almacen_destino_nombre = serializers.CharField(source='almacen_destino.name', read_only=True)
    solicitante_nombre = serializers.CharField(source='solicitante.full_name', read_only=True)
    recibido_por_nombre = serializers.CharField(source='recibido_por.full_name', read_only=True)
    detalles = DevolucionDetalleSerializer(many=True, read_only=True)
    
    class Meta:
        model = DevolucionInterna
        fields = [
            'id', 'numero', 'area_origen', 'area_origen_nombre',
            'almacen_destino', 'almacen_destino_nombre', 'salida_origen',
            'solicitante', 'solicitante_nombre', 'recibido_por', 'recibido_por_nombre',
            'fecha_solicitud', 'fecha_recepcion', 'estado', 'notas', 'detalles'
        ]
        read_only_fields = ['id', 'numero', 'solicitante', 'recibido_por', 'fecha_solicitud', 'fecha_recepcion', 'estado']


class DevolucionInternaCreateSerializer(serializers.ModelSerializer):
    detalles = DevolucionDetalleSerializer(many=True)
    
    class Meta:
        model = DevolucionInterna
        fields = ['id', 'area_origen', 'almacen_destino', 'salida_origen', 'notas', 'detalles']
        read_only_fields = ['id']
        
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        devolucion = DevolucionInterna.objects.create(**validated_data)
        for detalle_data in detalles_data:
            DevolucionDetalle.objects.create(devolucion=devolucion, **detalle_data)
        return devolucion


class AjusteInventarioDetalleSerializer(serializers.ModelSerializer):
    articulo_nombre = serializers.CharField(source='articulo.nombre', read_only=True)
    
    class Meta:
        model = AjusteInventarioDetalle
        fields = ['id', 'articulo', 'articulo_nombre', 'cantidad', 'tipo']
        read_only_fields = ['id']


class AjusteInventarioSerializer(serializers.ModelSerializer):
    almacen_nombre = serializers.CharField(source='almacen.name', read_only=True)
    solicitante_nombre = serializers.CharField(source='solicitante.full_name', read_only=True)
    autorizador_nombre = serializers.CharField(source='autorizador.full_name', read_only=True)
    detalles = AjusteInventarioDetalleSerializer(many=True, read_only=True)
    
    class Meta:
        model = AjusteInventario
        fields = [
            'id', 'numero', 'almacen', 'almacen_nombre',
            'solicitante', 'solicitante_nombre', 'autorizador', 'autorizador_nombre',
            'estado', 'motivo_general', 'justificacion', 'fecha_solicitud', 'fecha_autorizacion',
            'detalles'
        ]
        read_only_fields = ['id', 'numero', 'solicitante', 'autorizador', 'estado', 'fecha_solicitud', 'fecha_autorizacion']


class AjusteInventarioCreateSerializer(serializers.ModelSerializer):
    detalles = AjusteInventarioDetalleSerializer(many=True)
    
    class Meta:
        model = AjusteInventario
        fields = ['id', 'almacen', 'motivo_general', 'justificacion', 'detalles']
        read_only_fields = ['id']
        
    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles')
        ajuste = AjusteInventario.objects.create(**validated_data)
        for detalle_data in detalles_data:
            AjusteInventarioDetalle.objects.create(ajuste=ajuste, **detalle_data)
        return ajuste

