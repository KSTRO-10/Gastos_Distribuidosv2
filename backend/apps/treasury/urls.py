from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import SolicitudGastoViewSet, SolicitudPagoViewSet

router = DefaultRouter()
router.register('solicitudes-gasto', SolicitudGastoViewSet, basename='solicitud-gasto')
router.register('solicitudes-pago', SolicitudPagoViewSet, basename='solicitud-pago')

urlpatterns = [
    path('', include(router.urls)),
]
