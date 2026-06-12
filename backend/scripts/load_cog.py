"""
⚠️  DEPRECADO - Este script ha sido reemplazado por un management command.

Usar en su lugar:
    python manage.py load_cog                           # Carga desde backend/data/catalogo_cog.csv
    python manage.py load_cog --file ruta/al/archivo.csv  # CSV personalizado
    python manage.py load_cog --dry-run                 # Simula sin escribir

Este archivo se conserva solo como referencia histórica.
Los datos del catálogo COG ahora se mantienen en: backend/data/catalogo_cog.csv
"""

import warnings

warnings.warn(
    "Este script está deprecado. Usa: python manage.py load_cog",
    DeprecationWarning,
    stacklevel=1,
)

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.procurement.models import Cog

# Catálogo COG básico para empresas
# Basado en el Clasificador por Objeto del Gasto mexicano (simplificado)
COGS = [
    # Capítulo 2000 - Materiales y Suministros
    {
        "codigo": "2100",
        "descripcion": "Materiales de administración, emisión de documentos y artículos oficiales",
        "capitulo": "2000",
        "concepto": "2100",
    },
    {
        "codigo": "2110",
        "descripcion": "Materiales y útiles de oficina",
        "capitulo": "2000",
        "concepto": "2100",
        "partida_generica": "2110",
    },
    {
        "codigo": "2120",
        "descripcion": "Materiales y útiles de impresión y reproducción",
        "capitulo": "2000",
        "concepto": "2100",
        "partida_generica": "2120",
    },
    {
        "codigo": "2140",
        "descripcion": "Materiales y útiles de tecnologías de información",
        "capitulo": "2000",
        "concepto": "2100",
        "partida_generica": "2140",
    },
    {
        "codigo": "2200",
        "descripcion": "Alimentos y utensilios",
        "capitulo": "2000",
        "concepto": "2200",
    },
    {
        "codigo": "2210",
        "descripcion": "Productos alimenticios para personas",
        "capitulo": "2000",
        "concepto": "2200",
        "partida_generica": "2210",
    },
    {
        "codigo": "2400",
        "descripcion": "Materiales y artículos de construcción y reparación",
        "capitulo": "2000",
        "concepto": "2400",
    },
    {
        "codigo": "2410",
        "descripcion": "Productos minerales no metálicos",
        "capitulo": "2000",
        "concepto": "2400",
        "partida_generica": "2410",
    },
    {
        "codigo": "2420",
        "descripcion": "Cemento y productos de concreto",
        "capitulo": "2000",
        "concepto": "2400",
        "partida_generica": "2420",
    },
    {
        "codigo": "2460",
        "descripcion": "Material eléctrico y electrónico",
        "capitulo": "2000",
        "concepto": "2400",
        "partida_generica": "2460",
    },
    {
        "codigo": "2470",
        "descripcion": "Artículos metálicos para la construcción",
        "capitulo": "2000",
        "concepto": "2400",
        "partida_generica": "2470",
    },
    {
        "codigo": "2500",
        "descripcion": "Productos químicos, farmacéuticos y de laboratorio",
        "capitulo": "2000",
        "concepto": "2500",
    },
    {
        "codigo": "2510",
        "descripcion": "Productos químicos básicos",
        "capitulo": "2000",
        "concepto": "2500",
        "partida_generica": "2510",
    },
    {
        "codigo": "2530",
        "descripcion": "Medicinas y productos farmacéuticos",
        "capitulo": "2000",
        "concepto": "2500",
        "partida_generica": "2530",
    },
    {
        "codigo": "2540",
        "descripcion": "Materiales y accesorios y suministros médicos",
        "capitulo": "2000",
        "concepto": "2500",
        "partida_generica": "2540",
    },
    {
        "codigo": "2550",
        "descripcion": "Materiales y accesorios y suministros de laboratorio",
        "capitulo": "2000",
        "concepto": "2500",
        "partida_generica": "2550",
    },
    {
        "codigo": "2600",
        "descripcion": "Combustibles, lubricantes y aditivos",
        "capitulo": "2000",
        "concepto": "2600",
    },
    {
        "codigo": "2610",
        "descripcion": "Combustibles y lubricantes",
        "capitulo": "2000",
        "concepto": "2600",
        "partida_generica": "2610",
    },
    {
        "codigo": "2700",
        "descripcion": "Vestuario, blancos, prendas de protección y artículos deportivos",
        "capitulo": "2000",
        "concepto": "2700",
    },
    {
        "codigo": "2710",
        "descripcion": "Vestuario y uniformes",
        "capitulo": "2000",
        "concepto": "2700",
        "partida_generica": "2710",
    },
    {
        "codigo": "2720",
        "descripcion": "Prendas de seguridad y protección personal",
        "capitulo": "2000",
        "concepto": "2700",
        "partida_generica": "2720",
    },
    {
        "codigo": "2900",
        "descripcion": "Herramientas, refacciones y accesorios menores",
        "capitulo": "2000",
        "concepto": "2900",
    },
    {
        "codigo": "2910",
        "descripcion": "Herramientas menores",
        "capitulo": "2000",
        "concepto": "2900",
        "partida_generica": "2910",
    },
    {
        "codigo": "2940",
        "descripcion": "Refacciones y accesorios menores de equipo de cómputo",
        "capitulo": "2000",
        "concepto": "2900",
        "partida_generica": "2940",
    },
    {
        "codigo": "2960",
        "descripcion": "Refacciones y accesorios menores de equipo de transporte",
        "capitulo": "2000",
        "concepto": "2900",
        "partida_generica": "2960",
    },
    # Capítulo 3000 - Servicios Generales
    {
        "codigo": "3100",
        "descripcion": "Servicios básicos",
        "capitulo": "3000",
        "concepto": "3100",
    },
    {
        "codigo": "3110",
        "descripcion": "Energía eléctrica",
        "capitulo": "3000",
        "concepto": "3100",
        "partida_generica": "3110",
    },
    {
        "codigo": "3120",
        "descripcion": "Gas",
        "capitulo": "3000",
        "concepto": "3100",
        "partida_generica": "3120",
    },
    {
        "codigo": "3130",
        "descripcion": "Agua",
        "capitulo": "3000",
        "concepto": "3100",
        "partida_generica": "3130",
    },
    {
        "codigo": "3140",
        "descripcion": "Telefonía tradicional",
        "capitulo": "3000",
        "concepto": "3100",
        "partida_generica": "3140",
    },
    {
        "codigo": "3150",
        "descripcion": "Telefonía celular",
        "capitulo": "3000",
        "concepto": "3100",
        "partida_generica": "3150",
    },
    {
        "codigo": "3170",
        "descripcion": "Servicios de acceso a internet",
        "capitulo": "3000",
        "concepto": "3100",
        "partida_generica": "3170",
    },
    {
        "codigo": "3200",
        "descripcion": "Servicios de arrendamiento",
        "capitulo": "3000",
        "concepto": "3200",
    },
    {
        "codigo": "3210",
        "descripcion": "Arrendamiento de terrenos",
        "capitulo": "3000",
        "concepto": "3200",
        "partida_generica": "3210",
    },
    {
        "codigo": "3220",
        "descripcion": "Arrendamiento de edificios",
        "capitulo": "3000",
        "concepto": "3200",
        "partida_generica": "3220",
    },
    {
        "codigo": "3250",
        "descripcion": "Arrendamiento de equipo de transporte",
        "capitulo": "3000",
        "concepto": "3200",
        "partida_generica": "3250",
    },
    {
        "codigo": "3300",
        "descripcion": "Servicios profesionales, científicos y técnicos",
        "capitulo": "3000",
        "concepto": "3300",
    },
    {
        "codigo": "3310",
        "descripcion": "Servicios legales, contabilidad y auditoría",
        "capitulo": "3000",
        "concepto": "3300",
        "partida_generica": "3310",
    },
    {
        "codigo": "3320",
        "descripcion": "Servicios de diseño, arquitectura e ingeniería",
        "capitulo": "3000",
        "concepto": "3300",
        "partida_generica": "3320",
    },
    {
        "codigo": "3330",
        "descripcion": "Servicios de consultoría y asesoría",
        "capitulo": "3000",
        "concepto": "3300",
        "partida_generica": "3330",
    },
    {
        "codigo": "3340",
        "descripcion": "Servicios de capacitación",
        "capitulo": "3000",
        "concepto": "3300",
        "partida_generica": "3340",
    },
    {
        "codigo": "3500",
        "descripcion": "Servicios de instalación, reparación y mantenimiento",
        "capitulo": "3000",
        "concepto": "3500",
    },
    {
        "codigo": "3510",
        "descripcion": "Conservación y mantenimiento de inmuebles",
        "capitulo": "3000",
        "concepto": "3500",
        "partida_generica": "3510",
    },
    {
        "codigo": "3520",
        "descripcion": "Instalación, reparación y mantenimiento de mobiliario",
        "capitulo": "3000",
        "concepto": "3500",
        "partida_generica": "3520",
    },
    {
        "codigo": "3530",
        "descripcion": "Instalación, reparación y mantenimiento de equipo de cómputo",
        "capitulo": "3000",
        "concepto": "3500",
        "partida_generica": "3530",
    },
    {
        "codigo": "3550",
        "descripcion": "Reparación y mantenimiento de equipo de transporte",
        "capitulo": "3000",
        "concepto": "3500",
        "partida_generica": "3550",
    },
    {
        "codigo": "3700",
        "descripcion": "Servicios de traslado y viáticos",
        "capitulo": "3000",
        "concepto": "3700",
    },
    {
        "codigo": "3710",
        "descripcion": "Pasajes aéreos",
        "capitulo": "3000",
        "concepto": "3700",
        "partida_generica": "3710",
    },
    {
        "codigo": "3720",
        "descripcion": "Pasajes terrestres",
        "capitulo": "3000",
        "concepto": "3700",
        "partida_generica": "3720",
    },
    {
        "codigo": "3750",
        "descripcion": "Viáticos en el país",
        "capitulo": "3000",
        "concepto": "3700",
        "partida_generica": "3750",
    },
    {
        "codigo": "3800",
        "descripcion": "Servicios oficiales",
        "capitulo": "3000",
        "concepto": "3800",
    },
    {
        "codigo": "3820",
        "descripcion": "Gastos de orden social y cultural",
        "capitulo": "3000",
        "concepto": "3800",
        "partida_generica": "3820",
    },
    # Capítulo 5000 - Bienes Muebles, Inmuebles e Intangibles
    {
        "codigo": "5100",
        "descripcion": "Mobiliario y equipo de administración",
        "capitulo": "5000",
        "concepto": "5100",
    },
    {
        "codigo": "5110",
        "descripcion": "Muebles de oficina y estantería",
        "capitulo": "5000",
        "concepto": "5100",
        "partida_generica": "5110",
    },
    {
        "codigo": "5150",
        "descripcion": "Equipo de cómputo y tecnologías de información",
        "capitulo": "5000",
        "concepto": "5100",
        "partida_generica": "5150",
    },
    {
        "codigo": "5200",
        "descripcion": "Mobiliario y equipo educacional y recreativo",
        "capitulo": "5000",
        "concepto": "5200",
    },
    {
        "codigo": "5210",
        "descripcion": "Equipos y aparatos audiovisuales",
        "capitulo": "5000",
        "concepto": "5200",
        "partida_generica": "5210",
    },
    {
        "codigo": "5400",
        "descripcion": "Vehículos y equipo de transporte",
        "capitulo": "5000",
        "concepto": "5400",
    },
    {
        "codigo": "5410",
        "descripcion": "Automóviles y camiones",
        "capitulo": "5000",
        "concepto": "5400",
        "partida_generica": "5410",
    },
    {
        "codigo": "5900",
        "descripcion": "Activos intangibles",
        "capitulo": "5000",
        "concepto": "5900",
    },
    {
        "codigo": "5910",
        "descripcion": "Software",
        "capitulo": "5000",
        "concepto": "5900",
        "partida_generica": "5910",
    },
    {
        "codigo": "5920",
        "descripcion": "Patentes, marcas y derechos",
        "capitulo": "5000",
        "concepto": "5900",
        "partida_generica": "5920",
    },
    {
        "codigo": "5970",
        "descripcion": "Licencias informáticas e intelectuales",
        "capitulo": "5000",
        "concepto": "5900",
        "partida_generica": "5970",
    },
]


def load_cogs():
    created = 0
    updated = 0

    for cog_data in COGS:
        cog, was_created = Cog.objects.update_or_create(
            codigo=cog_data["codigo"],
            defaults={
                "descripcion": cog_data["descripcion"],
                "capitulo": cog_data.get("capitulo", ""),
                "concepto": cog_data.get("concepto", ""),
                "partida_generica": cog_data.get("partida_generica", ""),
                "partida_especifica": cog_data.get("partida_especifica", ""),
                "is_active": True,
            },
        )
        if was_created:
            created += 1
        else:
            updated += 1

    print(f"✅ COGs cargados: {created} nuevos, {updated} actualizados")
    print(f"📊 Total en base de datos: {Cog.objects.count()}")


if __name__ == "__main__":
    load_cogs()
