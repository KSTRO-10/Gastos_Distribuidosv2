from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PDFDocumentViewSet, MediaViewSet,
    SolicitudGastoPDFView, SolicitudPagoPDFView,
)

router = DefaultRouter()
router.register(r'pdf', PDFDocumentViewSet, basename='pdf')
router.register(r'media', MediaViewSet, basename='media')

urlpatterns = [
    path('', include(router.urls)),
    path('solicitud-gasto/<int:pk>/pdf/', SolicitudGastoPDFView.as_view(), name='solicitud-gasto-pdf'),
    path('solicitud-pago/<int:pk>/pdf/', SolicitudPagoPDFView.as_view(), name='solicitud-pago-pdf'),
]
