import pytest
from rest_framework.test import APIClient
from apps.accounts.models import Role, User
from apps.areas.models import Area, PersonalArea
from apps.inventory.models import DevolucionInterna, Articulo
from apps.companies.models import Company
from apps.procurement.models import Cog
from apps.inventory.services import InventoryService
from django.core.exceptions import ValidationError


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def setup_roles_and_users(db):
    company = Company.objects.create(rfc="TEST010101XYZ", razon_social="Test Co")

    role_admin = Role.objects.create(
        name=Role.RoleType.ADMIN,
        permissions=Role.get_default_permissions(Role.RoleType.ADMIN),
    )
    role_almacen = Role.objects.create(
        name=Role.RoleType.ALMACEN,
        permissions=Role.get_default_permissions(Role.RoleType.ALMACEN),
    )
    role_area = Role.objects.create(
        name=Role.RoleType.AREA,
        permissions=Role.get_default_permissions(Role.RoleType.AREA),
    )

    admin_user = User.objects.create_user(
        username="admin_test", email="admin_test@x.com", password="123", role=role_admin
    )
    almacen_user = User.objects.create_user(
        username="alm_test", email="alm_test@x.com", password="123", role=role_almacen
    )
    area1_user = User.objects.create_user(
        username="area1_test", email="area1_test@x.com", password="123", role=role_area
    )
    area2_user = User.objects.create_user(
        username="area2_test", email="area2_test@x.com", password="123", role=role_area
    )

    area_mantenimiento = Area.objects.create(
        name="Mantenimiento Test", company=company, code="MANT-TEST"
    )
    area_sistemas = Area.objects.create(
        name="Sistemas Test", company=company, code="SIST-TEST"
    )

    PersonalArea.objects.create(user=area1_user, area=area_mantenimiento)
    PersonalArea.objects.create(user=area2_user, area=area_sistemas)

    return {
        "admin": admin_user,
        "almacen": almacen_user,
        "area1": area1_user,
        "area2": area2_user,
        "area_mantenimiento": area_mantenimiento,
        "area_sistemas": area_sistemas,
        "company": company,
    }


@pytest.mark.django_db
class TestInventoryE2E:

    def test_aislamiento_devoluciones_por_area(self, api_client, setup_roles_and_users):
        """Un área no debe ver las devoluciones de otra área."""
        user1 = setup_roles_and_users["area1"]
        user2 = setup_roles_and_users["area2"]

        # Area1 creates a devolucion
        DevolucionInterna.objects.create(
            numero="DEV-TEST-01",
            area_origen=setup_roles_and_users["area_mantenimiento"],
            almacen_destino=setup_roles_and_users[
                "area_sistemas"
            ],  # using area_sistemas as dummy almacen
            solicitante=user1,
            estado="pendiente",
        )

        # User 1 calls API
        api_client.force_authenticate(user=user1)
        response1 = api_client.get("/api/inventory/devoluciones/")
        assert response1.status_code == 200
        assert (
            len(
                response1.data["results"]
                if "results" in response1.data
                else response1.data
            )
            == 1
        )

        # User 2 calls API
        api_client.force_authenticate(user=user2)
        response2 = api_client.get("/api/inventory/devoluciones/")
        assert response2.status_code == 200
        assert (
            len(
                response2.data["results"]
                if "results" in response2.data
                else response2.data
            )
            == 0
        )

        # Admin calls API
        api_client.force_authenticate(user=setup_roles_and_users["admin"])
        response3 = api_client.get("/api/inventory/devoluciones/")
        assert response3.status_code == 200
        assert (
            len(
                response3.data["results"]
                if "results" in response3.data
                else response3.data
            )
            == 1
        )

    def test_almacen_no_puede_aprobar_ajuste(self, api_client, setup_roles_and_users):
        """Un usuario de almacén no debe tener permisos para autorizar ajustes."""
        user_almacen = setup_roles_and_users["almacen"]
        api_client.force_authenticate(user=user_almacen)

        response = api_client.post("/api/inventory/ajustes/999/aprobar/")
        # Should be forbidden or at least not allowed, we don't even care if 999 exists
        # In DRF, if permission fails, it returns 403 before 404
        assert response.status_code in [403, 401]

    def test_remove_stock_integrity(self, setup_roles_and_users):
        """Prueba la regla de negocio que impide remover stock de algo que no existe."""
        almacen = setup_roles_and_users[
            "area_mantenimiento"
        ]  # Usando como dummy almacen
        almacen.type = "almacen"
        almacen.save()

        cog = Cog.objects.create(codigo="TEST-COG")
        art = Articulo.objects.create(
            codigo="TEST-001", nombre="Art Test", costo_promedio=10.0, cog=cog
        )

        with pytest.raises(ValidationError) as exc:
            InventoryService.remove_stock(
                almacen, art, 5, setup_roles_and_users["almacen"], "Testing"
            )
        assert "No existe stock" in str(exc.value)
