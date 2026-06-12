from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from apps.procurement.models import SolicitudMaterial
from apps.quotations.models import CotizacionMaterial as Cotizacion
from apps.orders.models import OrdenCompra
from apps.invoices.models import Factura
from apps.areas.models import Area
from apps.companies.models import Proveedor


def get_user_role_name(user):
    """Obtiene el nombre del rol del usuario como string."""
    if user.role:
        return user.role.name  # 'admin', 'tesoreria', etc.
    return None


def get_role_filtered_querysets(user):
    """
    Retorna querysets filtrados según el rol del usuario.
    - admin/tesoreria: Acceso completo
    - area: Solo sus propias solicitudes y las de su área
    - adquisiciones: Solicitudes, cotizaciones y órdenes
    - almacen: Órdenes y entregas
    - proveedor: Sus propias cotizaciones y órdenes asignadas
    """
    role_name = get_user_role_name(user)
    
    # Base querysets (sin filtro por tenant ya que usamos SQLite)
    solicitudes = SolicitudMaterial.objects.all()
    cotizaciones = Cotizacion.objects.all()
    ordenes = OrdenCompra.objects.all()
    facturas = Factura.objects.all()
    areas = Area.objects.filter(is_active=True)
    
    # Aplicar filtros según rol
    if role_name in ['admin', 'tesoreria']:
        # Acceso completo - no se filtra más
        pass
    
    elif role_name == 'area':
        # Solo ve solicitudes que creó o de áreas que gestiona
        solicitudes = solicitudes.filter(
            Q(created_by=user) | Q(area__manager=user)
        )
        # Cotizaciones de sus solicitudes
        cotizaciones = cotizaciones.filter(
            solicitud__in=solicitudes
        )
        # Órdenes de sus solicitudes (a través de cotización)
        ordenes = ordenes.filter(
            cotizacion__solicitud__in=solicitudes
        )
        # Facturas del proveedor de sus órdenes
        proveedores_ids = ordenes.values_list('proveedor_id', flat=True)
        facturas = facturas.filter(proveedor_id__in=proveedores_ids)
        # Solo áreas que gestiona
        areas = areas.filter(manager=user)
    
    elif role_name == 'adquisiciones':
        # Ve todo el flujo de compras
        pass
    
    elif role_name == 'almacen':
        # Ve órdenes confirmadas/en proceso para recepción
        ordenes = ordenes.filter(
            estado__in=['confirmada', 'parcial', 'entregada']
        )
        # Facturas de los proveedores de esas órdenes
        proveedores_ids = ordenes.values_list('proveedor_id', flat=True)
        facturas = facturas.filter(proveedor_id__in=proveedores_ids)
        # Solicitudes de esas órdenes (a través de cotización)
        solicitudes = solicitudes.filter(
            id__in=ordenes.values_list('cotizacion__solicitud_id', flat=True)
        ).distinct()
        # No ve cotizaciones
        cotizaciones = cotizaciones.none()
    
    elif role_name == 'proveedor':
        # Buscar el proveedor asociado al usuario
        try:
            proveedor = Proveedor.objects.get(user=user)
            # Solo sus cotizaciones
            cotizaciones = cotizaciones.filter(proveedor=proveedor)
            # Órdenes asignadas a él
            ordenes = ordenes.filter(proveedor=proveedor)
            # Solicitudes de esas órdenes (a través de cotización) o cotizaciones directas
            solicitudes_ids = list(ordenes.values_list('cotizacion__solicitud_id', flat=True))
            solicitudes_ids += list(cotizaciones.values_list('solicitud_id', flat=True))
            solicitudes = solicitudes.filter(id__in=solicitudes_ids)
            # Facturas del proveedor
            facturas = facturas.filter(proveedor=proveedor)
            # No ve áreas
            areas = areas.none()
        except Proveedor.DoesNotExist:
            # No tiene proveedor asociado, no ve nada
            solicitudes = solicitudes.none()
            cotizaciones = cotizaciones.none()
            ordenes = ordenes.none()
            facturas = facturas.none()
            areas = areas.none()
    
    else:
        # Rol desconocido - acceso mínimo (solo lo que creó)
        solicitudes = solicitudes.filter(created_by=user)
        cotizaciones = cotizaciones.none()  # No tiene cotizaciones propias
        ordenes = ordenes.filter(created_by=user)
        facturas = facturas.filter(uploaded_by=user)
        areas = areas.none()
    
    return {
        'solicitudes': solicitudes,
        'cotizaciones': cotizaciones,
        'ordenes': ordenes,
        'facturas': facturas,
        'areas': areas,
        'role_name': role_name,
    }


