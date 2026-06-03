from django.contrib import admin
from .models import Notification, ActivityLog


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'tipo', 'read', 'created_at']
    list_filter = ['tipo', 'read', 'created_at']
    search_fields = ['title', 'message', 'user__email']
    readonly_fields = ['created_at', 'read_at']


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['accion', 'modelo', 'objeto_id', 'user', 'created_at']
    list_filter = ['accion', 'modelo', 'created_at']
    search_fields = ['modelo', 'descripcion', 'user__email']
    readonly_fields = ['created_at']
