#!/usr/bin/env python
"""Script to create initial roles."""

import os
import sys
import django

# Setup Django
sys.path.insert(0, "/app")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.accounts.models import Role

roles_data = [
    ("admin", "Administrador del sistema con acceso total"),
    ("tesoreria", "Gestión de presupuesto y autorizaciones"),
    ("adquisiciones", "Gestión de compras y proveedores"),
    ("almacen", "Control de inventario y entregas"),
    ("area", "Solicitudes de material por área"),
    ("proveedor", "Portal de proveedores externos"),
]

for name, desc in roles_data:
    role, created = Role.objects.get_or_create(
        name=name,
        defaults={
            "description": desc,
            "permissions": Role.get_default_permissions(name),
            "is_active": True,
        },
    )
    status = "Creado" if created else "Ya existe"
    print(f"{status}: {role.name}")

print("\nRoles creados exitosamente!")