class DashboardStatsView(APIView):
    """Estadísticas generales del dashboard"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        first_day_of_month = today.replace(day=1)
        
        # Obtener querysets filtrados por rol
        qs = get_role_filtered_querysets(user)
        base_solicitudes = qs['solicitudes']
        base_cotizaciones = qs['cotizaciones']
        base_ordenes = qs['ordenes']
        base_facturas = qs['facturas']
        areas = qs['areas']
        role_name = qs['role_name']
        
        # Conteos de solicitudes
        solicitudes_pendientes = base_solicitudes.filter(
            estado__in=['borrador', 'enviado', 'en_cotizacion']
        ).count()
        
        solicitudes_aprobadas = base_solicitudes.filter(
            estado='autorizado'
        ).count()
        
        solicitudes_rechazadas = base_solicitudes.filter(
            estado='cancelado'
        ).count()
        
        # Cotizaciones pendientes
        cotizaciones_pendientes = base_cotizaciones.filter(
            estado='pendiente'
        ).count()
        
        # Órdenes
        ordenes_activas = base_ordenes.filter(
            estado__in=['borrador', 'enviada', 'confirmada', 'parcial']
        ).count()
        
        ordenes_completadas = base_ordenes.filter(
            estado='entregada'
        ).count()
        
        # Facturas (status en vez de estado)
        facturas_pendientes = base_facturas.filter(
            status='pendiente'
        ).count()
        
        facturas_procesadas = base_facturas.filter(
            status__in=['procesada', 'distribuida']
        ).count()
        
        # Totales del mes (usamos created_at ya que la fecha puede ser nula)
        total_gastado_mes = base_facturas.filter(
            created_at__gte=first_day_of_month,
            status__in=['procesada', 'distribuida']
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        # Presupuesto total de las áreas (según rol)
        total_presupuesto = areas.aggregate(
            total=Sum('presupuesto_anual')
        )['total'] or Decimal('0')
        
        # Presupuesto mensual aproximado
        presupuesto_mensual = total_presupuesto / 12 if total_presupuesto else Decimal('0')
        total_disponible = presupuesto_mensual - total_gastado_mes

        return Response({
            'solicitudes_pendientes': solicitudes_pendientes,
            'solicitudes_aprobadas': solicitudes_aprobadas,
            'solicitudes_rechazadas': solicitudes_rechazadas,
            'cotizaciones_pendientes': cotizaciones_pendientes,
            'ordenes_activas': ordenes_activas,
            'ordenes_completadas': ordenes_completadas,
            'facturas_pendientes': facturas_pendientes,
            'facturas_procesadas': facturas_procesadas,
            'total_gastado_mes': float(total_gastado_mes),
            'total_presupuesto': float(presupuesto_mensual),
            'total_disponible': float(total_disponible),
            'user_role': role_name,
        })


class GastosPorAreaView(APIView):
    """Gastos agrupados por área"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        first_day_of_month = today.replace(day=1)
        
        # Obtener querysets filtrados por rol
        qs = get_role_filtered_querysets(user)
        areas = qs['areas']
        qs['facturas']
        
        result = []
        
        for area in areas:
            # Gastos del mes para esta área (filtrados por rol)
            # Usamos distribuciones directas al área
            from apps.invoices.models import DistribucionGasto
            distribuciones = DistribucionGasto.objects.filter(
                area=area,
                created_at__gte=first_day_of_month
            )
            gastado = distribuciones.aggregate(total=Sum('monto'))['total'] or Decimal('0')
            
            # Presupuesto mensual del área
            presupuesto_mensual = (area.presupuesto_anual or Decimal('0')) / 12
            
            # Porcentaje
            porcentaje = (float(gastado) / float(presupuesto_mensual) * 100) if presupuesto_mensual > 0 else 0
            
            result.append({
                'area': area.name,
                'gastado': float(gastado),
                'presupuesto': float(presupuesto_mensual),
                'porcentaje': round(porcentaje, 2),
            })
        
        # Ordenar por gastado descendente
        result.sort(key=lambda x: x['gastado'], reverse=True)
        
        return Response(result)


