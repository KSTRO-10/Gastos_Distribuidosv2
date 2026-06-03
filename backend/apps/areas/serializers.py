from rest_framework import serializers
from .models import Area, PersonalArea


class AreaSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.razon_social', read_only=True)
    manager_name = serializers.CharField(source='manager.full_name', read_only=True)
    
    class Meta:
        model = Area
        fields = [
            'id', 'company', 'company_name', 'name', 'code', 'description',
            'manager', 'manager_name', 'parent', 'presupuesto_anual',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PersonalAreaSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    area_name = serializers.CharField(source='area.name', read_only=True)
    
    class Meta:
        model = PersonalArea
        fields = [
            'id', 'user', 'user_name', 'user_email',
            'area', 'area_name', 'cargo', 'is_primary',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
