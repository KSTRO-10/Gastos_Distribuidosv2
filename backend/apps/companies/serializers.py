from rest_framework import serializers
from .models import Company, Proveedor, ProductoProveedor, FirmanteDocumento


class CompanySerializer(serializers.ModelSerializer):
    direccion_completa = serializers.ReadOnlyField()
    
    class Meta:
        model = Company
        fields = [
            'id', 'rfc', 'razon_social', 'nombre_comercial',
            'calle', 'numero_exterior', 'numero_interior', 'colonia',
            'municipio', 'estado', 'codigo_postal', 'direccion_completa',
            'telefono', 'email', 'logo', 'membrete', 'pie_pagina',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = [
            'id', 'rfc', 'razon_social', 'nombre_comercial',
            'contacto_nombre', 'contacto_email', 'contacto_telefono',
            'direccion', 'logo', 'estado', 'documentos', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'estado', 'created_at', 'updated_at']


class ProveedorSignupSerializer(serializers.ModelSerializer):
    """Serializer for provider self-registration."""
    
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = Proveedor
        fields = [
            'rfc', 'razon_social', 'nombre_comercial',
            'contacto_nombre', 'contacto_email', 'contacto_telefono',
            'direccion', 'password'
        ]
    
    def validate_rfc(self, value):
        value = value.upper().strip()
        if Proveedor.objects.filter(rfc=value).exists():
            raise serializers.ValidationError("Este RFC ya está registrado.")
        return value


class ProductoProveedorSerializer(serializers.ModelSerializer):
    """Serializer de lectura para productos del catálogo del proveedor."""
    proveedor_nombre = serializers.CharField(source='proveedor.razon_social', read_only=True)
    cog_codigo = serializers.CharField(source='cog.codigo', read_only=True)
    cog_descripcion = serializers.CharField(source='cog.descripcion', read_only=True)

    class Meta:
        model = ProductoProveedor
        fields = [
            'id', 'proveedor', 'proveedor_nombre',
            'cog', 'cog_codigo', 'cog_descripcion',
            'nombre', 'descripcion', 'unidad', 'precio_unitario',
            'marca', 'modelo', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductoProveedorCreateSerializer(serializers.ModelSerializer):
    """Serializer de escritura para productos del catálogo."""

    class Meta:
        model = ProductoProveedor
        fields = [
            'cog', 'nombre', 'descripcion', 'unidad',
            'precio_unitario', 'marca', 'modelo', 'is_active'
        ]

    def validate_precio_unitario(self, value):
        if value <= 0:
            raise serializers.ValidationError("El precio debe ser mayor a 0.")
        return value


class FirmanteDocumentoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(
        source='user.full_name',
        read_only=True
    )
    tipo_documento_display = serializers.CharField(
        source='get_tipo_documento_display',
        read_only=True
    )
    nombre_completo_display = serializers.SerializerMethodField()
    
    class Meta:
        model = FirmanteDocumento
        fields = [
            'id', 'company', 'tipo_documento', 'tipo_documento_display',
            'cargo', 'nombre', 'usuario_nombre', 'nombre_completo_display',
            'user', 'sello_imagen', 'orden', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_nombre_completo_display(self, obj):
        return obj.nombre_completo
