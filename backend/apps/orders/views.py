from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import SolicitudAutorizacion, AutorizacionPresupuestal, OrdenCompra
from .serializers import (
    SolicitudAutorizacionSerializer,
    AutorizacionPresupuestalSerializer,
    OrdenCompraSerializer,
    OrdenCompraCreateSerializer,
)
from apps.accounts.permissions import IsTesoreria, IsAdquisiciones, IsProveedor


class SolicitudAutorizacionViewSet(viewsets.ModelViewSet):
    queryset = SolicitudAutorizacion.objects.select_related(
        'solicitud', 'cotizacion', 'solicitante'
    ).prefetch_related('autorizacion_presupuestal')
    serializer_class = SolicitudAutorizacionSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(solicitante=self.request.user)
    
    @action(detail=True, methods=['post'], permission_classes=[IsTesoreria])
    def approve(self, request, pk=None):
        """Approve authorization request."""
        solicitud = self.get_object()
        
        if solicitud.estado != SolicitudAutorizacion.EstadoChoices.PENDIENTE:
            return Response(
                {'error': 'Esta solicitud ya fue procesada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        monto = request.data.get('monto_autorizado', solicitud.monto_solicitado)
        
        AutorizacionPresupuestal.objects.create(
            solicitud_autorizacion=solicitud,
            monto_autorizado=monto,
            partida_presupuestal=request.data.get('partida_presupuestal', ''),
            fecha_aprobacion=timezone.now().date(),
            observaciones=request.data.get('observaciones', ''),
            aprobado_por=request.user
        )
        
        solicitud.estado = SolicitudAutorizacion.EstadoChoices.APROBADA
        solicitud.save()
        
        # Update solicitud material status
        from apps.procurement.models import SolicitudMaterial
        solicitud.solicitud.estado = SolicitudMaterial.EstadoChoices.AUTORIZADO
        solicitud.solicitud.save()
        
        return Response(SolicitudAutorizacionSerializer(solicitud).data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsTesoreria])
    def reject(self, request, pk=None):
        """Reject authorization request."""
        solicitud = self.get_object()
        
        motivo = request.data.get('motivo_rechazo', '')
        if not motivo:
            return Response(
                {'error': 'Se requiere un motivo de rechazo.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        solicitud.estado = SolicitudAutorizacion.EstadoChoices.RECHAZADA
        solicitud.motivo_rechazo = motivo
        solicitud.save()
        
        return Response(SolicitudAutorizacionSerializer(solicitud).data)

    @action(detail=True, methods=['get'])
    def generar_pdf(self, request, pk=None):
        """Genera el PDF de la autorización presupuestal (si está aprobada)."""
        from django.http import HttpResponse
        from apps.documents.services.pdf_generator import generate_autorizacion_pdf
        
        solicitud = self.get_object()
        
        if solicitud.estado != SolicitudAutorizacion.EstadoChoices.APROBADA:
            return Response(
                {'error': 'Solo se puede generar PDF para solicitudes aprobadas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        autorizacion = solicitud.autorizacion_presupuestal.first()
        if not autorizacion:
            return Response(
                {'error': 'No se encontró la autorización presupuestal correspondiente.'},
                status=status.HTTP_404_NOT_FOUND
            )
            
        try:
            pdf_bytes = generate_autorizacion_pdf(autorizacion)
            
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="autorizacion_{solicitud.numero}.pdf"'
            return response
        except Exception as e:
            return Response(
                {'error': f'Error generando PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class OrdenCompraViewSet(viewsets.ModelViewSet):
    queryset = OrdenCompra.objects.select_related(
        'proveedor', 'autorizacion', 'cotizacion', 'created_by'
    ).prefetch_related('detalles')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return OrdenCompraCreateSerializer
        return OrdenCompraSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        if user.is_proveedor and hasattr(user, 'proveedor_profile'):
            queryset = queryset.filter(proveedor=user.proveedor_profile)
        
        estado = self.request.query_params.get('estado')
        if estado:
            queryset = queryset.filter(estado=estado)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdquisiciones])
    def send(self, request, pk=None):
        """Send order to provider."""
        orden = self.get_object()
        
        if orden.estado != OrdenCompra.EstadoChoices.BORRADOR:
            return Response(
                {'error': 'Solo se pueden enviar órdenes en borrador.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        orden.estado = OrdenCompra.EstadoChoices.ENVIADA
        orden.save()
        
        # TODO: Send email notification to provider
        
        return Response(OrdenCompraSerializer(orden).data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsProveedor])
    def confirm(self, request, pk=None):
        """Provider confirms the order."""
        orden = self.get_object()
        
        if orden.estado != OrdenCompra.EstadoChoices.ENVIADA:
            return Response(
                {'error': 'Esta orden no puede ser confirmada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        orden.estado = OrdenCompra.EstadoChoices.CONFIRMADA
        orden.referencia_externa = request.data.get('referencia_externa', '')
        orden.save()
        
        return Response(OrdenCompraSerializer(orden).data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdquisiciones])
    def cancel(self, request, pk=None):
        """Cancel the order."""
        orden = self.get_object()
        
        if orden.estado in [OrdenCompra.EstadoChoices.ENTREGADA, OrdenCompra.EstadoChoices.CANCELADA]:
            return Response(
                {'error': 'Esta orden no puede ser cancelada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        orden.estado = OrdenCompra.EstadoChoices.CANCELADA
        orden.save()
        
        return Response(OrdenCompraSerializer(orden).data)

    @action(detail=True, methods=['get'])
    def generar_pdf(self, request, pk=None):
        """Genera el PDF de la orden de compra."""
        from django.http import HttpResponse
        from apps.documents.services.pdf_generator import generate_orden_compra_pdf
        
        orden = self.get_object()
        
        try:
            pdf_bytes = generate_orden_compra_pdf(orden)
            
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="orden_{orden.numero}.pdf"'
            return response
        except Exception as e:
            return Response(
                {'error': f'Error generando PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