class GastosMensualesView(APIView):
    """Gastos agrupados por mes (últimos 12 meses)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now().date()
        
        # Obtener querysets filtrados por rol
        qs = get_role_filtered_querysets(user)
        qs['facturas']
        areas = qs['areas']
        
        # Últimos 12 meses
        months = []
        for i in range(11, -1, -1):
            date = today - timedelta(days=i * 30)
            months.append(date.replace(day=1))
        
        # Presupuesto mensual total (según rol)
        total_presupuesto = areas.aggregate(
            total=Sum('presupuesto_anual')
        )['total'] or Decimal('0')
        presupuesto_mensual = float(total_presupuesto / 12) if total_presupuesto else 0
        
        # Gastos por mes (filtrado por rol, usando distribuciones)
        from apps.invoices.models import DistribucionGasto
        distribuciones = DistribucionGasto.objects.filter(
            created_at__gte=months[0]
        )
        
        # Filtrar según rol si es necesario
        role_name = qs['role_name']
        if role_name == 'area':
            distribuciones = distribuciones.filter(area__manager=user)
        elif role_name == 'proveedor':
            distribuciones = distribuciones.none()
        
        gastos_por_mes = distribuciones.annotate(
            mes=TruncMonth('created_at')
        ).values('mes').annotate(
            total=Sum('monto')
        ).order_by('mes')
        
        # Crear diccionario para lookup rápido
        gastos_dict = {g['mes'].strftime('%Y-%m'): float(g['total']) for g in gastos_por_mes}
        
        # Nombres de meses en español
        meses_es = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        
        result = []
        for month in months:
            key = month.strftime('%Y-%m')
            result.append({
                'mes': meses_es[month.month - 1],
                'gastado': gastos_dict.get(key, 0),
                'presupuestado': presupuesto_mensual,
            })
        
        return Response(result)


class SolicitudesRecientesView(APIView):
    """Últimas 5 solicitudes"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Obtener querysets filtrados por rol
        qs = get_role_filtered_querysets(user)
        base_solicitudes = qs['solicitudes']
        
        solicitudes = base_solicitudes.select_related('area').order_by('-created_at')[:5]
        
        result = []
        for sol in solicitudes:
            # Usar total_estimado del modelo (que ya está calculado)
            total = sol.total_estimado or Decimal('0')
            
            result.append({
                'id': sol.id,
                'numero': sol.numero,
                'area': sol.area.name if sol.area else 'Sin área',
                'estado': sol.estado,
                'fecha': sol.fecha_solicitud.strftime('%Y-%m-%d') if sol.fecha_solicitud else '',
                'total': float(total),
            })
        
        return Response(result)


