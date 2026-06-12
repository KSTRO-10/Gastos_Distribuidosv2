import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from apps.inventory.models import Stock, Articulo
from apps.areas.models import Area
from apps.companies.models import Company
from django.contrib.auth import get_user_model
from apps.inventory.services import InventoryService
from django.core.exceptions import ValidationError

User = get_user_model()


def run_tests():
    print("--- INICIANDO PRUEBAS DE VALIDACIÓN ---")
    try:
        company, _ = Company.objects.get_or_create(
            name="Test Company", defaults={"rfc": "TEST123456789"}
        )
        almacen, _ = Area.objects.get_or_create(
            name="Almacen Test", defaults={"company": company}
        )
        articulo, _ = Articulo.objects.get_or_create(
            codigo="TEST-01",
            defaults={"nombre": "Articulo Test", "precio_unitario": 100},
        )
        user, _ = User.objects.get_or_create(
            username="testadmin", defaults={"email": "test@test.com"}
        )

        print("Prueba 1: Añadir stock disponible")
        stock = InventoryService.add_stock(almacen, articulo, 10, user=user)
        stock.refresh_from_db()
        stock.estado_articulo = Stock.EstadoArticuloChoices.DISPONIBLE
        stock.save()
        print("✓ Stock añadido correctamente.")

        print("Prueba 2: Extraer stock disponible")
        InventoryService.remove_stock(almacen, articulo, 2, user=user)
        print("✓ Stock extraído correctamente.")

        print("Prueba 3: Extraer stock Dañado (Debe ser bloqueado)")
        stock.estado_articulo = Stock.EstadoArticuloChoices.DANADO
        stock.save()
        try:
            InventoryService.remove_stock(almacen, articulo, 2, user=user)
            print("❌ FALLO: Se logró extraer stock dañado.")
        except ValidationError as e:
            print(f"✓ Éxito: Operación bloqueada. Motivo: {e}")

        print("Prueba 4: Extraer stock En Garantía (Debe ser bloqueado)")
        stock.estado_articulo = Stock.EstadoArticuloChoices.EN_GARANTIA
        stock.save()
        try:
            InventoryService.remove_stock(almacen, articulo, 2, user=user)
            print("❌ FALLO: Se logró extraer stock en garantía.")
        except ValidationError as e:
            print(f"✓ Éxito: Operación bloqueada. Motivo: {e}")

        print("--- PRUEBAS COMPLETADAS EXITOSAMENTE ---")

    except Exception as ex:
        print(f"Error general en pruebas: {ex}")


if __name__ == "__main__":
    run_tests()
