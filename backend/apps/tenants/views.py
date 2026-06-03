from django.utils import timezone
from django.db import connection
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Tenant, SolicitudGubernamental, Domain
from .serializers import (
    TenantSerializer,
    SolicitudGubernamentalSerializer,
    SolicitudGubernamentalCreateSerializer,
    SolicitudApprovalSerializer,
)
from apps.accounts.permissions import IsAdmin


class TenantViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing and retrieving tenants.
    Only admins can access.
    """
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.query_params.get('active_only'):
            queryset = queryset.filter(is_active=True)
        return queryset

    def _get_current_tenant(self):
        tenant = getattr(connection, 'tenant', None)
        if tenant is None or not getattr(tenant, 'pk', None):
            tenant = Tenant.objects.first()
        return tenant

    @action(detail=False, methods=['get', 'patch'], url_path='current')
    def current(self, request):
        """Get or update the current tenant. PATCH merges `settings` JSON."""
        tenant = self._get_current_tenant()
        if tenant is None:
            return Response({'error': 'No tenant.'}, status=status.HTTP_404_NOT_FOUND)

        if request.method.lower() == 'get':
            return Response(TenantSerializer(tenant).data)

        # PATCH: merge settings JSON instead of overwriting
        new_settings = request.data.get('settings')
        if isinstance(new_settings, dict):
            merged = dict(tenant.settings or {})
            merged.update(new_settings)
            tenant.settings = merged

        for field in ('name', 'rfc'):
            if field in request.data:
                setattr(tenant, field, request.data[field])

        tenant.save()
        return Response(TenantSerializer(tenant).data)


class SolicitudGubernamentalViewSet(viewsets.ModelViewSet):
    """
    ViewSet for government registration requests.
    """
    queryset = SolicitudGubernamental.objects.all()
    
    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SolicitudGubernamentalCreateSerializer
        return SolicitudGubernamentalSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        estado = self.request.query_params.get('estado')
        if estado:
            queryset = queryset.filter(estado=estado)
        return queryset
    
    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """
        Approve or reject a registration request.
        """
        solicitud = self.get_object()
        
        if solicitud.estado != SolicitudGubernamental.EstadoChoices.PENDIENTE:
            return Response(
                {'error': 'Esta solicitud ya fue procesada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = SolicitudApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action_type = serializer.validated_data['action']
        
        if action_type == 'approve':
            # Create tenant and domain
            subdomain = serializer.validated_data['subdomain']
            
            tenant = Tenant.objects.create(
                schema_name=subdomain,
                name=solicitud.nombre_organizacion,
                rfc=solicitud.rfc,
            )
            
            Domain.objects.create(
                domain=f'{subdomain}.localhost',
                tenant=tenant,
                is_primary=True
            )
            
            solicitud.estado = SolicitudGubernamental.EstadoChoices.APROBADA
            solicitud.tenant = tenant
            
        else:
            solicitud.estado = SolicitudGubernamental.EstadoChoices.RECHAZADA
            solicitud.rejection_reason = serializer.validated_data.get('rejection_reason', '')
        
        solicitud.reviewed_by = request.user
        solicitud.reviewed_at = timezone.now()
        solicitud.save()
        
        return Response(SolicitudGubernamentalSerializer(solicitud).data)
