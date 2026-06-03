from rest_framework import serializers
from .models import (
    SolicitudGasto, ItemSolicitudGasto,
    SolicitudPago, ItemSolicitudPago,
)


class FacturaInfoSerializer(serializers.Serializer):
    """Read-only nested representation of a Factura."""
    proveedor_nombre = serializers.CharField(source='proveedor.razon_social', read_only=True)
    proveedor_rfc = serializers.CharField(source='proveedor.rfc', read_only=True)
    fecha = serializers.DateTimeField(read_only=True)
    total = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    uuid = serializers.CharField(source='uuid_cfdi', read_only=True)
    folio = serializers.CharField(read_only=True)


class ItemSolicitudGastoSerializer(serializers.ModelSerializer):
    area_nombre = serializers.CharField(source='area.name', read_only=True)

    class Meta:
        model = ItemSolicitudGasto
        fields = [
            'id', 'area', 'area_nombre',
            'clave_presupuestaria', 'concepto_bien', 'descripcion_adquirido',
            'cantidad', 'precio_unitario', 'costo_total',
        ]
        read_only_fields = ['id']


class SolicitudGastoSerializer(serializers.ModelSerializer):
    factura_info = FacturaInfoSerializer(source='factura', read_only=True)
    solicitante_nombre = serializers.CharField(source='solicitante.full_name', read_only=True)
    items = ItemSolicitudGastoSerializer(many=True)

    class Meta:
        model = SolicitudGasto
        fields = [
            'id', 'numero', 'factura', 'factura_info',
            'fondo_programa', 'tipo_material', 'fecha_solicitud',
            'solicitante', 'solicitante_nombre',
            'estado', 'items',
        ]
        read_only_fields = ['id', 'numero', 'fecha_solicitud', 'solicitante']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        solicitud = SolicitudGasto.objects.create(**validated_data)
        for item_data in items_data:
            ItemSolicitudGasto.objects.create(solicitud_gasto=solicitud, **item_data)
        return solicitud

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                ItemSolicitudGasto.objects.create(solicitud_gasto=instance, **item_data)

        return instance


class ItemSolicitudPagoSerializer(serializers.ModelSerializer):
    area_nombre = serializers.CharField(source='area.name', read_only=True)

    class Meta:
        model = ItemSolicitudPago
        fields = ['id', 'area', 'area_nombre', 'clave_presupuestaria', 'importe']
        read_only_fields = ['id']


class SolicitudPagoSerializer(serializers.ModelSerializer):
    solicitud_gasto_numero = serializers.CharField(
        source='solicitud_gasto.numero', read_only=True
    )
    items = ItemSolicitudPagoSerializer(many=True)

    class Meta:
        model = SolicitudPago
        fields = [
            'id', 'numero', 'solicitud_gasto', 'solicitud_gasto_numero',
            'banco', 'numero_cuenta', 'cog_clave', 'cog_nombre',
            'fecha_solicitud', 'estado', 'items',
        ]
        read_only_fields = ['id', 'numero', 'fecha_solicitud']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        solicitud = SolicitudPago.objects.create(**validated_data)
        for item_data in items_data:
            ItemSolicitudPago.objects.create(solicitud_pago=solicitud, **item_data)
        return solicitud

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                ItemSolicitudPago.objects.create(solicitud_pago=instance, **item_data)

        return instance
