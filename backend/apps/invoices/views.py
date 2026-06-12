from decimal import Decimal

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Sum
from django.utils import timezone

from .models import Factura, FacturaDetalle, DistribucionGasto
from .serializers import (
    FacturaSerializer,
    FacturaUploadSerializer,
    FacturaDetalleSerializer,
    DistributeRequestSerializer,
    FacturaQuickUploadSerializer,
)
from .tasks import process_cfdi_xml, distribute_invoice_expenses
from apps.accounts.permissions import IsTesoreria


def _check_budget_warnings(distributions):
    """
    Verifica si alguna distribución excede el presupuesto mensual del área.
    Retorna una lista de advertencias (puede estar vacía).
    """
    from apps.areas.models import Area

    today = timezone.now().date()
    first_day = today.replace(day=1)
    warnings = []

    for dist in distributions:
        try:
            area = Area.objects.get(id=dist['area_id'])
            presupuesto_anual = area.presupuesto_anual or Decimal('0')
            if presupuesto_anual <= 0:
                continue
            presupuesto_mensual = presupuesto_anual / 12

            ya_gastado = (
                DistribucionGasto.objects
                .filter(area=area, created_at__gte=first_day, factura__status='distribuida')
                .aggregate(total=Sum('monto'))['total']
                or Decimal('0')
            )

            nuevo_monto = Decimal(str(dist['monto']))
            total_resultante = ya_gastado + nuevo_monto

            if total_resultante > presupuesto_mensual:
                warnings.append({
                    'area_nombre': area.name,
                    'presupuesto_mensual': float(presupuesto_mensual),
                    'ya_gastado': float(ya_gastado),
                    'nuevo_monto': float(nuevo_monto),
                    'exceso': float(total_resultante - presupuesto_mensual),
                })
        except Exception:
            pass

    return warnings


