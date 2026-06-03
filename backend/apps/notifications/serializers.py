from rest_framework import serializers
from .models import Notification, ActivityLog


class NotificationSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'tipo', 'tipo_display', 'title', 'message',
            'action_url', 'read', 'read_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ActivityLogSerializer(serializers.ModelSerializer):
    accion_display = serializers.CharField(source='get_accion_display', read_only=True)
    user_nombre = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'user_nombre', 'accion', 'accion_display',
            'modelo', 'objeto_id', 'descripcion', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
