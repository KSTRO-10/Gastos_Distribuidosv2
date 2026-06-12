from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import CotizacionMaterial
from .serializers import (
    CotizacionMaterialSerializer,
    CotizacionMaterialCreateSerializer,
)
from apps.accounts.permissions import IsAdquisiciones, IsTesoreria


class CotizacionMaterialViewSet(viewsets.ModelViewSet):
    queryset = CotizacionMaterial.objects.select_related('solicitud', 'proveedor').prefetch_related('detalles')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return CotizacionMaterialCreateSerializer
        return CotizacionMaterialSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Providers only see their own quotes
        if user.is_proveedor and hasattr(user, 'proveedor_profile'):
            queryset = queryset.filter(proveedor=user.proveedor_profile)
        
        # Filter by solicitud
        solicitud_id = self.request.query_params.get('solicitud')
        if solicitud_id:
            queryset = queryset.filter(solicitud_id=solicitud_id)
        
        return queryset
    
    @action(detail=True, methods=['post'], permission_classes=[IsTesoreria])
    def select(self, request, pk=None):
        """Select this quotation as winner."""
        cotizacion = self.get_object()
        
        # Reject other quotations for the same solicitud
        CotizacionMaterial.objects.filter(
            solicitud=cotizacion.solicitud
        ).exclude(id=cotizacion.id).update(
            estado=CotizacionMaterial.EstadoChoices.RECHAZADA
        )
        
        cotizacion.estado = CotizacionMaterial.EstadoChoices.SELECCIONADA
        cotizacion.save()
        
        # Update solicitud status
        from apps.procurement.models import SolicitudMaterial
        cotizacion.solicitud.estado = SolicitudMaterial.EstadoChoices.COTIZADO
        cotizacion.solicitud.save()
        
        return Response(CotizacionMaterialSerializer(cotizacion).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdquisiciones])
    def create_order(self, request, pk=None):
        """Generate purchase order from authorized quotation."""
        from django.utils import timezone
        from apps.orders.models import OrdenCompra, DetalleOrden
        from apps.orders.serializers import OrdenCompraSerializer
        
        cotizacion = self.get_object()
        
        # Verificar que la cotización esté seleccionada
        if cotizacion.estado != CotizacionMaterial.EstadoChoices.SELECCIONADA:
            return Response(
                {'error': 'Solo se pueden generar órdenes de cotizaciones autorizadas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que no exista ya una OC para esta cotización
        if cotizacion.ordenes_compra.exists():
            return Response(
                {'error': 'Ya existe una orden de compra para esta cotización.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Datos para la orden
        fecha_entrega = request.data.get('fecha_entrega_esperada')
        condiciones_pago = request.data.get('condiciones_pago', cotizacion.condiciones_pago)
        notas = request.data.get('notas', '')
        
        # Generar número de orden
        year = timezone.now().year
        count = OrdenCompra.objects.filter(created_at__year=year).count() + 1
        numero = f"OC-{year}-{count:05d}"
        
        # Crear orden de compra
        orden = OrdenCompra.objects.create(
            numero=numero,
            proveedor=cotizacion.proveedor,
            cotizacion=cotizacion,
            fecha_emision=timezone.now().date(),
            fecha_entrega_esperada=fecha_entrega,
            subtotal=cotizacion.subtotal,
            iva=cotizacion.iva,
            total=cotizacion.total,
            condiciones_pago=condiciones_pago,
            notas=notas,
            estado=OrdenCompra.EstadoChoices.BORRADOR,
            created_by=request.user
        )
        
        # Copiar detalles de la cotización a la orden
        for detalle_cot in cotizacion.detalles.all():
            DetalleOrden.objects.create(
                orden=orden,
                detalle_material=detalle_cot.detalle_material,
                concepto=detalle_cot.concepto,
                descripcion=detalle_cot.descripcion or '',
                cantidad=detalle_cot.cantidad,
                unidad=detalle_cot.unidad,
                precio_unitario=detalle_cot.precio_unitario,
                subtotal=detalle_cot.subtotal
            )
        
        # Actualizar estado de solicitud
        from apps.procurement.models import SolicitudMaterial
        cotizacion.solicitud.estado = SolicitudMaterial.EstadoChoices.EN_ORDEN
        cotizacion.solicitud.save()
        
        return Response(OrdenCompraSerializer(orden).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='comparar/(?P<solicitud_id>[^/.]+)')
    def comparar(self, request, solicitud_id=None):
        """
        Vista comparativa de cotizaciones para una solicitud.
        Retorna estructura: { solicitud, items[], proveedores[], comparativa[][] }
        donde comparativa[item_idx][prov_idx] = { precio_unitario, subtotal, producto }
        """
        from apps.procurement.models import SolicitudMaterial

        try:
            solicitud = SolicitudMaterial.objects.get(id=solicitud_id)
        except SolicitudMaterial.DoesNotExist:
            return Response(
                {'error': 'Solicitud no encontrada.'},
                status=status.HTTP_404_NOT_FOUND
            )

        detalles = list(solicitud.detalles.select_related('cog').all())
        cotizaciones = CotizacionMaterial.objects.filter(
            solicitud=solicitud,
        ).exclude(
            estado=CotizacionMaterial.EstadoChoices.RECHAZADA,
        ).select_related('proveedor').prefetch_related('detalles__detalle_material')

        if not cotizaciones.exists():
            return Response({
                'solicitud': {
                    'id': solicitud.id,
                    'numero': solicitud.numero,
                    'descripcion': solicitud.descripcion,
                },
                'items': [],
                'proveedores': [],
                'comparativa': [],
                'mejores_precios': [],
            })

        # Mapear ítems de la solicitud
        items = []
        for d in detalles:
            items.append({
                'id': d.id,
                'concepto': d.concepto,
                'cantidad': str(d.cantidad),
                'unidad': d.unidad,
                'cog_codigo': d.cog.codigo,
                'precio_estimado': str(d.precio_estimado),
            })

        # Mapear proveedores
        proveedores = []
        for cot in cotizaciones:
            proveedores.append({
                'id': cot.proveedor.id,
                'nombre': cot.proveedor.razon_social,
                'cotizacion_id': cot.id,
                'cotizacion_numero': cot.numero,
                'estado': cot.estado,
                'total': str(cot.total),
            })

        # Construir matriz comparativa
        comparativa = []
        mejores_precios = []

        for detalle in detalles:
            fila = []
            precios_fila = []

            for cot in cotizaciones:
                # Buscar el detalle de cotización que corresponde a este detalle de solicitud
                cot_detalle = cot.detalles.filter(detalle_material=detalle).first()

                if cot_detalle:
                    celda = {
                        'precio_unitario': str(cot_detalle.precio_unitario),
                        'subtotal': str(cot_detalle.subtotal),
                        'concepto': cot_detalle.concepto,
                        'tiene_precio': True,
                    }
                    precios_fila.append(cot_detalle.precio_unitario)
                else:
                    celda = {
                        'precio_unitario': None,
                        'subtotal': None,
                        'concepto': None,
                        'tiene_precio': False,
                    }

                fila.append(celda)

            comparativa.append(fila)

            # Determinar mejor precio de la fila
            if precios_fila:
                min_precio = min(precios_fila)
                mejor_idx = next(
                    i for i, c in enumerate(fila)
                    if c['tiene_precio'] and c['precio_unitario'] == str(min_precio)
                )
                mejores_precios.append(mejor_idx)
            else:
                mejores_precios.append(None)

        return Response({
            'solicitud': {
                'id': solicitud.id,
                'numero': solicitud.numero,
                'descripcion': solicitud.descripcion,
            },
            'items': items,
            'proveedores': proveedores,
            'comparativa': comparativa,
            'mejores_precios': mejores_precios,
        })
