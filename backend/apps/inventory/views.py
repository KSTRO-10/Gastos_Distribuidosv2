from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.parsers import MultiPartParser, FormParser

from .models import (
    Articulo, Stock,
    Auditoria, EntregaBienes, EvidenciaEntrega, SalidaBienes,
    DevolucionInterna, AjusteInventario
)
from .serializers import (
    ArticuloSerializer,
    StockSerializer,
    EntregaBienesSerializer,
    EntregaBienesCreateSerializer,
    EvidenciaEntregaSerializer,
    SalidaBienesSerializer,
    SalidaBienesCreateSerializer,
    DevolucionInternaSerializer,
    DevolucionInternaCreateSerializer,
    AjusteInventarioSerializer,
    AjusteInventarioCreateSerializer,
    AuditoriaSerializer,
    AuditoriaCreateSerializer,
)
from apps.accounts.permissions import IsAlmacen


class ArticuloViewSet(viewsets.ModelViewSet):
    """Catálogo maestro de artículos de inventario."""
    queryset = Articulo.objects.select_related('cog').filter(is_active=True)
    serializer_class = ArticuloSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Articulo.objects.select_related('cog')
        # Permitir filtrar inactivos sólo para admins
        if not self.request.user.is_admin:
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from apps.accounts.permissions import IsAdmin
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]


class StockViewSet(viewsets.ReadOnlyModelViewSet):
    """Existencias actuales por almacén."""
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Stock.objects.select_related('almacen', 'articulo')
        almacen_id = self.request.query_params.get('almacen')
        if almacen_id:
            qs = qs.filter(almacen_id=almacen_id)
        return qs

class EntregaBienesViewSet(viewsets.ModelViewSet):
    queryset = EntregaBienes.objects.select_related(
        'orden', 'factura', 'recibido_por'
    ).prefetch_related('detalles', 'evidencias')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return EntregaBienesCreateSerializer
        return EntregaBienesSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAuthenticated(), IsAlmacen()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        serializer.save(recibido_por=self.request.user)
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_evidence(self, request, pk=None):
        """Upload photo evidence for a delivery."""
        entrega = self.get_object()
        
        imagen = request.FILES.get('imagen')
        if not imagen:
            return Response(
                {'error': 'Se requiere una imagen.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        evidencia = EvidenciaEntrega.objects.create(
            entrega=entrega,
            imagen=imagen,
            descripcion=request.data.get('descripcion', '')
        )
        
        return Response(EvidenciaEntregaSerializer(evidencia).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='evidencias')
    def list_evidencias(self, request, pk=None):
        """List all photo evidence for a delivery."""
        entrega = self.get_object()
        evidencias = EvidenciaEntrega.objects.filter(
            entrega=entrega).order_by('created_at')
        return Response(
            EvidenciaEntregaSerializer(evidencias, many=True).data)


class SalidaBienesViewSet(viewsets.ModelViewSet):
    queryset = SalidaBienes.objects.select_related(
        'almacen', 'destino_area', 'responsable', 'confirmada_por'
    ).prefetch_related('detalles')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return SalidaBienesCreateSerializer
        return SalidaBienesSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsAuthenticated(), IsAlmacen()]
        return super().get_permissions()
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Areas only see outputs assigned to them
        if user.is_area:
            area_ids = user.area_assignments.values_list('area_id', flat=True)
            queryset = queryset.filter(destino_area_id__in=area_ids)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(responsable=self.request.user)
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirm receipt of goods by destination area."""
        salida = self.get_object()
        
        if salida.confirmada:
            return Response(
                {'error': 'Esta salida ya fue confirmada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        salida.confirmada = True
        salida.confirmada_por = request.user
        salida.fecha_confirmacion = timezone.now()
        salida.save()
        
        return Response(SalidaBienesSerializer(salida).data)


class DevolucionInternaViewSet(viewsets.ModelViewSet):
    queryset = DevolucionInterna.objects.select_related(
        'area_origen', 'almacen_destino', 'salida_origen', 'solicitante', 'recibido_por'
    ).prefetch_related('detalles')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return DevolucionInternaCreateSerializer
        return DevolucionInternaSerializer
        
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if user.is_area:
            area_ids = user.area_assignments.values_list('area_id', flat=True)
            queryset = queryset.filter(area_origen_id__in=area_ids)
        return queryset
        
    def perform_create(self, serializer):
        serializer.save(solicitante=self.request.user)


class CanApproveAjuste(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_admin or not request.user.is_almacen)
        )


class AjusteInventarioViewSet(viewsets.ModelViewSet):
    queryset = AjusteInventario.objects.select_related(
        'almacen', 'solicitante', 'autorizador'
    ).prefetch_related('detalles')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AjusteInventarioCreateSerializer
        return AjusteInventarioSerializer
        
    def get_permissions(self):
        if self.action == 'aprobar':
            return [IsAuthenticated(), CanApproveAjuste()]
        return super().get_permissions()
        
    def perform_create(self, serializer):
        serializer.save(solicitante=self.request.user)
        
    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        ajuste = self.get_object()
        
        if ajuste.estado != AjusteInventario.EstadoChoices.PENDIENTE:
            return Response(
                {"error": "Este ajuste ya no está pendiente."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        from .services import InventoryService
        try:
            ajuste = InventoryService.aprobar_ajuste(ajuste, request.user)
            return Response(AjusteInventarioSerializer(ajuste).data)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AuditoriaViewSet(viewsets.ModelViewSet):
    """Gestión de auditorías de inventario."""
    queryset = Auditoria.objects.select_related('almacen', 'creada_por', 'autorizada_por').prefetch_related('detalles__articulo')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AuditoriaCreateSerializer
        return AuditoriaSerializer

    def perform_create(self, serializer):
        serializer.save(creada_por=self.request.user)

    @action(detail=True, methods=['post'])
    def aprobar(self, request, pk=None):
        auditoria = self.get_object()
        
        if auditoria.estado in [Auditoria.EstadoChoices.CERRADA, Auditoria.EstadoChoices.RECHAZADA]:
            return Response(
                {"error": "Esta auditoría ya fue cerrada o rechazada."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        auditoria.estado = Auditoria.EstadoChoices.CERRADA
        auditoria.autorizada_por = request.user
        auditoria.fecha_cierre = timezone.now()
        auditoria.save(update_fields=['estado', 'autorizada_por', 'fecha_cierre'])
        
        return Response(AuditoriaSerializer(auditoria).data)
