from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from .models import EntregaBienes, EvidenciaEntrega, SalidaBienes
from .serializers import (
    EntregaBienesSerializer,
    EntregaBienesCreateSerializer,
    EvidenciaEntregaSerializer,
    SalidaBienesSerializer,
    SalidaBienesCreateSerializer,
)
from apps.accounts.permissions import IsAlmacen, IsArea


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
