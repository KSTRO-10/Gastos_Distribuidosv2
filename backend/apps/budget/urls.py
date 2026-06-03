from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlantillaPresupuestalViewSet, ItemClavePresViewSet, DescargarPlantillaView

router = DefaultRouter()
router.register(r'plantillas', PlantillaPresupuestalViewSet, basename='plantilla-presupuestal')
router.register(r'claves', ItemClavePresViewSet, basename='item-clave-pres')

urlpatterns = [
    path('plantillas/descargar-plantilla/', DescargarPlantillaView.as_view(), name='descargar-plantilla-presupuesto'),
    path('', include(router.urls)),
]
