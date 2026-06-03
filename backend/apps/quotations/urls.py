from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CotizacionMaterialViewSet

router = DefaultRouter()
router.register(r'cotizaciones', CotizacionMaterialViewSet, basename='cotizacion')

urlpatterns = [
    path('', include(router.urls)),
]
