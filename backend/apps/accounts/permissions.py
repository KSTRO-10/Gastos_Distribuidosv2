"""
Custom permissions for role-based access control.
"""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """
    Allows access only to admin users.
    """
    message = 'Se requiere rol de Administrador.'
    
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsTesoreria(BasePermission):
    """
    Allows access only to tesoreria users.
    """
    message = 'Se requiere rol de Tesorería.'
    
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_admin or request.user.is_tesoreria)
        )


class IsAdquisiciones(BasePermission):
    """
    Allows access only to adquisiciones users.
    """
    message = 'Se requiere rol de Adquisiciones.'
    
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_admin or request.user.is_adquisiciones)
        )


class IsAlmacen(BasePermission):
    """
    Allows access only to almacen users.
    """
    message = 'Se requiere rol de Almacén.'
    
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_admin or request.user.is_almacen)
        )


class IsArea(BasePermission):
    """
    Allows access only to area users.
    """
    message = 'Se requiere rol de Área.'
    
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_admin or request.user.is_area)
        )


class IsProveedor(BasePermission):
    """
    Allows access only to proveedor users.
    """
    message = 'Se requiere rol de Proveedor.'
    
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            (request.user.is_admin or request.user.is_proveedor)
        )


class HasPermission(BasePermission):
    """
    Generic permission class that checks for specific permissions.
    Use as: permission_classes = [HasPermission('procurement.create')]
    """
    
    def __init__(self, permission_name):
        self.permission_name = permission_name
    
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.has_permission(self.permission_name)
        )


def permission_required(permission_name):
    """
    Factory function to create permission class with specific permission.
    Usage: permission_classes = [permission_required('procurement.create')]
    """
    class PermissionRequired(BasePermission):
        message = f'Se requiere permiso: {permission_name}'
        
        def has_permission(self, request, view):
            return bool(
                request.user and 
                request.user.is_authenticated and 
                request.user.has_permission(permission_name)
            )
    
    return PermissionRequired
