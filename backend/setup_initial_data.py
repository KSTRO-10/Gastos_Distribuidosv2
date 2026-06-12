#!/usr/bin/env python
"""
Script para crear datos iniciales del sistema.
"""
import os
import django
from django.conf import settings
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

# Setup Django
django.setup()

from django.core.management import call_command

from apps.accounts.models import Role, User
from apps.companies.models import Company


def can_use_tenants():
    """Determina si el entorno actual tiene soporte de tenants activo y tabla creada."""
    if not hasattr(settings, 'TENANT_MODEL'):
        return False

    installed_apps = getattr(settings, 'INSTALLED_APPS', [])
    if 'apps.tenants' not in installed_apps:
        return False

    try:
        return 'tenants_tenant' in connection.introspection.table_names()
    except Exception:
        return False

def create_roles():
    """Crear roles del sistema."""
    roles = [
        ('admin', 'Administrador del Sistema'),
        ('tesoreria', 'Tesorería'),
        ('adquisiciones', 'Adquisiciones'),
        ('almacen', 'Almacén'),
        ('area', 'Área Solicitante'),
        ('proveedor', 'Proveedor'),
    ]
    for code, description in roles:
        role, created = Role.objects.get_or_create(
            name=code,
            defaults={'description': description}
        )
        status = 'creado' if created else 'ya existe'
        print(f'  Rol [{code}]: {status}')

def create_superuser():
    """Crear superusuario admin."""
    if User.objects.filter(username='admin').exists():
        print('  Superusuario admin ya existe')
        return
    
    admin_role = Role.objects.get(name='admin')
    user = User.objects.create_superuser(
        username='admin',
        email='admin@gastos.local',
        password='admin123',
        first_name='Administrador',
        last_name='Sistema',
        role=admin_role
    )
    print(f'  Superusuario creado: {user.username} / admin123')

def create_company():
    """Crear empresa de demo."""
    if Company.objects.filter(rfc='DEMO010101ABC').exists():
        print('  Empresa demo ya existe')
        return
    
    admin_user = User.objects.filter(username='admin').first()
    company = Company.objects.create(
        rfc='DEMO010101ABC',
        razon_social='Empresa Demo S.A. de C.V.',
        nombre_comercial='Empresa Demo',
        email='contacto@demo.com',
        telefono='555-1234',
        is_active=True,
        created_by=admin_user
    )
    print(f'  Empresa creada: {company.razon_social} (ID: {company.id})')


def create_tenant():
    """Crear tenant de desarrollo."""
    if not can_use_tenants():
        print('  Tenants no activo en este entorno, se omite creación de tenant')
        return

    from apps.tenants.models import Tenant

    tenant, created = Tenant.objects.get_or_create(
        schema_name='public',
        defaults={
            'name': 'Organización Demo',
            'rfc': 'XAXX010101000',
            'is_active': True
        }
    )
    status = 'creado' if created else 'ya existe'
    print(f'  Tenant [{tenant.schema_name}]: {status}')


if __name__ == '__main__':
    print('=' * 50)
    print('Configuración Inicial - Gastos Distribuidos')
    print('=' * 50)
    
    print('\n1. Creando roles...')
    create_roles()
    
    print('\n2. Creando superusuario...')
    create_superuser()
    
    print('\n3. Creando empresa demo...')
    create_company()
    
    print('\n4. Creando tenant de desarrollo...')
    create_tenant()
    
    print('\n5. Cargando catálogo COG...')
    try:
        call_command('load_cog')
    except Exception as e:
        print(f'  ⚠ No se pudo cargar COG: {e}')
    
    print('\n' + '=' * 50)
    print('¡Configuración completada!')
    print('=' * 50)
    print('\nCredenciales de acceso:')
    print('  Usuario: admin')
    print('  Contraseña: admin123')
    print('  Email: admin@gastos.local')
