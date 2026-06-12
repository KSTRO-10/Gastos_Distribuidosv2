from typing import Any
"""
User and Role models for authentication and authorization.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.Model):
    """
    Role model for RBAC (Role-Based Access Control).
    """
    objects: Any
    DoesNotExist: Any
    
    class RoleType(models.TextChoices):
        ADMIN = 'admin', 'Administrador'
        TESORERIA = 'tesoreria', 'Tesorería'
        ADQUISICIONES = 'adquisiciones', 'Adquisiciones'
        ALMACEN = 'almacen', 'Almacén'
        AREA = 'area', 'Área'
        PROVEEDOR = 'proveedor', 'Proveedor'
    
    name = models.CharField(
        max_length=50,
        choices=RoleType.choices,
        unique=True,
        verbose_name='Nombre'
    )
    description = models.TextField(blank=True, verbose_name='Descripción')
    permissions = models.JSONField(default=list, blank=True, verbose_name='Permisos')
    is_active = models.BooleanField(default=True, verbose_name='Activo')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')

    class Meta:
        verbose_name = 'Rol'
        verbose_name_plural = 'Roles'
        ordering = ['name']

    def __str__(self):
        return self.get_name_display()
    
    @classmethod
    def get_default_permissions(cls, role_type):
        """Get default permissions for each role type."""
        permissions_map = {
            cls.RoleType.ADMIN: [
                'tenants.*', 'users.*', 'companies.*', 'areas.*',
                'procurement.*', 'quotations.*', 'orders.*',
                'inventory.*', 'invoices.*', 'documents.*', 'notifications.*'
            ],
            cls.RoleType.TESORERIA: [
                'procurement.view', 'quotations.*', 'orders.view',
                'invoices.*', 'documents.*', 'notifications.view',
                'authorizations.*'
            ],
            cls.RoleType.ADQUISICIONES: [
                'procurement.view', 'quotations.*', 'orders.*',
                'providers.*', 'documents.view', 'notifications.view'
            ],
            cls.RoleType.ALMACEN: [
                'orders.view', 'inventory.*', 'invoices.view',
                'documents.view', 'notifications.view'
            ],
            cls.RoleType.AREA: [
                'procurement.create', 'procurement.view_own',
                'inventory.view_own', 'notifications.view_own'
            ],
            cls.RoleType.PROVEEDOR: [
                'quotations.create', 'quotations.view_own',
                'orders.view_own', 'documents.view_own'
            ],
        }
        return permissions_map.get(role_type, [])


class User(AbstractUser):
    """
    Custom User model with role-based access control.
    """
    objects: Any
    DoesNotExist: Any
    
    email = models.EmailField(unique=True, verbose_name='Correo electrónico')
    full_name = models.CharField(max_length=255, blank=True, verbose_name='Nombre completo')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Teléfono')
    
    # Role relationship
    role = models.ForeignKey(
        Role,
        on_delete=models.PROTECT,
        related_name='users',
        null=True,
        blank=True,
        verbose_name='Rol'
    )
    
    # Area and Position
    area = models.ForeignKey(
        'areas.Area',
        on_delete=models.SET_NULL,
        related_name='assigned_users',
        null=True,
        blank=True,
        verbose_name='Área'
    )
    puesto = models.CharField(max_length=100, blank=True, verbose_name='Puesto')
    
    # Profile
    avatar = models.ImageField(
        upload_to='avatars/',
        blank=True,
        null=True,
        verbose_name='Avatar'
    )
    
    # INE verification
    ine_documento = models.FileField(
        upload_to='ine/',
        blank=True,
        null=True,
        verbose_name='Documento INE'
    )
    ine_verificada = models.BooleanField(default=False, verbose_name='INE verificada')
    ine_rechazada = models.BooleanField(default=False, verbose_name='INE rechazada')
    ine_rechazo_motivo = models.TextField(blank=True, verbose_name='Motivo de rechazo de INE')
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')
    last_login_ip = models.GenericIPAddressField(null=True, blank=True, verbose_name='Última IP')
    
    # Settings
    settings = models.JSONField(default=dict, blank=True, verbose_name='Configuración')
    
    # Required for django-tenants to work properly with shared users
    # Users are in the public schema but linked to tenants via their role/area

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['email']

    def __str__(self):
        return self.full_name or self.email

    @property
    def is_admin(self):
        return self.role and self.role.name == Role.RoleType.ADMIN

    @property
    def is_tesoreria(self):
        return self.role and self.role.name == Role.RoleType.TESORERIA

    @property
    def is_adquisiciones(self):
        return self.role and self.role.name == Role.RoleType.ADQUISICIONES

    @property
    def is_almacen(self):
        return self.role and self.role.name == Role.RoleType.ALMACEN

    @property
    def is_area(self):
        return self.role and self.role.name == Role.RoleType.AREA

    @property
    def is_proveedor(self):
        return self.role and self.role.name == Role.RoleType.PROVEEDOR

    def has_permission(self, permission):
        """Check if user has a specific permission."""
        if not self.role:
            return False
        
        # Admin has all permissions
        if self.is_admin:
            return True
        
        permissions = self.role.permissions or []
        
        # Check exact match
        if permission in permissions:
            return True
        
        # Check wildcard permissions (e.g., 'procurement.*')
        permission_parts = permission.split('.')
        if len(permission_parts) >= 1:
            wildcard = f"{permission_parts[0]}.*"
            if wildcard in permissions:
                return True
        
        return False
