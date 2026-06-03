from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CogViewSet, SolicitudMaterialViewSet, DetalleMaterialViewSet

router = DefaultRouter()
router.register(r'cog', CogViewSet, basename='cog')
router.register(r'solicitudes', SolicitudMaterialViewSet, basename='solicitud-material')
router.register(r'detalles', DetalleMaterialViewSet, basename='detalle-material')

urlpatterns = [
    path('', include(router.urls)),
]
