from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AreaViewSet, PersonalAreaViewSet

router = DefaultRouter()
router.register(r'', AreaViewSet, basename='area')
router.register(r'personal', PersonalAreaViewSet, basename='personal')

urlpatterns = [
    path('', include(router.urls)),
]
