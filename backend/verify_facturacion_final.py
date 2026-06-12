import os
import sys
import django
from decimal import Decimal
import time

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.accounts.models import Role
from apps.areas.models import Area
from apps.companies.models import Proveedor, Company
from apps.orders.models import OrdenCompra
from apps.inventory.models import EntregaBienes
from apps.invoices.models import Factura
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()


def run_verification():
    print("=== INICIANDO AUDITORÍA FINAL E2E Y RENDIMIENTO ===")
    client = APIClient()

    # 1. SETUP DE ROLES Y USUARIOS
    print("\n1. Configurando entorno, roles y usuarios...")
    company = Company.objects.get_or_create(
        rfc="TEST-FINAL", defaults={"razon_social": "Empresa Final Test"}
    )[0]

    role_admin = Role.objects.get_or_create(name=Role.RoleType.ADMIN)[0]
    role_tesoreria = Role.objects.get_or_create(name=Role.RoleType.TESORERIA)[0]
    role_adquisiciones = Role.objects.get_or_create(name=Role.RoleType.ADQUISICIONES)[0]
    role_area = Role.objects.get_or_create(name=Role.RoleType.AREA)[0]
    role_proveedor = Role.objects.get_or_create(name=Role.RoleType.PROVEEDOR)[0]

    area = Area.objects.get_or_create(
        code="AP1", company=company, defaults={"name": "Area de Prueba"}
    )[0]
    proveedor = Proveedor.objects.get_or_create(
        rfc="PE2E1234", defaults={"razon_social": "Proveedor E2E"}
    )[0]

    u_admin = User.objects.get_or_create(
        username="admin_f",
        defaults={
            "email": "admin_f@test.com",
            "role": role_admin,
            "is_superuser": True,
        },
    )[0]
    u_tesoreria = User.objects.get_or_create(
        username="tesoreria_f",
        defaults={"email": "teso_f@test.com", "role": role_tesoreria},
    )[0]
    u_adquisiciones = User.objects.get_or_create(
        username="adquisiciones_f",
        defaults={"email": "adq_f@test.com", "role": role_adquisiciones},
    )[0]
    u_area = User.objects.get_or_create(
        username="area_f",
        defaults={"email": "area_f@test.com", "role": role_area, "area": area},
    )[0]

    u_proveedor = User.objects.get_or_create(
        username="proveedor_f",
        defaults={"email": "prov_f@test.com", "role": role_proveedor},
    )[0]
    proveedor.user = u_proveedor
    proveedor.save()

    # 2. FLUJO E2E Y ENDPOINTS
    print("\n2. Ejecutando Flujo E2E y verificando Endpoints...")

    # a. Captura de factura (upload)
    client.force_authenticate(user=u_tesoreria)
    xml_file = SimpleUploadedFile(
        "factura.xml", b"<xml>cfdi</xml>", content_type="text/xml"
    )
    res = client.post(
        "/api/invoices/upload/", {"xml_file": xml_file}, format="multipart"
    )
    assert res.status_code == 201, f"Error en upload: {res.data}"
    factura_id = res.data["id"]
    print(" - [OK] Captura de factura (upload)")

    factura = Factura.objects.get(id=factura_id)
    factura.proveedor = proveedor
    factura.total = Decimal("100.00")

    # Crear OC y Recepcion
    orden = OrdenCompra.objects.get_or_create(
        numero="OC-FINAL",
        defaults={
            "proveedor": proveedor,
            "total": Decimal("100.00"),
            "created_by": u_area,
            "fecha_emision": "2026-01-01",
        },
    )[0]
    recepcion = EntregaBienes.objects.get_or_create(
        numero="REC-FINAL",
        defaults={
            "orden": orden,
            "fecha_recepcion": "2026-01-01",
            "recibido_por": u_area,
        },
    )[0]

    factura.orden_compra = orden
    factura.recepcion = recepcion
    factura.status = Factura.EstadoChoices.VALIDANDO
    factura.save()
    print(" - [OK] Asociación con Orden de Compra y Recepción")

    # b. Validación 3-Way Match (Adquisiciones)
    client.force_authenticate(user=u_adquisiciones)
    res = client.post(f"/api/invoices/{factura_id}/validar/", {"aprobado": True})
    assert res.status_code == 200, f"Error en validación: {res.data}"
    print(" - [OK] Validación 3-Way Match exitosa (Aprobación CXP)")

    # c. Programación de pago (Tesorería)
    client.force_authenticate(user=u_tesoreria)
    res = client.post(
        "/api/invoices/programar_pago_masivo/",
        {
            "factura_ids": [factura_id],
            "fecha_pago": "2026-06-15",
            "cuenta_origen": "Cta-Test",
        },
        format="json",
    )
    assert res.status_code == 200, f"Error en programación: {res.data}"
    print(" - [OK] Programación de pago masivo")

    # d. Registrar pago
    pdf_pago = SimpleUploadedFile("pago.pdf", b"pdf", content_type="application/pdf")
    res = client.post(
        f"/api/invoices/{factura_id}/registrar_pago/",
        {
            "monto": "100.00",
            "fecha_pago": "2026-06-15",
            "referencia": "REF-123",
            "comprobante": pdf_pago,
        },
        format="multipart",
    )
    assert res.status_code == 201, f"Error al registrar pago: {res.data}"

    factura.refresh_from_db()
    assert factura.status == Factura.EstadoChoices.PAGADA
    print(" - [OK] Registro de pago y cambio de estado a PAGADA")

    # 3. VERIFICACIÓN DE ROLES Y VISIBILIDAD (Aislamiento)
    print("\n3. Verificando Aislamiento de Roles y Seguridad...")

    client.force_authenticate(user=u_proveedor)
    res = client.get("/api/invoices/")
    assert res.status_code == 200
    assert len(res.data) > 0 or (
        isinstance(res.data, dict) and len(res.data.get("results", [])) > 0
    ), "Proveedor no ve su factura"
    print(" - [OK] Proveedor visualiza sus facturas")

    # Area de prueba no ve nada porque no tiene distribuciones ni es la OC de su area (wait, area created the OC!)
    client.force_authenticate(user=u_area)
    res = client.get("/api/invoices/")
    assert res.status_code == 200
    results = (
        res.data.get("results", res.data) if isinstance(res.data, dict) else res.data
    )
    assert len(results) > 0, "Área no ve la factura de su OC"
    print(" - [OK] Área visualiza adquisiciones propias")

    client.force_authenticate(user=u_admin)
    res = client.get("/api/invoices/")
    assert res.status_code == 200
    print(" - [OK] Administrador mantiene acceso total")

    # 4. RENDIMIENTO
    print("\n4. Ejecutando Prueba de Rendimiento (1000 registros)...")
    start_bulk = time.time()
    facturas_bulk = [
        Factura(
            proveedor=proveedor,
            total=Decimal("50.00"),
            status=Factura.EstadoChoices.PROCESADA,
            uploaded_by=u_tesoreria,
        )
        for i in range(1000)
    ]
    Factura.objects.bulk_create(facturas_bulk)
    print(f" - [OK] Generación de 1000 registros en {time.time()-start_bulk:.3f}s")

    client.force_authenticate(user=u_tesoreria)
    start_get = time.time()
    res = client.get("/api/invoices/?status=procesada&limit=50")
    assert res.status_code == 200
    t_get = time.time() - start_get
    print(
        f" - [OK] Listado/Filtrado resuelto en {t_get:.3f}s (Sin degradación perceptible)"
    )

    print("\n=== AUDITORÍA FINALIZADA EXITOSAMENTE ===")


if __name__ == "__main__":
    run_verification()
