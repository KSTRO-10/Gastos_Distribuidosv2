from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyViewSet, ProveedorViewSet, ProductoProveedorViewSet,
    FirmanteDocumentoViewSet,
)

router = DefaultRouter()
router.register(r'empresas', CompanyViewSet, basename='company')
router.register(r'proveedores', ProveedorViewSet, basename='proveedor')
router.register(r'catalogo-productos', ProductoProveedorViewSet, basename='producto-proveedor')
router.register(r'firmantes', FirmanteDocumentoViewSet, basename='firmante')

urlpatterns = [
    path('', include(router.urls)),
]
