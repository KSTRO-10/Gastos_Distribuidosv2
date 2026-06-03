from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import transaction
import uuid
from .models import User, Role


class RoleSerializer(serializers.ModelSerializer):
    """Serializer for Role model."""
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions', 'is_active']
        read_only_fields = ['id']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    
    role_name = serializers.CharField(source='role.get_name_display', read_only=True)
    role_display = serializers.CharField(source='role.get_name_display', read_only=True)
    area_name = serializers.CharField(source='area.name', read_only=True, default='')
    avatar = serializers.SerializerMethodField()
    
    ine_documento = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'full_name', 'phone',
            'role', 'role_name', 'role_display', 'area', 'area_name', 'puesto',
            'avatar', 'is_active',
            'ine_documento', 'ine_verificada', 'ine_rechazada', 'ine_rechazo_motivo',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_ine_documento(self, obj):
        """Return absolute URL for INE photo/document."""
        if obj.ine_documento:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.ine_documento.url)
            return obj.ine_documento.url
        return None
    
    def get_avatar(self, obj):
        """Return absolute URL for avatar."""
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users."""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'full_name', 'phone',
            'role', 'area', 'puesto', 'ine_documento',
            'password', 'password_confirm'
        ]
    
    def validate(self, data):
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({
                'password_confirm': 'Las contraseñas no coinciden.'
            })
            
        area = data.get('area')
        puesto = data.get('puesto')
        
        if area and puesto and puesto.strip().lower() != 'auxiliar':
            qs = User.objects.filter(area=area, puesto__iexact=puesto.strip())
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError({
                    'puesto': 'Ya existe un usuario con este puesto en el área seleccionada.'
                })
                
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        with transaction.atomic():
            user = User(**validated_data)
            user.set_password(password)
            user.save()
            
            # Si el rol es proveedor, crear automáticamente el perfil de proveedor
            if user.role and user.role.name == Role.RoleType.PROVEEDOR:
                try:
                    from apps.companies.models import Proveedor
                    # Crear RFC único temporal usando UUID corto + timestamp
                    import time
                    unique_rfc = f"TMP{int(time.time())}{uuid.uuid4().hex[:4].upper()}"
                    # Crear perfil de proveedor básico
                    Proveedor.objects.create(
                        user=user,
                        rfc=unique_rfc,  # RFC temporal único, debe actualizarse después
                        razon_social=user.full_name or user.username or user.email,
                        contacto_nombre=user.full_name or '',
                        contacto_email=user.email,
                        estado=Proveedor.EstadoChoices.ACTIVO
                    )
                except Exception as e:
                    # Si falla la creación del proveedor, aún creamos el usuario
                    # pero logueamos el error
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error creando perfil de proveedor para {user.email}: {e}")
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating users."""
    
    class Meta:
        model = User
        fields = ['full_name', 'phone', 'role', 'area', 'puesto', 'avatar', 'ine_documento', 'settings']
        
    def validate(self, data):
        # Usar los valores actuales si no vienen en data (para partial update)
        area = data.get('area', self.instance.area if self.instance else None)
        puesto = data.get('puesto', self.instance.puesto if self.instance else None)
        
        if area and puesto and puesto.strip().lower() != 'auxiliar':
            qs = User.objects.filter(area=area, puesto__iexact=puesto.strip())
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError({
                    'puesto': 'Ya existe un usuario con este puesto en el área seleccionada.'
                })
                
        return data


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""
    
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True)
    
    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'Las contraseñas no coinciden.'
            })
        return data


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer with additional user info."""
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Add custom claims
        token['email'] = user.email
        token['full_name'] = user.full_name
        token['role'] = user.role.name if user.role else None
        
        return token
    
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Build absolute URL for avatar
        avatar_url = None
        if self.user.avatar:
            request = self.context.get('request')
            if request:
                avatar_url = request.build_absolute_uri(self.user.avatar.url)
            else:
                avatar_url = self.user.avatar.url
        
        # Build absolute URL for INE photo/doc
        ine_documento_url = None
        if self.user.ine_documento:
            request = self.context.get('request')
            if request:
                ine_documento_url = request.build_absolute_uri(self.user.ine_documento.url)
            else:
                ine_documento_url = self.user.ine_documento.url
        
        # Add user info to response
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'full_name': self.user.full_name,
            'role': self.user.role.name if self.user.role else None,
            'role_display': self.user.role.get_name_display() if self.user.role else None,
            'permissions': self.user.role.permissions if self.user.role else [],
            'area': self.user.area.id if self.user.area else None,
            'area_name': self.user.area.name if self.user.area else None,
            'puesto': self.user.puesto,
            'avatar': avatar_url,
            'phone': self.user.phone,
            'ine_verificada': self.user.ine_verificada,
            'ine_rechazada': self.user.ine_rechazada,
            'ine_rechazo_motivo': self.user.ine_rechazo_motivo,
            'ine_documento': ine_documento_url,
        }
        
        return data
