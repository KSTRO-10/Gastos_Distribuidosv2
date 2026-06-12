"""
Script to populate demo data for dashboard visualization.
Run with: python manage.py shell < scripts/populate_demo_data.py
"""

import os
import django
from decimal import Decimal
from datetime import datetime, timedelta
import random

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from django.utils import timezone
from apps.areas.models import Area
from apps.companies.models import Company, Proveedor
from apps.procurement.models import SolicitudMaterial
from apps.invoices.models import Factura, DistribucionGasto
from apps.accounts.models import User

print("=== Poblando datos de demostración ===\n")

# 1. Asegurar que las áreas tengan presupuesto
print("1. Actualizando presupuestos de áreas...")
areas = Area.objects.all()

presupuestos = {
    "Contabilidad": Decimal("250000"),
    "Recursos Humanos": Decimal("300000"),
    "Sistemas e Informatica": Decimal("500000"),
    "Sistemas e Informática": Decimal("500000"),
    "Area Test": Decimal("100000"),
    "Área Test": Decimal("100000"),
}

for area in areas:
    if area.presupuesto_anual == 0:
        # Buscar en diccionario o asignar aleatorio
        presupuesto = presupuestos.get(
            area.name, Decimal(random.randint(100000, 400000))
        )
        area.presupuesto_anual = presupuesto
        area.save()
        print(f"   - {area.name}: ${presupuesto:,.2f}")

# 2. Obtener o crear empresa y proveedor
print("\n2. Verificando empresa y proveedor...")
company = Company.objects.first()
if not company:
    company = Company.objects.create(
        rfc="XAXX010101000",
        razon_social="Empresa Demo S.A. de C.V.",
        nombre_comercial="Empresa Demo",
    )
    print(f"   - Empresa creada: {company.razon_social}")

proveedor = Proveedor.objects.filter(estado="activo").first()
if not proveedor:
    proveedor = Proveedor.objects.first()
    if proveedor:
        proveedor.estado = "activo"
        proveedor.save()
        print(f"   - Proveedor activado: {proveedor.razon_social}")

# 3. Obtener usuario admin
admin_user = User.objects.filter(role__name="admin").first()
if not admin_user:
    admin_user = User.objects.first()
print(f"   - Usuario admin: {admin_user.email if admin_user else 'No encontrado'}")

# 4. Crear distribuciones de gastos para simular actividad
print("\n3. Creando distribuciones de gastos (simulando actividad)...")

# Verificar si ya hay distribuciones
existing = DistribucionGasto.objects.count()
if existing > 5:
    print(f"   - Ya existen {existing} distribuciones, omitiendo...")
else:
    today = timezone.now()

    for area in areas[:4]:  # Solo las primeras 4 áreas
        # Crear facturas y distribuciones para los últimos 6 meses
        for month_offset in range(6):
            date = today - timedelta(days=30 * month_offset)

            # Crear 1-3 facturas por mes por área
            num_facturas = random.randint(1, 3)
            for _ in range(num_facturas):
                # Obtener o crear factura
                factura_total = Decimal(random.randint(5000, 30000))

                factura, created = Factura.objects.get_or_create(
                    uuid_cfdi=f"DEMO-{area.id}-{month_offset}-{random.randint(1000, 9999)}",
                    defaults={
                        "folio": f"F-{random.randint(1000, 9999)}",
                        "proveedor": proveedor,
                        "subtotal": factura_total * Decimal("0.86"),
                        "iva": factura_total * Decimal("0.16"),
                        "total": factura_total,
                        "fecha_emision": date.date(),
                        "status": "distribuida",
                        "uploaded_by": admin_user,
                    },
                )

                if created:
                    # Crear distribución del gasto
                    DistribucionGasto.objects.create(
                        factura=factura,
                        area=area,
                        monto=factura_total,
                        porcentaje=Decimal("100"),
                        concepto=f"Gasto operativo - {area.name}",
                        created_by=admin_user,
                    )
                    # Ajustar created_at para que aparezca en el mes correcto
                    DistribucionGasto.objects.filter(factura=factura).update(
                        created_at=date
                    )
                    Factura.objects.filter(id=factura.id).update(created_at=date)

        print(f"   - {area.name}: Distribuciones creadas")

# 5. Crear algunas solicitudes recientes si no hay
print("\n4. Verificando solicitudes recientes...")
solicitudes = SolicitudMaterial.objects.count()
if solicitudes < 5:
    print("   - Creando solicitudes de demostración...")
    for i, area in enumerate(areas[:3]):
        sol = SolicitudMaterial.objects.create(
            numero=f"SOL-{datetime.now().year}-{i+100:04d}",
            area=area,
            descripcion=f"Solicitud de materiales para {area.name}",
            justificacion="Necesidad operativa del área",
            fecha_solicitud=timezone.now().date(),
            fecha_requerida=(timezone.now() + timedelta(days=15)).date(),
            estado="enviado",
            created_by=admin_user,
        )
        sol.total_estimado = Decimal(random.randint(10000, 50000))
        sol.save()
        print(f"   - {sol.numero}: ${sol.total_estimado:,.2f}")
else:
    print(f"   - Ya existen {solicitudes} solicitudes")

print("\n=== Datos de demostración creados exitosamente ===")
print("\nRecarga el dashboard para ver los cambios.")
