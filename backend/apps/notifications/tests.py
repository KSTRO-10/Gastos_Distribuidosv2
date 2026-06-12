from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from apps.companies.models import Company
from apps.areas.models import Area
from apps.notifications.models import ActivityLog
from apps.notifications.middleware import ActivityLogMiddleware

User = get_user_model()


class ActivityLogTests(TestCase):
    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
            full_name="Test User",
        )
        # Create a test company
        self.company = Company.objects.create(
            rfc="TEST000000AAA", razon_social="Compañía de Prueba", is_active=True
        )

    def test_log_creation_and_update(self):
        # Setup middleware request simulation
        factory = RequestFactory()
        request = factory.post("/api/areas/", {})
        request.user = self.user

        # Invoke middleware
        middleware = ActivityLogMiddleware(get_response=lambda r: None)
        middleware.process_request(request)

        # Create area and check log is created
        area = Area.objects.create(
            company=self.company, name="Tecnología", code="TEC", manager=self.user
        )

        logs = ActivityLog.objects.filter(modelo="Area", objeto_id=area.id)
        self.assertEqual(logs.count(), 1)
        log = logs.first()
        self.assertEqual(log.accion, ActivityLog.AccionChoices.CREAR)
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.datos_nuevos["name"], "Tecnología")
        self.assertEqual(log.datos_anteriores, {})

        # Update area and check log is created
        area.name = "Sistemas"
        area.save()

        logs = ActivityLog.objects.filter(modelo="Area", objeto_id=area.id).order_by(
            "created_at"
        )
        self.assertEqual(logs.count(), 2)
        log_update = logs.last()
        self.assertEqual(log_update.accion, ActivityLog.AccionChoices.ACTUALIZAR)
        self.assertEqual(log_update.datos_anteriores["name"], "Tecnología")
        self.assertEqual(log_update.datos_nuevos["name"], "Sistemas")

        # Save ID before delete
        area_id = area.id
        area.delete()

        logs = ActivityLog.objects.filter(modelo="Area", objeto_id=area_id).order_by(
            "created_at"
        )
        self.assertEqual(logs.count(), 3)
        log_delete = logs.last()
        self.assertEqual(log_delete.accion, ActivityLog.AccionChoices.ELIMINAR)
        self.assertEqual(log_delete.datos_anteriores["name"], "Sistemas")
        self.assertEqual(log_delete.datos_nuevos, {})
