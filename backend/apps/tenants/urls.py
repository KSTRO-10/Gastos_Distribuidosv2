from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TenantViewSet, SolicitudGubernamentalViewSet

router = DefaultRouter()
router.register(r'', TenantViewSet, basename='tenant')
router.register(r'solicitudes', SolicitudGubernamentalViewSet, basename='solicitud')

urlpatterns = [
    path('', include(router.urls)),
]
