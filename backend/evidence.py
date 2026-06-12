import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from apps.invoices.models import Factura
from django.db.models import Count
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import Role
from apps.companies.models import Proveedor

User = get_user_model()

print("--- EVIDENCIA DE ESTADOS ---")
qs = Factura.objects.values("status").annotate(total=Count("id")).order_by("status")
for row in qs:
    print(f"Estado: {row['status']} -> Registros: {row['total']}")

print("\n--- EVIDENCIA AISLAMIENTO PROVEEDOR ---")
prov1 = Proveedor.objects.get_or_create(rfc="P1_TEST", razon_social="P1")[0]
prov2 = Proveedor.objects.get_or_create(rfc="P2_TEST", razon_social="P2")[0]
role_prov = Role.objects.get_or_create(name=Role.RoleType.PROVEEDOR)[0]
u_prov1 = User.objects.get_or_create(username="u_p1", email="p1@p.com", role=role_prov)[
    0
]
prov1.user = u_prov1
prov1.save()

f_p2 = Factura.objects.create(
    proveedor=prov2, total=100, status="procesando", uploaded_by=u_prov1
)

client = APIClient()
client.force_authenticate(user=u_prov1)
res = client.get("/api/invoices/")
data = res.data.get("results", res.data) if isinstance(res.data, dict) else res.data

print(f"Factura P2 Creada con ID: {f_p2.id}")
print("Llamada API GET /api/invoices/ autenticado como Proveedor 1")
print(f"Total de resultados devueltos: {len(data)}")
for r in data:
    if r.get("id") == f_p2.id:
        print("¡ERROR! EL PROVEEDOR 1 PUEDE VER LA FACTURA DEL PROVEEDOR 2")
