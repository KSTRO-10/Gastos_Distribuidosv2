from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FacturaViewSet, FacturaDetalleViewSet

router = DefaultRouter()
router.register(r'', FacturaViewSet, basename='factura')
router.register(r'detalles', FacturaDetalleViewSet, basename='factura-detalle')

urlpatterns = [
    path('', include(router.urls)),
]
