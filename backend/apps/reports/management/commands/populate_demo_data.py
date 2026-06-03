"""
Management command to populate demo data for dashboard visualization.
Usage: python manage.py populate_demo_data
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
import random

from apps.areas.models import Area
from apps.companies.models import Company, Proveedor
from apps.procurement.models import SolicitudMaterial
from apps.invoices.models import Factura, DistribucionGasto
from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Populates demo data for dashboard visualization'

    def handle(self, *args, **options):
        self.stdout.write("=== Poblando datos de demostración ===\n")

        # 1. Actualizar presupuestos de áreas
        self.stdout.write("1. Actualizando presupuestos de áreas...")
        areas = Area.objects.all()

        presupuestos = {
            'Contabilidad': Decimal('250000'),
            'Recursos Humanos': Decimal('300000'),
            'Sistemas e Informatica': Decimal('500000'),
            'Sistemas e Informática': Decimal('500000'),
            'Area Test': Decimal('100000'),
            'Área Test': Decimal('100000'),
        }

        for area in areas:
            if area.presupuesto_anual == 0:
                presupuesto = presupuestos.get(area.name, Decimal(random.randint(100000, 400000)))
                area.presupuesto_anual = presupuesto
                area.save()
                self.stdout.write(f"   - {area.name}: ${presupuesto:,.2f}")

        # 2. Obtener proveedor
        self.stdout.write("\n2. Verificando proveedor...")
        proveedor = Proveedor.objects.filter(estado='activo').first()
        if not proveedor:
            proveedor = Proveedor.objects.first()
            if proveedor:
                proveedor.estado = 'activo'
                proveedor.save()
                self.stdout.write(f"   - Proveedor activado: {proveedor.razon_social}")

        # 3. Obtener usuario admin
        admin_user = User.objects.filter(role__name='admin').first()
        if not admin_user:
            admin_user = User.objects.first()

        # 4. Crear distribuciones de gastos
        self.stdout.write("\n3. Creando distribuciones de gastos...")

        existing = DistribucionGasto.objects.count()
        if existing > 5:
            self.stdout.write(f"   - Ya existen {existing} distribuciones, omitiendo...")
        else:
            today = timezone.now()
            
            for area in areas[:4]:
                for month_offset in range(6):
                    date = today - timedelta(days=30 * month_offset)
                    
                    num_facturas = random.randint(1, 3)
                    for _ in range(num_facturas):
                        factura_total = Decimal(random.randint(5000, 30000))
                        
                        try:
                            factura, created = Factura.objects.get_or_create(
                                uuid_cfdi=f"DEMO-{area.id}-{month_offset}-{random.randint(1000, 9999)}",
                                defaults={
                                    'folio': f"F-{random.randint(1000, 9999)}",
                                    'proveedor': proveedor,
                                    'subtotal': factura_total * Decimal('0.86'),
                                    'iva': factura_total * Decimal('0.16'),
                                    'total': factura_total,
                                    'fecha_emision': date.date(),
                                    'status': 'distribuida',
                                    'uploaded_by': admin_user,
                                }
                            )
                            
                            if created:
                                DistribucionGasto.objects.create(
                                    factura=factura,
                                    area=area,
                                    monto=factura_total,
                                    porcentaje=Decimal('100'),
                                    concepto=f"Gasto operativo - {area.name}",
                                    created_by=admin_user,
                                )
                                DistribucionGasto.objects.filter(factura=factura).update(created_at=date)
                                Factura.objects.filter(id=factura.id).update(created_at=date)
                        except Exception as e:
                            self.stdout.write(f"   - Error: {e}")
                            
                self.stdout.write(f"   - {area.name}: Distribuciones creadas")

        # 5. Crear solicitudes recientes
        self.stdout.write("\n4. Verificando solicitudes...")
        solicitudes = SolicitudMaterial.objects.count()
        if solicitudes < 5:
            for i, area in enumerate(areas[:3]):
                try:
                    sol = SolicitudMaterial.objects.create(
                        numero=f"SOL-{timezone.now().year}-{i+100:04d}",
                        area=area,
                        descripcion=f"Solicitud de materiales para {area.name}",
                        justificacion="Necesidad operativa del área",
                        fecha_solicitud=timezone.now().date(),
                        fecha_requerida=(timezone.now() + timedelta(days=15)).date(),
                        estado='enviado',
                        created_by=admin_user,
                    )
                    sol.total_estimado = Decimal(random.randint(10000, 50000))
                    sol.save()
                    self.stdout.write(f"   - {sol.numero}: ${sol.total_estimado:,.2f}")
                except Exception as e:
                    self.stdout.write(f"   - Error: {e}")

        self.stdout.write(self.style.SUCCESS("\n=== Datos de demostración creados ==="))
        self.stdout.write("Recarga el dashboard para ver los cambios.")
