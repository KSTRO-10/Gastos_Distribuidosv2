from django.test import TestCase

class SeguridadSistemaTests(TestCase):
    def test_validacion_jwt_requerido(self):
        # Prueba que el sistema rechaza peticiones sin token
        response = self.client.get('/api/areas/')
        self.assertEqual(response.status_code, 401)