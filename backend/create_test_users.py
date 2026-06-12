#!/usr/bin/env python
"""Script para crear usuarios de prueba para cada rol."""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.accounts.models import User, Role


# Primero asegurarse de que existan los roles
def get_or_create_role(role_name):
    role, created = Role.objects.get_or_create(
        name=role_name,
        defaults={
            "description": f"Rol de {role_name}",
            "permissions": Role.get_default_permissions(role_name),
            "is_active": True,
        },
    )
    if created:
        print(f"[+] Rol creado: {role_name}")
    return role


# Datos de usuarios de prueba por rol (3 por cada rol)
usuarios = [
    # Tesorería
    {
        "email": "tesoreria1@gastos.local",
        "username": "tesoreria1",
        "first_name": "Maria",
        "last_name": "Gonzalez",
        "role": "tesoreria",
    },
    {
        "email": "tesoreria2@gastos.local",
        "username": "tesoreria2",
        "first_name": "Ana",
        "last_name": "Lopez",
        "role": "tesoreria",
    },
    {
        "email": "tesoreria3@gastos.local",
        "username": "tesoreria3",
        "first_name": "Sofia",
        "last_name": "Torres",
        "role": "tesoreria",
    },
    # Adquisiciones
    {
        "email": "adquisiciones1@gastos.local",
        "username": "adquisiciones1",
        "first_name": "Carlos",
        "last_name": "Ramirez",
        "role": "adquisiciones",
    },
    {
        "email": "adquisiciones2@gastos.local",
        "username": "adquisiciones2",
        "first_name": "Jorge",
        "last_name": "Mendez",
        "role": "adquisiciones",
    },
    {
        "email": "adquisiciones3@gastos.local",
        "username": "adquisiciones3",
        "first_name": "Luis",
        "last_name": "Vargas",
        "role": "adquisiciones",
    },
    # Almacén
    {
        "email": "almacen1@gastos.local",
        "username": "almacen1",
        "first_name": "Pedro",
        "last_name": "Hernandez",
        "role": "almacen",
    },
    {
        "email": "almacen2@gastos.local",
        "username": "almacen2",
        "first_name": "Miguel",
        "last_name": "Castro",
        "role": "almacen",
    },
    {
        "email": "almacen3@gastos.local",
        "username": "almacen3",
        "first_name": "Juan",
        "last_name": "Ortiz",
        "role": "almacen",
    },
    # Área
    {
        "email": "area1@gastos.local",
        "username": "area1",
        "first_name": "Laura",
        "last_name": "Martinez",
        "role": "area",
    },
    {
        "email": "area2@gastos.local",
        "username": "area2",
        "first_name": "Patricia",
        "last_name": "Flores",
        "role": "area",
    },
    {
        "email": "area3@gastos.local",
        "username": "area3",
        "first_name": "Carmen",
        "last_name": "Reyes",
        "role": "area",
    },
    # Proveedor
    {
        "email": "proveedor1@gastos.local",
        "username": "proveedor1",
        "first_name": "Roberto",
        "last_name": "Sanchez",
        "role": "proveedor",
    },
    {
        "email": "proveedor2@gastos.local",
        "username": "proveedor2",
        "first_name": "Fernando",
        "last_name": "Ruiz",
        "role": "proveedor",
    },
    {
        "email": "proveedor3@gastos.local",
        "username": "proveedor3",
        "first_name": "Ricardo",
        "last_name": "Morales",
        "role": "proveedor",
    },
]

password = "test123"

for u in usuarios:
    # Obtener o crear el rol
    role = get_or_create_role(u["role"])

    user, created = User.objects.get_or_create(
        email=u["email"],
        defaults={
            "username": u["username"],
            "first_name": u["first_name"],
            "last_name": u["last_name"],
            "role": role,
            "is_active": True,
        },
    )
    if created:
        user.set_password(password)
        user.save()
        print(f"[+] Creado: {u['email']} ({u['role']})")
    else:
        print(f"[=] Ya existe: {u['email']} ({u['role']})")

print("\n--- Usuarios de prueba listos ---")
print(f"Contrasena para todos: {password}")