class FacturaViewSet(viewsets.ModelViewSet):
    queryset = Factura.objects.select_related('proveedor', 'uploaded_by').prefetch_related('conceptos', 'distribuciones')
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        if self.action == 'upload':
            return FacturaUploadSerializer
        if self.action == 'upload_and_process':
            return FacturaQuickUploadSerializer
        return FacturaSerializer
    
    def get_permissions(self):
        if self.action in ['upload', 'distribute', 'upload_and_process']:
            return [IsAuthenticated(), IsTesoreria()]
        return super().get_permissions()
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Auto-filter for proveedor users: only show their own invoices
        user = self.request.user
        if hasattr(user, 'is_proveedor') and user.is_proveedor:
            proveedor = getattr(user, 'proveedor', None)
            if proveedor:
                queryset = queryset.filter(proveedor=proveedor)
            else:
                queryset = queryset.none()
        elif hasattr(user, 'is_area') and user.is_area:
            area_ids = []
            if user.area_id:
                area_ids.append(user.area_id)
            if hasattr(user, 'area_assignments'):
                area_ids.extend(user.area_assignments.values_list('area_id', flat=True))
            
            area_ids = list(set(area_ids))
            
            from django.db.models import Q
            queryset = queryset.filter(
                Q(distribuciones__area_id__in=area_ids) |
                Q(orden_compra__created_by__area_id__in=area_ids) |
                Q(orden_compra__created_by=user)
            ).distinct()
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        proveedor_id = self.request.query_params.get('proveedor')
        if proveedor_id:
            queryset = queryset.filter(proveedor_id=proveedor_id)
        
        return queryset
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == Factura.EstadoChoices.PAGADA:
            return Response(
                {"error": "No se puede modificar una factura que ya ha sido pagada."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().update(request, *args, **kwargs)
        
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status == Factura.EstadoChoices.PAGADA:
            return Response(
                {"error": "No se puede modificar una factura que ya ha sido pagada."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().partial_update(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Upload a CFDI XML file for processing."""
        serializer = FacturaUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        factura = serializer.save(uploaded_by=request.user)
        
        # Try async processing, fall back to sync if Celery/Redis not available
        try:
            process_cfdi_xml.delay(factura.id)
            message = 'Factura recibida. El procesamiento se realizará en segundo plano.'
        except Exception:
            # Celery/Redis not available, process synchronously
            process_cfdi_xml.apply(args=[factura.id])
            factura.refresh_from_db()
            message = 'Factura procesada correctamente.'
        
        return Response(
            {
                'id': factura.id,
                'message': message,
                'status': factura.status
            },
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'])
    def parsed(self, request, pk=None):
        """Get parsed JSON data for a factura."""
        factura = self.get_object()
        
        if factura.status not in [Factura.EstadoChoices.PROCESADA, Factura.EstadoChoices.DISTRIBUIDA]:
            return Response(
                {'error': 'La factura aún no ha sido procesada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(factura.parsed_json)
    
    @action(detail=True, methods=['post'], permission_classes=[IsTesoreria])
    def distribute(self, request, pk=None):
        """Distribute invoice expenses to areas."""
        factura = self.get_object()
        
        if factura.status not in [Factura.EstadoChoices.PROCESADA, Factura.EstadoChoices.DISTRIBUIDA]:
            return Response(
                {'error': 'La factura debe estar procesada para distribuir.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = DistributeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Add created_by to each distribution
        distributions = serializer.validated_data['distributions']
 
        # Verificar presupuesto (advertencia, no bloqueo)
        force = request.data.get('force', False)
        if not force:
            warnings = _check_budget_warnings(distributions)
            if warnings:
                return Response({
                    'needs_confirmation': True,
                    'warnings': warnings,
                })
 
        for dist in distributions:
            dist['created_by_id'] = request.user.id
        
        # Try async processing, fall back to sync if Celery/Redis not available
        try:
            distribute_invoice_expenses.delay(factura.id, distributions)
            message = 'La distribución se procesará en segundo plano.'
        except Exception:
            # Celery/Redis not available, process synchronously
            distribute_invoice_expenses(factura.id, distributions)
            message = 'Distribución completada correctamente.'
        
        return Response({
            'message': message
        })
    
    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        """Reprocess a failed factura."""
        factura = self.get_object()
        
        if factura.status != Factura.EstadoChoices.ERROR:
            return Response(
                {'error': 'Solo se pueden reprocesar facturas con error.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reset status and requeue
        factura.status = Factura.EstadoChoices.PENDIENTE
        factura.error_message = ''
        factura.save()
        
        # Try async processing, fall back to sync if Celery/Redis not available
        try:
            process_cfdi_xml.delay(factura.id)
            message = 'Reprocesamiento iniciado.'
        except Exception:
            # Celery/Redis not available, process synchronously
            process_cfdi_xml.apply(args=[factura.id])
            message = 'Factura reprocesada correctamente.'
        
        return Response({'message': message})
 
    @action(detail=False, methods=['post'], url_path='upload-and-process')
    def upload_and_process(self, request):
        """
        Quick flow: Upload a CFDI XML, process it synchronously, and return
        the fully parsed factura with conceptos ready for distribution.
        """
        serializer = FacturaQuickUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        factura = serializer.save(uploaded_by=request.user)
        
        # Always process synchronously for quick flow
        process_cfdi_xml.apply(args=[factura.id])
        factura.refresh_from_db()
        
        if factura.status == Factura.EstadoChoices.ERROR:
            return Response(
                {
                    'error': factura.error_message or 'Error al procesar la factura.',
                    'id': factura.id,
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Return full factura data with conceptos
        factura_data = FacturaSerializer(factura).data
        
        return Response(
            {
                'message': 'Factura procesada correctamente.',
                'factura': factura_data,
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def validar(self, request, pk=None):
        """3-Way Match validation approval."""
        factura = self.get_object()
        aprobado = request.data.get('aprobado', False)
        if aprobado:
            factura.status = Factura.EstadoChoices.AUTORIZADA
        else:
            factura.status = Factura.EstadoChoices.RECHAZADA
        factura.save()
        return Response(FacturaSerializer(factura).data)

    @action(detail=False, methods=['post'])
    def programar_pago_masivo(self, request):
        """Schedule a massive payment for invoices."""
        factura_ids = request.data.get('factura_ids', [])
        fecha_pago = request.data.get('fecha_pago')
        cuenta_origen = request.data.get('cuenta_origen')
        
        if not factura_ids or not fecha_pago or not cuenta_origen:
            return Response(
                {"error": "Faltan campos obligatorios (factura_ids, fecha_pago, cuenta_origen)."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        from django.db import transaction
        from .models import LotePago
        
        with transaction.atomic():
            LotePago.objects.create(
                fecha_pago=fecha_pago,
                cuenta_origen=cuenta_origen,
                creado_por=request.user,
                estado='programado'
            )
            
            facturas = Factura.objects.filter(id__in=factura_ids)
            for factura in facturas:
                factura.status = Factura.EstadoChoices.PROGRAMADA
                factura.save()
                
        return Response({"message": "Pago programado exitosamente."})

    @action(detail=True, methods=['post'])
    def registrar_pago(self, request, pk=None):
        """Register a payment for the invoice."""
        factura = self.get_object()
        if factura.status != Factura.EstadoChoices.PROGRAMADA:
            return Response(
                {"error": "La factura debe estar en estado programada para registrar pago."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        monto = request.data.get('monto')
        fecha_pago = request.data.get('fecha_pago')
        referencia = request.data.get('referencia', '')
        comprobante = request.FILES.get('comprobante')
        
        if not monto or not fecha_pago:
            return Response(
                {"error": "Monto y fecha de pago son requeridos."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        from django.db import transaction
        from .models import Pago
        
        with transaction.atomic():
            Pago.objects.create(
                factura=factura,
                monto=Decimal(str(monto)),
                fecha_pago=fecha_pago,
                referencia=referencia,
                comprobante=comprobante,
                creado_por=request.user
            )
            
            factura.status = Factura.EstadoChoices.PAGADA
            factura.save()
            
        return Response({"message": "Pago registrado exitosamente."}, status=status.HTTP_201_CREATED)



class FacturaDetalleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = FacturaDetalle.objects.select_related('factura')
    serializer_class = FacturaDetalleSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        factura_id = self.request.query_params.get('factura')
        if factura_id:
            queryset = queryset.filter(factura_id=factura_id)
        return queryset
