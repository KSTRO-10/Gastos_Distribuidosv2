from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ArticuloViewSet, StockViewSet,
    EntregaBienesViewSet, SalidaBienesViewSet, DevolucionInternaViewSet, AjusteInventarioViewSet,
    AuditoriaViewSet
)

router = DefaultRouter()
router.register(r'articulos', ArticuloViewSet, basename='articulo')
router.register(r'stock', StockViewSet, basename='stock')
router.register(r'entregas', EntregaBienesViewSet, basename='entrega')
router.register(r'salidas', SalidaBienesViewSet, basename='salida')
router.register(r'devoluciones', DevolucionInternaViewSet, basename='devolucion')
router.register(r'ajustes', AjusteInventarioViewSet, basename='ajuste')
router.register(r'auditorias', AuditoriaViewSet, basename='auditoria')

urlpatterns = [
    path('', include(router.urls)),
]



