from django.contrib import admin
from .models import PDFDocument, Media


@admin.register(PDFDocument)
class PDFDocumentAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'tipo', 'generated_by', 'created_at']
    list_filter = ['tipo', 'created_at']
    search_fields = ['nombre', 'descripcion']
    readonly_fields = ['created_at']


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = ['original_name', 'content_type', 'size', 'owner', 'created_at']
    list_filter = ['content_type', 'created_at']
    search_fields = ['original_name']
    readonly_fields = ['created_at']
