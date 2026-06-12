#!/usr/bin/env python
"""Script para crear datos de prueba: Áreas y Proveedores."""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.areas.models import Area
from apps.companies.models import Company, Proveedor

# Primero obtener o crear una empresa por defecto
company, created = Company.objects.get_or_create(
    rfc="GAS260124ABC",
    defaults={
        "razon_social": "Gastos Distribuidos SA de CV",
        "nombre_comercial": "Gastos Dist.",
        "calle": "Av. Reforma",
        "numero_exterior": "100",
        "colonia": "Centro",
        "municipio": "Ciudad de Mexico",
        "estado": "CDMX",
        "codigo_postal": "06000",
        "is_active": True,
    },
)
if created:
    print(f"[+] Empresa creada: {company.razon_social}")
else:
    print(f"[=] Empresa ya existe: {company.razon_social}")

# Crear 3 Áreas de prueba
areas_data = [
    {
        "code": "SISTEMAS",
        "name": "Sistemas e Informatica",
        "description": "Departamento de tecnologias de la informacion",
        "presupuesto_anual": 500000.00,
    },
    {
        "code": "RRHH",
        "name": "Recursos Humanos",
        "description": "Departamento de gestion de personal",
        "presupuesto_anual": 300000.00,
    },
    {
        "code": "CONTAB",
        "name": "Contabilidad",
        "description": "Departamento de contabilidad y finanzas",
        "presupuesto_anual": 250000.00,
    },
]

print("\n--- Creando Areas ---")
for a in areas_data:
    area, created = Area.objects.get_or_create(
        company=company,
        code=a["code"],
        defaults={
            "name": a["name"],
            "description": a["description"],
            "presupuesto_anual": a["presupuesto_anual"],
            "is_active": True,
        },
    )
    if created:
        print(f"[+] Area creada: {a['name']} ({a['code']})")
    else:
        print(f"[=] Area ya existe: {a['name']} ({a['code']})")

# Crear 3 Proveedores de prueba
proveedores_data = [
    {
        "rfc": "PAP241201ABC",
        "razon_social": "Papeleria El Lapiz SA de CV",
        "nombre_comercial": "Papeleria El Lapiz",
        "contacto_nombre": "Juan Perez",
        "contacto_email": "ventas@papelerialapiz.com",
        "contacto_telefono": "5512345678",
        "direccion": "Calle Papel 123, Col. Centro, CDMX 06000",
        "estado": "activo",
    },
    {
        "rfc": "COM241201XYZ",
        "razon_social": "Computo y Tecnologia SA de CV",
        "nombre_comercial": "CompuTec",
        "contacto_nombre": "Maria Garcia",
        "contacto_email": "contacto@computec.mx",
        "contacto_telefono": "5598765432",
        "direccion": "Av. Tecnologia 456, Col. Industrial, CDMX 06500",
        "estado": "activo",
    },
    {
        "rfc": "LIM241201DEF",
        "razon_social": "Limpieza Total SA de CV",
        "nombre_comercial": "LimpioTodo",
        "contacto_nombre": "Roberto Sanchez",
        "contacto_email": "ventas@limpiezatotal.mx",
        "contacto_telefono": "5511223344",
        "direccion": "Calle Jabon 789, Col. Limpia, CDMX 07000",
        "estado": "activo",
    },
]

print("\n--- Creando Proveedores ---")
for p in proveedores_data:
    proveedor, created = Proveedor.objects.get_or_create(
        rfc=p["rfc"],
        defaults={
            "razon_social": p["razon_social"],
            "nombre_comercial": p["nombre_comercial"],
            "contacto_nombre": p["contacto_nombre"],
            "contacto_email": p["contacto_email"],
            "contacto_telefono": p["contacto_telefono"],
            "direccion": p["direccion"],
            "estado": p["estado"],
        },
    )
    if created:
        print(f"[+] Proveedor creado: {p['razon_social']}")
    else:
        print(f"[=] Proveedor ya existe: {p['razon_social']}")

print("\n--- Datos de prueba listos ---")
