from rest_framework import serializers
from .models import Tenant, SolicitudGubernamental


class TenantSerializer(serializers.ModelSerializer):
    """Serializer for Tenant model."""
    
    class Meta:
        model = Tenant
        fields = ['id', 'schema_name', 'name', 'rfc', 'settings',
                  'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'schema_name', 'created_at', 'updated_at']


class SolicitudGubernamentalSerializer(serializers.ModelSerializer):
    """Serializer for registration requests."""
    
    class Meta:
        model = SolicitudGubernamental
        fields = [
            'id', 'nombre_solicitante', 'email_solicitante', 'telefono',
            'nombre_organizacion', 'rfc', 'direccion', 'estado',
            'attachments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'estado', 'created_at', 'updated_at']


class SolicitudGubernamentalCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating registration requests."""
    
    class Meta:
        model = SolicitudGubernamental
        fields = [
            'nombre_solicitante', 'email_solicitante', 'telefono',
            'nombre_organizacion', 'rfc', 'direccion', 'attachments'
        ]
    
    def validate_rfc(self, value):
        """Validate RFC format."""
        value = value.upper().strip()
        if len(value) not in [12, 13]:
            raise serializers.ValidationError("El RFC debe tener 12 o 13 caracteres.")
        return value


class SolicitudApprovalSerializer(serializers.Serializer):
    """Serializer for approving/rejecting requests."""
    
    action = serializers.ChoiceField(choices=['approve', 'reject'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    subdomain = serializers.CharField(required=False, max_length=50)
    
    def validate(self, data):
        if data['action'] == 'reject' and not data.get('rejection_reason'):
            raise serializers.ValidationError({
                'rejection_reason': 'Se requiere motivo de rechazo.'
            })
        if data['action'] == 'approve' and not data.get('subdomain'):
            raise serializers.ValidationError({
                'subdomain': 'Se requiere subdominio para aprobar.'
            })
        return data
