from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.areas.models import Area, PersonalArea
from apps.companies.models import Company, Proveedor
from apps.procurement.models import Cog
from apps.inventory.models import (
    Articulo,
    EntregaBienes,
    EntregaDetalle,
    SalidaBienes,
    SalidaDetalle,
)
from apps.orders.models import OrdenCompra, DetalleOrden
from apps.accounts.models import Role
from django.utils import timezone

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds the database with inventory data for E2E testing"

    def handle(self, *args, **kwargs):
        self.stdout.write("Cleaning previous seed data...")
        SalidaBienes.objects.filter(numero__in=["SAL-2026-S1", "SAL-2026-S2"]).delete()
        EntregaBienes.objects.filter(numero="REC-2026-SEED").delete()
        OrdenCompra.objects.filter(numero="OC-2026-SEED").delete()

        self.stdout.write("Seeding Inventory Data...")

        # 0. Create Roles
        role_admin, _ = Role.objects.get_or_create(
            name=Role.RoleType.ADMIN,
            defaults={
                "description": "Admin Role",
                "permissions": Role.get_default_permissions(Role.RoleType.ADMIN),
            },
        )
        role_almacen, _ = Role.objects.get_or_create(
            name=Role.RoleType.ALMACEN,
            defaults={
                "description": "Almacen Role",
                "permissions": Role.get_default_permissions(Role.RoleType.ALMACEN),
            },
        )
        role_area, _ = Role.objects.get_or_create(
            name=Role.RoleType.AREA,
            defaults={
                "description": "Area Role",
                "permissions": Role.get_default_permissions(Role.RoleType.AREA),
            },
        )

        # 1. Create Users
        admin_user, _ = User.objects.get_or_create(
            email="admin@kstro.com",
            defaults={
                "username": "admin_inv",
                "first_name": "Admin",
                "last_name": "KSTRO",
                "role": role_admin,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if not _:
            admin_user.set_password("admin123")
            admin_user.save()

        almacen_user, _ = User.objects.get_or_create(
            email="almacen@kstro.com",
            defaults={
                "username": "almacen_inv",
                "first_name": "Juan",
                "last_name": "Almacen",
                "role": role_almacen,
            },
        )
        if not _:
            almacen_user.set_password("almacen123")
            almacen_user.save()

        area_user, _ = User.objects.get_or_create(
            email="area@kstro.com",
            defaults={
                "username": "area_inv",
                "first_name": "Pedro",
                "last_name": "Area",
                "role": role_area,
            },
        )
        if not _:
            area_user.set_password("area123")
            area_user.save()

        area_user2, _ = User.objects.get_or_create(
            email="area2@kstro.com",
            defaults={
                "username": "area2_inv",
                "first_name": "Maria",
                "last_name": "Area2",
                "role": role_area,
            },
        )
        if not _:
            area_user2.set_password("area123")
            area_user2.save()

        # 2. Create Company & Areas
        company, _ = Company.objects.get_or_create(
            rfc="KSTR010101KST",
            defaults={
                "razon_social": "KSTRO S.A. de C.V.",
                "nombre_comercial": "KSTRO",
            },
        )
        almacen_central, _ = Area.objects.get_or_create(
            name="Almacén Central",
            company=company,
            defaults={"is_active": True, "code": "ALM-01"},
        )
        area_mantenimiento, _ = Area.objects.get_or_create(
            name="Mantenimiento",
            company=company,
            defaults={"is_active": True, "code": "MANT-01"},
        )
        area_sistemas, _ = Area.objects.get_or_create(
            name="Sistemas",
            company=company,
            defaults={"is_active": True, "code": "SIST-01"},
        )

        # Asignar tipo (como no existe el campo type en el modelo, usamos el nombre para referenciar lógica o lo ignoramos)
        # Wait, the Area model doesn't have a `type` field either! Let's check the schema logic later.

        # Assignments
        PersonalArea.objects.get_or_create(user=almacen_user, area=almacen_central)
        PersonalArea.objects.get_or_create(user=area_user, area=area_mantenimiento)
        PersonalArea.objects.get_or_create(user=area_user2, area=area_sistemas)

        # 3. Create COG
        cog_21101, _ = Cog.objects.get_or_create(
            codigo="21101",
            defaults={"descripcion": "Materiales, útiles y equipos menores de oficina"},
        )
        cog_21401, _ = Cog.objects.get_or_create(
            codigo="21401",
            defaults={
                "descripcion": "Materiales, útiles y equipos menores de tecnologías de la información"
            },
        )
        cog_24601, _ = Cog.objects.get_or_create(
            codigo="24601", defaults={"descripcion": "Material eléctrico y electrónico"}
        )

        # 4. Create Articulos
        articulos_data = [
            {
                "codigo": "ART-OF-001",
                "nombre": "Paquete de Hojas Blancas Carta",
                "unidad_medida": "Paquete 500",
                "cog": cog_21101,
                "costo": 120.00,
            },
            {
                "codigo": "ART-OF-002",
                "nombre": "Bolígrafo Tinta Negra",
                "unidad_medida": "Caja 12",
                "cog": cog_21101,
                "costo": 50.00,
            },
            {
                "codigo": "ART-IT-001",
                "nombre": "Mouse Óptico USB",
                "unidad_medida": "Pieza",
                "cog": cog_21401,
                "costo": 150.00,
            },
            {
                "codigo": "ART-IT-002",
                "nombre": "Teclado USB",
                "unidad_medida": "Pieza",
                "cog": cog_21401,
                "costo": 200.00,
            },
            {
                "codigo": "ART-MT-001",
                "nombre": "Cable UTP Cat 6 (Bobina)",
                "unidad_medida": "Bobina 305m",
                "cog": cog_24601,
                "costo": 1500.00,
            },
            {
                "codigo": "ART-MT-002",
                "nombre": "Contactos Eléctricos Dobles",
                "unidad_medida": "Pieza",
                "cog": cog_24601,
                "costo": 80.00,
            },
        ]

        arts = []
        for d in articulos_data:
            art, _ = Articulo.objects.get_or_create(
                codigo=d["codigo"],
                defaults={
                    "nombre": d["nombre"],
                    "unidad_medida": d["unidad_medida"],
                    "cog": d["cog"],
                    "costo_promedio": d["costo"],
                },
            )
            arts.append(art)

        # 4.5 Create Proveedor
        proveedor, _ = Proveedor.objects.get_or_create(
            rfc="PROV010101XYZ",
            defaults={
                "razon_social": "Proveedor Global de Materiales S.A.",
                "nombre_comercial": "ProGlo",
                "estado": "activo",
            },
        )

        # 5. Create Orden Compra (Required to create Entregas)
        orden, _ = OrdenCompra.objects.get_or_create(
            numero="OC-2026-SEED",
            defaults={
                "proveedor": proveedor,
                "created_by": admin_user,
                "estado": "enviada",
                "fecha_emision": timezone.now(),
            },
        )
        # Assuming DetalleOrden needs to exist
        detalles_orden = []
        for art in arts:
            detalle, _ = DetalleOrden.objects.get_or_create(
                orden=orden,
                concepto=art.nombre,
                defaults={
                    "cantidad": 100,
                    "precio_unitario": art.costo_promedio,
                    "cantidad_recibida": 0,
                },
            )
            detalles_orden.append((art, detalle))

        # 6. Create Entrega (This triggers stock via the complete method, but we can do it manually for seed)
        entrega, _ = EntregaBienes.objects.get_or_create(
            numero="REC-2026-SEED",
            defaults={
                "orden": orden,
                "fecha_recepcion": timezone.now(),
                "recibido_por": almacen_user,
                "completa": False,
            },
        )

        from apps.inventory.services import InventoryService

        for art, det in detalles_orden:
            EntregaDetalle.objects.get_or_create(
                entrega=entrega,
                detalle_orden=det,
                articulo=art,
                defaults={"cantidad_recibida": 50, "condicion_buena": True},
            )
        # Process to increment stock
        if not entrega.completa:
            InventoryService.procesar_entrega(entrega, almacen_central, almacen_user)

        salida1, _ = SalidaBienes.objects.get_or_create(
            numero="SAL-2026-S1",
            defaults={
                "almacen": almacen_central,
                "destino_area": area_mantenimiento,
                "fecha": timezone.now(),
                "responsable": almacen_user,
                "confirmada": True,
                "confirmada_por": area_user,
                "fecha_confirmacion": timezone.now(),
            },
        )

        # Mantenimiento se lleva el UTP y Contactos
        if _:
            InventoryService.remove_stock(
                almacen_central, arts[4], 1, almacen_user, "Salida a Mantenimiento"
            )
            SalidaDetalle.objects.create(salida=salida1, articulo=arts[4], cantidad=1)

            InventoryService.remove_stock(
                almacen_central, arts[5], 10, almacen_user, "Salida a Mantenimiento"
            )
            SalidaDetalle.objects.create(salida=salida1, articulo=arts[5], cantidad=10)

        salida2, _ = SalidaBienes.objects.get_or_create(
            numero="SAL-2026-S2",
            defaults={
                "almacen": almacen_central,
                "destino_area": area_sistemas,
                "fecha": timezone.now(),
                "responsable": almacen_user,
                "confirmada": True,
                "confirmada_por": area_user2,
                "fecha_confirmacion": timezone.now(),
            },
        )
        if _:
            # Sistemas se lleva Mouse y Teclado
            InventoryService.remove_stock(
                almacen_central, arts[2], 5, almacen_user, "Salida a Sistemas"
            )
            SalidaDetalle.objects.create(salida=salida2, articulo=arts[2], cantidad=5)

            InventoryService.remove_stock(
                almacen_central, arts[3], 5, almacen_user, "Salida a Sistemas"
            )
            SalidaDetalle.objects.create(salida=salida2, articulo=arts[3], cantidad=5)

        self.stdout.write(self.style.SUCCESS("✅ Successfully seeded inventory data!"))
        self.stdout.write("Test Users:")
        self.stdout.write("- Admin: admin@kstro.com / admin123")
        self.stdout.write("- Almacen: almacen@kstro.com / almacen123")
        self.stdout.write("- Area Mantenimiento: area@kstro.com / area123")
        self.stdout.write("- Area Sistemas: area2@kstro.com / area123")
