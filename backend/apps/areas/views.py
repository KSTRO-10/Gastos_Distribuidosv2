from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
import logging

from .models import Area, PersonalArea
from .serializers import AreaSerializer, PersonalAreaSerializer
from apps.accounts.permissions import IsAdmin

logger = logging.getLogger(__name__)


class AreaViewSet(viewsets.ModelViewSet):
    queryset = Area.objects.select_related('company', 'manager', 'parent').all()
    serializer_class = AreaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by company
        company_id = self.request.query_params.get('company')
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        
        # Filter active only
        if self.request.query_params.get('active_only'):
            queryset = queryset.filter(is_active=True)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        logger.info(f"Creating area with data: {request.data}")
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Area validation failed: {serializer.errors}")
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PersonalAreaViewSet(viewsets.ModelViewSet):
    queryset = PersonalArea.objects.select_related('user', 'area').all()
    serializer_class = PersonalAreaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by area
        area_id = self.request.query_params.get('area')
        if area_id:
            queryset = queryset.filter(area_id=area_id)
        
        return queryset