class ActividadRecienteView(APIView):
    """Actividad reciente del sistema"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Obtener querysets filtrados por rol
        qs = get_role_filtered_querysets(user)
        base_solicitudes = qs['solicitudes']
        base_cotizaciones = qs['cotizaciones']
        base_ordenes = qs['ordenes']
        base_facturas = qs['facturas']
        
        actividades = []
        
        # Últimas solicitudes (filtradas por rol)
        solicitudes = base_solicitudes.select_related('created_by').order_by('-created_at')[:3]
        
        for sol in solicitudes:
            actividades.append({
                'id': f'sol-{sol.id}',
                'tipo': 'solicitud',
                'descripcion': f'Solicitud {sol.numero} - {sol.get_estado_display()}',
                'fecha': sol.created_at.strftime('%Y-%m-%d %H:%M') if sol.created_at else '',
                'usuario': sol.created_by.full_name if sol.created_by else 'Sistema',
            })
        
        # Últimas cotizaciones (filtradas por rol)
        # Nota: Cotizacion no tiene created_by, usamos proveedor en su lugar
        cotizaciones = base_cotizaciones.select_related('proveedor').order_by('-created_at')[:2]
        
        for cot in cotizaciones:
            actividades.append({
                'id': f'cot-{cot.id}',
                'tipo': 'cotizacion',
                'descripcion': f'Cotización {cot.numero} - {cot.get_estado_display()}',
                'fecha': cot.created_at.strftime('%Y-%m-%d %H:%M') if cot.created_at else '',
                'usuario': cot.proveedor.razon_social if cot.proveedor else 'Proveedor',
            })
        
        # Últimas órdenes (filtradas por rol)
        ordenes = base_ordenes.select_related('created_by').order_by('-created_at')[:2]
        
        for orden in ordenes:
            actividades.append({
                'id': f'ord-{orden.id}',
                'tipo': 'orden',
                'descripcion': f'Orden {orden.numero} - {orden.get_estado_display()}',
                'fecha': orden.created_at.strftime('%Y-%m-%d %H:%M') if orden.created_at else '',
                'usuario': orden.created_by.full_name if orden.created_by else 'Sistema',
            })
        
        # Últimas facturas (filtradas por rol)
        facturas = base_facturas.select_related('uploaded_by', 'proveedor').order_by('-created_at')[:2]
        
        for fac in facturas:
            actividades.append({
                'id': f'fac-{fac.id}',
                'tipo': 'factura',
                'descripcion': f'Factura {fac.folio or fac.uuid_cfdi[:8] if fac.uuid_cfdi else "N/A"} - {fac.get_status_display()}',
                'fecha': fac.created_at.strftime('%Y-%m-%d %H:%M') if fac.created_at else '',
                'usuario': fac.uploaded_by.full_name if fac.uploaded_by else 'Sistema',
            })
        
        # Ordenar por fecha
        actividades.sort(key=lambda x: x['fecha'], reverse=True)
        
        return Response(actividades[:5])


class ProveedorDashboardView(APIView):
    """Dashboard exclusivo para proveedores - Fase 9"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Verificar que es proveedor
        try:
            proveedor = Proveedor.objects.get(user=user)
        except Proveedor.DoesNotExist:
            return Response({
                'error': 'Usuario no tiene un perfil de proveedor asociado'
            }, status=400)
        
        today = timezone.now().date()
        first_day_of_month = today.replace(day=1)
        
        # Cotizaciones del proveedor
        mis_cotizaciones = Cotizacion.objects.filter(proveedor=proveedor)
        cotizaciones_pendientes = mis_cotizaciones.filter(estado='pendiente').count()
        cotizaciones_recibidas = mis_cotizaciones.filter(estado='recibida').count()
        cotizaciones_seleccionadas = mis_cotizaciones.filter(estado='seleccionada').count()
        
        # Órdenes del proveedor
        mis_ordenes = OrdenCompra.objects.filter(proveedor=proveedor)
        ordenes_nuevas = mis_ordenes.filter(estado='enviada').count()
        ordenes_confirmadas = mis_ordenes.filter(estado='confirmada').count()
        ordenes_parciales = mis_ordenes.filter(estado='parcial').count()
        ordenes_entregadas = mis_ordenes.filter(estado='entregada').count()
        
        # Facturas del proveedor
        mis_facturas = Factura.objects.filter(proveedor=proveedor)
        facturas_pendientes = mis_facturas.filter(status='pendiente').count()
        facturas_procesadas = mis_facturas.filter(status__in=['procesada', 'distribuida']).count()
        
        # Total facturado este mes
        total_facturado_mes = mis_facturas.filter(
            created_at__gte=first_day_of_month
        ).aggregate(total=Sum('total'))['total'] or Decimal('0')
        
        # Total histórico facturado
        total_facturado_historico = mis_facturas.aggregate(
            total=Sum('total')
        )['total'] or Decimal('0')
        
        # Información del proveedor
        info_proveedor = {
            'id': proveedor.id,
            'razon_social': proveedor.razon_social,
            'nombre_comercial': proveedor.nombre_comercial or proveedor.razon_social,
            'rfc': proveedor.rfc,
            'email': proveedor.contacto_email,
            'telefono': proveedor.contacto_telefono,
            'estado_cuenta': proveedor.estado,  # pendiente, activo, suspendido
        }
        
        # Órdenes recientes
        ordenes_recientes = []
        for orden in mis_ordenes.select_related('cotizacion').order_by('-created_at')[:5]:
            ordenes_recientes.append({
                'id': orden.id,
                'numero': orden.numero,
                'fecha_emision': orden.fecha_emision.strftime('%Y-%m-%d') if orden.fecha_emision else '',
                'fecha_entrega': orden.fecha_entrega_esperada.strftime('%Y-%m-%d') if orden.fecha_entrega_esperada else '',
                'total': float(orden.total or 0),
                'estado': orden.estado,
                'estado_display': orden.get_estado_display(),
            })
        
        # Solicitudes pendientes de cotización (para proveedores activos)
        solicitudes_abiertas = []
        if proveedor.estado == 'activo':
            # Solicitudes en estado "en_cotizacion" que el proveedor puede cotizar
            from apps.procurement.models import SolicitudMaterial
            sols_abiertas = SolicitudMaterial.objects.filter(
                estado='en_cotizacion'
            ).exclude(
                # Excluir las que ya cotizó
                id__in=mis_cotizaciones.values_list('solicitud_id', flat=True)
            ).select_related('area').order_by('-created_at')[:5]
            
            for sol in sols_abiertas:
                solicitudes_abiertas.append({
                    'id': sol.id,
                    'numero': sol.numero,
                    'descripcion': sol.descripcion or 'Sin descripción',
                    'area': sol.area.name if sol.area else 'N/A',
                    'fecha': sol.fecha_solicitud.strftime('%Y-%m-%d') if sol.fecha_solicitud else '',
                    'total_estimado': float(sol.total_estimado or 0),
                })
        
        return Response({
            'info_proveedor': info_proveedor,
            'estadisticas': {
                'cotizaciones_pendientes': cotizaciones_pendientes,
                'cotizaciones_recibidas': cotizaciones_recibidas,
                'cotizaciones_seleccionadas': cotizaciones_seleccionadas,
                'ordenes_nuevas': ordenes_nuevas,
                'ordenes_confirmadas': ordenes_confirmadas,
                'ordenes_parciales': ordenes_parciales,
                'ordenes_entregadas': ordenes_entregadas,
                'facturas_pendientes': facturas_pendientes,
                'facturas_procesadas': facturas_procesadas,
                'total_facturado_mes': float(total_facturado_mes),
                'total_facturado_historico': float(total_facturado_historico),
            },
            'ordenes_recientes': ordenes_recientes,
            'solicitudes_abiertas': solicitudes_abiertas,
        })


