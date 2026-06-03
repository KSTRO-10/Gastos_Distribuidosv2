from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SolicitudAutorizacionViewSet, OrdenCompraViewSet

router = DefaultRouter()
router.register(r'autorizaciones', SolicitudAutorizacionViewSet, basename='autorizacion')
router.register(r'', OrdenCompraViewSet, basename='orden')

urlpatterns = [
    path('', include(router.urls)),
]
