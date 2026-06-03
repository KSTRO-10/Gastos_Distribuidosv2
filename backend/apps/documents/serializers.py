from rest_framework import serializers
from .models import PDFDocument, Media


class PDFDocumentSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    generated_by_nombre = serializers.CharField(source='generated_by.full_name', read_only=True)
    
    class Meta:
        model = PDFDocument
        fields = [
            'id', 'tipo', 'tipo_display', 'nombre', 'descripcion',
            'pdf_file', 'generated_by', 'generated_by_nombre', 'created_at'
        ]
        read_only_fields = ['id', 'pdf_file', 'generated_by', 'created_at']


class MediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Media
        fields = ['id', 'file', 'original_name', 'content_type', 'size', 'metadata', 'created_at']
        read_only_fields = ['id', 'content_type', 'size', 'created_at']


class GenerateDocumentSerializer(serializers.Serializer):
    """Serializer for document generation request."""
    
    document_type = serializers.ChoiceField(choices=[
    ('solicitud', 'Solicitud de Material'),
    ('orden_compra', 'Orden de Compra'),
    ('autorizacion', 'Autorización'),
    ('cotizacion', 'Cotización'),
    ('entrega_bienes', 'Entrega de Bienes'),
    ('salida_almacen', 'Salida de Almacén'),
    ('solicitud_autorizacion', 'Solicitud de Autorización'),
])
    object_id = serializers.IntegerField()
