import random
from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from faker import Faker

from apps.accounts.models import User, Role
from apps.companies.models import Proveedor, Company
from apps.areas.models import Area
from apps.procurement.models import Cog, SolicitudMaterial, DetalleMaterial
from apps.quotations.models import CotizacionMaterial, CotizacionDetalle
from apps.orders.models import (
    SolicitudAutorizacion,
    AutorizacionPresupuestal,
    OrdenCompra,
    DetalleOrden,
)

fake = Faker("es_MX")


class Command(BaseCommand):
    help = "Poblamiento masivo del módulo de compras (Stress Test E2E)"

    def handle(self, *args, **kwargs):
        self.stdout.write("Iniciando seeder masivo. Esto puede tomar un momento...")

        with transaction.atomic():
            self._crear_cogs()
            self._crear_areas(50)
            self._crear_usuarios(200)
            self._crear_proveedores(300)
            self._generar_flujo_compras(1000)

        self.stdout.write(self.style.SUCCESS("✅ Seeder completado con éxito."))

    def _crear_cogs(self):
        cogs = [
            {
                "codigo": "21100001",
                "descripcion": "Materiales, útiles y equipos menores de oficina",
            },
            {
                "codigo": "21200001",
                "descripcion": "Materiales y útiles de impresión y reproducción",
            },
            {
                "codigo": "21400001",
                "descripcion": "Materiales, útiles y equipos menores de tecnologías",
            },
            {"codigo": "21600001", "descripcion": "Material de limpieza"},
            {
                "codigo": "22100001",
                "descripcion": "Productos alimenticios para personas",
            },
            {"codigo": "24600001", "descripcion": "Material eléctrico y electrónico"},
            {
                "codigo": "26100001",
                "descripcion": "Combustibles, lubricantes y aditivos",
            },
            {"codigo": "27100001", "descripcion": "Vestuario y uniformes"},
        ]
        creados = 0
        for c in cogs:
            obj, created = Cog.objects.get_or_create(
                codigo=c["codigo"],
                defaults={"descripcion": c["descripcion"], "is_active": True},
            )
            if created:
                creados += 1
        if creados > 0:
            self.stdout.write(f"Creadas {creados} partidas COG.")

    def _crear_areas(self, count):
        existentes = Area.objects.count()
        if existentes >= count:
            return

        company, _ = Company.objects.get_or_create(
            razon_social="Empresa Matriz SA de CV",
            defaults={"rfc": "MATR010101XYZ", "is_active": True},
        )

        areas_a_crear = []
        for _ in range(count - existentes):
            areas_a_crear.append(
                Area(
                    company=company,
                    code=f"AR-{fake.unique.random_int(min=10000, max=99999)}",
                    name=f"Área {fake.company()} {fake.unique.random_int(1, 1000)}",
                    is_active=True,
                )
            )
        Area.objects.bulk_create(areas_a_crear)
        self.stdout.write(f"Se generaron {len(areas_a_crear)} nuevas áreas.")

    def _crear_usuarios(self, count):
        existentes = User.objects.exclude(role__name="proveedor").count()
        if existentes >= count:
            return

        role_area, _ = Role.objects.get_or_create(name=Role.RoleType.AREA)
        role_adq, _ = Role.objects.get_or_create(name=Role.RoleType.ADQUISICIONES)
        role_tes, _ = Role.objects.get_or_create(name=Role.RoleType.TESORERIA)

        roles = [role_area, role_adq, role_tes]
        users_a_crear = []
        for _ in range(count - existentes):
            email = fake.unique.email()
            users_a_crear.append(
                User(
                    email=email,
                    username=email.split("@")[0] + str(fake.unique.random_int(1, 9999)),
                    first_name=fake.first_name(),
                    last_name=fake.last_name(),
                    role=random.choice(roles),
                    is_active=True,
                )
            )

        User.objects.bulk_create(users_a_crear)
        # Fix passwords
        User.objects.filter(password="").update(
            password="pbkdf2_sha256$600000$xxxxxxxxxxxxxxxx$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx="
        )
        self.stdout.write(
            f"Se generaron {len(users_a_crear)} nuevos usuarios operativos."
        )

    def _crear_proveedores(self, count):
        existentes = Proveedor.objects.count()
        if existentes >= count:
            return

        role_prov, _ = Role.objects.get_or_create(name=Role.RoleType.PROVEEDOR)
        profiles = []
        for _ in range(count - existentes):
            email = fake.unique.email()
            user = User.objects.create(
                email=email,
                username=f"prov_{fake.unique.random_int(10000, 99999)}",
                first_name=fake.company(),
                last_name="SA de CV",
                role=role_prov,
                is_active=True,
            )
            profiles.append(
                Proveedor(
                    user=user,
                    razon_social=user.first_name + " " + user.last_name,
                    rfc=fake.bothify(text="???######???").upper(),
                    direccion=fake.address(),
                )
            )
        Proveedor.objects.bulk_create(profiles)
        self.stdout.write(f"Se generaron {len(profiles)} nuevos proveedores.")

    def _generar_flujo_compras(self, target_ordenes):
        self.stdout.write(
            "Generando flujo de compras transaccional (Solicitudes -> Cotizaciones -> Autorizaciones -> Órdenes)."
        )

        areas = list(Area.objects.all())
        users_area = list(User.objects.filter(role__name="area"))
        users_adq = list(User.objects.filter(role__name="adquisiciones"))
        users_tes = list(User.objects.filter(role__name="tesoreria"))
        proveedores = list(Proveedor.objects.all())
        cogs = list(Cog.objects.all())

        if not users_area or not users_adq or not users_tes or not proveedores:
            self.stdout.write("Faltan perfiles para crear el flujo completo.")
            return

        total_existentes = OrdenCompra.objects.count()
        a_crear = target_ordenes - total_existentes

        if a_crear <= 0:
            self.stdout.write(f"Ya existen {total_existentes} órdenes de compra.")
            return

        now = timezone.now()

        # We will create in batches of 100 to avoid excessive memory usage in a single huge array,
        # but since we are in atomic transaction it will be fast enough to do object by object

        batch_size = 100
        for b in range(0, a_crear, batch_size):
            self.stdout.write(f"Procesando lote {b} - {b + batch_size}...")

            for i in range(min(batch_size, a_crear - b)):
                # 1. Crear Solicitud
                solicitud = SolicitudMaterial.objects.create(
                    area=random.choice(areas),
                    created_by=random.choice(users_area),
                    descripcion=fake.sentence(),
                    justificacion=fake.paragraph(),
                    estado=SolicitudMaterial.EstadoChoices.COTIZADO,  # simulando que ya se cotizó
                    fecha_solicitud=now - timedelta(days=random.randint(10, 30)),
                )

                # 2. Detalles de Solicitud (1 a 5 items)
                num_items = random.randint(1, 5)
                detalles_sol = []
                total_est = Decimal("0.00")
                for _ in range(num_items):
                    cant = Decimal(random.randint(1, 100))
                    precio = Decimal(random.randint(100, 5000))
                    subt = cant * precio
                    total_est += subt
                    detalles_sol.append(
                        DetalleMaterial(
                            solicitud=solicitud,
                            cog=random.choice(cogs),
                            concepto=fake.word(),
                            cantidad=cant,
                            precio_estimado=precio,
                            unidad="PZA",
                        )
                    )
                DetalleMaterial.objects.bulk_create(detalles_sol)
                solicitud.total_estimado = total_est
                solicitud.save(update_fields=["total_estimado"])

                # 3. Cotizaciones (2 a 4 por solicitud)
                num_cots = random.randint(2, 4)
                provs = random.sample(proveedores, num_cots)
                cot_ganadora: "CotizacionMaterial | None" = None
                for idx, prov in enumerate(provs):
                    # Una será la ganadora
                    es_ganadora = idx == 0
                    estado_cot = (
                        CotizacionMaterial.EstadoChoices.SELECCIONADA
                        if es_ganadora
                        else CotizacionMaterial.EstadoChoices.RECHAZADA
                    )

                    subtotal_cot = total_est * Decimal(random.uniform(0.8, 1.2))
                    iva_cot = subtotal_cot * Decimal("0.16")
                    total_cot = subtotal_cot + iva_cot

                    cot = CotizacionMaterial.objects.create(
                        solicitud=solicitud,
                        proveedor=prov,
                        fecha=solicitud.fecha_solicitud
                        + timedelta(days=random.randint(1, 5)),
                        estado=estado_cot,
                        subtotal=subtotal_cot,
                        iva=iva_cot,
                        total=total_cot,
                        vigencia=solicitud.fecha_solicitud + timedelta(days=30),
                    )

                    # Detalles de cotización
                    detalles_cot = []
                    for ds in solicitud.detalles.all():
                        precio_cot = ds.precio_estimado * Decimal(
                            random.uniform(0.8, 1.2)
                        )
                        detalles_cot.append(
                            CotizacionDetalle(
                                cotizacion=cot,
                                detalle_material=ds,
                                concepto=ds.concepto,
                                cantidad=ds.cantidad,
                                precio_unitario=precio_cot,
                                unidad=ds.unidad,
                                subtotal=ds.cantidad * precio_cot,
                            )
                        )
                    CotizacionDetalle.objects.bulk_create(detalles_cot)

                    if es_ganadora:
                        cot_ganadora = cot

                assert cot_ganadora is not None, "cot_ganadora debe haberse asignado en el loop"
                # 4. Autorización Presupuestal
                sol_aut = SolicitudAutorizacion.objects.create(
                    solicitud=solicitud,
                    cotizacion=cot_ganadora,
                    solicitante=random.choice(users_adq),
                    monto_solicitado=cot_ganadora.total,
                    estado=SolicitudAutorizacion.EstadoChoices.APROBADA,
                )

                AutorizacionPresupuestal.objects.create(
                    solicitud_autorizacion=sol_aut,
                    monto_autorizado=cot_ganadora.total,
                    partida_presupuestal=random.choice(
                        ["2110001", "2120001", "2140001", "2160001", "2460001"]
                    ),
                    aprobado_por=random.choice(users_tes),
                    fecha_aprobacion=cot_ganadora.fecha
                    + timedelta(days=random.randint(1, 3)),
                )

                solicitud.estado = SolicitudMaterial.EstadoChoices.AUTORIZADO
                solicitud.save(update_fields=["estado"])

                # 5. Orden de Compra
                orden = OrdenCompra.objects.create(
                    proveedor=cot_ganadora.proveedor,
                    cotizacion=cot_ganadora,
                    autorizacion=sol_aut.autorizacion_presupuestal,
                    fecha_emision=sol_aut.autorizacion_presupuestal.fecha_aprobacion
                    + timedelta(days=1),
                    subtotal=cot_ganadora.subtotal,
                    iva=cot_ganadora.iva,
                    total=cot_ganadora.total,
                    estado=OrdenCompra.EstadoChoices.ENVIADA,
                    created_by=random.choice(users_adq),
                )

                # Detalles OC
                detalles_oc = []
                for dc in cot_ganadora.detalles.all():
                    detalles_oc.append(
                        DetalleOrden(
                            orden=orden,
                            detalle_material=dc.detalle_material,
                            concepto=dc.concepto,
                            cantidad=dc.cantidad,
                            precio_unitario=dc.precio_unitario,
                            subtotal=dc.subtotal,
                            unidad=dc.unidad,
                        )
                    )
                DetalleOrden.objects.bulk_create(detalles_oc)

        self.stdout.write(
            f"Se crearon {a_crear} órdenes y todo el árbol de dependencias."
        )
