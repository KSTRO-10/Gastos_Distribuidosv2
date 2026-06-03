from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EntregaBienesViewSet, SalidaBienesViewSet

router = DefaultRouter()
router.register(r'entregas', EntregaBienesViewSet, basename='entrega')
router.register(r'salidas', SalidaBienesViewSet, basename='salida')

urlpatterns = [
    path('', include(router.urls)),
]
