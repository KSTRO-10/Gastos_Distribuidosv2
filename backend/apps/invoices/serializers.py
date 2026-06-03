from rest_framework import serializers
from .models import Factura, FacturaDetalle, DistribucionGasto


class FacturaDetalleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacturaDetalle
        fields = [
            'id', 'clave_prod_serv', 'no_identificacion', 'cantidad',
            'clave_unidad', 'unidad', 'descripcion', 'valor_unitario',
            'importe', 'descuento', 'objeto_imp', 'impuestos'
        ]
        read_only_fields = ['id']


class DistribucionGastoSerializer(serializers.ModelSerializer):
    area_nombre = serializers.CharField(source='area.name', read_only=True)
    concepto_descripcion = serializers.CharField(source='concepto.descripcion', read_only=True)
    
    class Meta:
        model = DistribucionGasto
        fields = [
            'id', 'concepto', 'concepto_descripcion', 'area', 'area_nombre',
            'solicitud', 'monto', 'porcentaje', 'notas', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class FacturaSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.SerializerMethodField()
    conceptos = FacturaDetalleSerializer(many=True, read_only=True)
    distribuciones = DistribucionGastoSerializer(many=True, read_only=True)
    solicitudes_gasto = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    def get_proveedor_nombre(self, obj):
        if obj.proveedor:
            return obj.proveedor.razon_social
        return obj.nombre_emisor or 'Pendiente de procesar'
    
    def get_solicitudes_gasto(self, obj):
        result = []
        for sg in obj.solicitudes_gasto.all():
            try:
                sp_id = sg.solicitud_pago.id
            except Exception:
                sp_id = None
            result.append({
                'id': sg.id,
                'numero': sg.numero,
                'solicitud_pago_id': sp_id,
            })
        return result
    
    class Meta:
        model = Factura
        fields = [
            'id', 'proveedor', 'proveedor_nombre', 'xml_file', 'pdf_file',
            'uuid_cfdi', 'folio', 'serie', 'fecha',
            'rfc_emisor', 'nombre_emisor', 'rfc_receptor', 'nombre_receptor',
            'subtotal', 'descuento', 'iva', 'isr', 'iva_retenido', 'total',
            'forma_pago', 'metodo_pago', 'moneda', 'tipo_cambio',
            'tipo_comprobante', 'uso_cfdi', 'status', 'status_display',
            'error_message', 'is_quick_flow', 'conceptos', 'distribuciones',
            'solicitudes_gasto',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'uuid_cfdi', 'folio', 'serie', 'fecha',
            'rfc_emisor', 'nombre_emisor', 'rfc_receptor', 'nombre_receptor',
            'subtotal', 'descuento', 'iva', 'isr', 'iva_retenido', 'total',
            'forma_pago', 'metodo_pago', 'moneda', 'tipo_cambio',
            'tipo_comprobante', 'uso_cfdi', 'status', 'error_message',
            'solicitudes_gasto',
            'created_at', 'updated_at'
        ]


class FacturaUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Factura
        fields = ['proveedor', 'xml_file', 'pdf_file']
        extra_kwargs = {
            'proveedor': {
                'required': False,
                'allow_null': True,
                'help_text': 'Opcional. Si no se especifica, se detectará automáticamente del XML.'
            }
        }
    
    def create(self, validated_data):
        # Ensure uuid_cfdi is None (not empty string) for new uploads
        validated_data['uuid_cfdi'] = None
        # proveedor can be None, will be auto-detected from XML during processing
        return super().create(validated_data)


class DistributeRequestSerializer(serializers.Serializer):
    """Serializer for distribution request."""
    
    distributions = serializers.ListField(
        child=serializers.DictField()
    )
    
    def validate_distributions(self, value):
        if not value:
            raise serializers.ValidationError("Se requiere al menos una distribución.")
        
        from apps.areas.models import Area
        
        seen_conceptos = set()
        for i, dist in enumerate(value):
            # Required fields
            if 'area_id' not in dist:
                raise serializers.ValidationError(f"Distribución {i+1}: requiere area_id.")
            if 'concepto_id' not in dist:
                raise serializers.ValidationError(f"Distribución {i+1}: requiere concepto_id.")
            if 'monto' not in dist:
                raise serializers.ValidationError(f"Distribución {i+1}: requiere monto.")
            
            # Type validation
            try:
                dist['area_id'] = int(dist['area_id'])
            except (ValueError, TypeError):
                raise serializers.ValidationError(f"Distribución {i+1}: area_id debe ser un número.")
            
            try:
                dist['concepto_id'] = int(dist['concepto_id'])
            except (ValueError, TypeError):
                raise serializers.ValidationError(f"Distribución {i+1}: concepto_id debe ser un número.")
            
            try:
                monto = float(dist['monto'])
                if monto <= 0:
                    raise serializers.ValidationError(f"Distribución {i+1}: monto debe ser mayor a cero.")
            except (ValueError, TypeError):
                raise serializers.ValidationError(f"Distribución {i+1}: monto debe ser un número válido.")
            
            # Check area exists
            if not Area.objects.filter(id=dist['area_id'], is_active=True).exists():
                raise serializers.ValidationError(f"Distribución {i+1}: el área {dist['area_id']} no existe o no está activa.")
            
            # Check duplicate concepts (each concept goes to one area only)
            if dist['concepto_id'] in seen_conceptos:
                raise serializers.ValidationError(f"Distribución {i+1}: el concepto {dist['concepto_id']} ya fue asignado.")
            seen_conceptos.add(dist['concepto_id'])
        
        return value


class FacturaQuickUploadSerializer(serializers.ModelSerializer):
    """Serializer for quick flow: upload + process in one step."""
    
    class Meta:
        model = Factura
        fields = ['xml_file', 'pdf_file']
        extra_kwargs = {
            'pdf_file': {'required': False, 'allow_null': True},
        }
    
    def create(self, validated_data):
        validated_data['uuid_cfdi'] = None
        validated_data['is_quick_flow'] = True
        return super().create(validated_data)