class SolicitudesParaCotizarView(APIView):
    """Lista de solicitudes abiertas para que el proveedor cotice - Fase 9"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Verificar que es proveedor
        try:
            proveedor = Proveedor.objects.get(user=user)
        except Proveedor.DoesNotExist:
            return Response({
                'error': 'Usuario no tiene un perfil de proveedor asociado'
            }, status=400)
        
        if proveedor.estado != 'activo':
            return Response({
                'error': 'Solo proveedores activos pueden ver solicitudes'
            }, status=403)
        
        # Cotizaciones ya hechas por este proveedor
        mis_cotizaciones = Cotizacion.objects.filter(proveedor=proveedor)
        solicitudes_cotizadas = mis_cotizaciones.values_list('solicitud_id', flat=True)
        
        # Solicitudes en estado "en_cotizacion" que NO ha cotizado aún
        from apps.procurement.models import SolicitudMaterial
        solicitudes = SolicitudMaterial.objects.filter(
            estado='en_cotizacion'
        ).exclude(
            id__in=solicitudes_cotizadas
        ).select_related('area').prefetch_related('detalles').order_by('-created_at')
        
        result = []
        for sol in solicitudes:
            detalles = []
            for det in sol.detalles.all():
                detalles.append({
                    'id': det.id,
                    'concepto': det.concepto,
                    'descripcion': det.descripcion,
                    'cantidad': float(det.cantidad or 0),
                    'unidad': det.unidad,
                    'precio_estimado': float(det.precio_estimado or 0),
                })
            
            result.append({
                'id': sol.id,
                'numero': sol.numero,
                'descripcion': sol.descripcion or '',
                'area': sol.area.name if sol.area else 'N/A',
                'fecha_solicitud': sol.fecha_solicitud.strftime('%Y-%m-%d') if sol.fecha_solicitud else '',
                'fecha_requerida': sol.fecha_requerida.strftime('%Y-%m-%d') if sol.fecha_requerida else '',
                'total_estimado': float(sol.total_estimado or 0),
                'detalles': detalles,
            })
        
        return Response(result)
