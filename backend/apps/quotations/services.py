"""
Servicio de auto-cotización.
Genera cotizaciones automáticas cruzando solicitudes de material
con los catálogos de productos de proveedores.
"""

from decimal import Decimal
from django.db.models import Q
from django.utils import timezone

from apps.companies.models import ProductoProveedor, Proveedor
from apps.procurement.models import SolicitudMaterial, DetalleMaterial
from apps.quotations.models import CotizacionMaterial, CotizacionDetalle


def buscar_producto_para_detalle(detalle: DetalleMaterial, proveedor: Proveedor):
    """
    Busca en el catálogo de un proveedor un producto que coincida con un detalle de solicitud.
    Criterio: mismo COG + coincidencia textual en nombre/concepto.
    Retorna el ProductoProveedor más relevante o None.
    """
    productos = ProductoProveedor.objects.filter(
        proveedor=proveedor,
        cog=detalle.cog,
        is_active=True,
    )

    if not productos.exists():
        return None

    # Si hay coincidencia exacta de COG, buscar refinamiento textual
    concepto_lower = detalle.concepto.lower()
    palabras = [p for p in concepto_lower.split() if len(p) > 2]

    mejor = None
    mejor_score = 0

    for producto in productos:
        nombre_lower = producto.nombre.lower()
        desc_lower = (producto.descripcion or '').lower()
        texto_completo = f"{nombre_lower} {desc_lower}"

        # Calcular score de coincidencia
        score = 0
        for palabra in palabras:
            if palabra in texto_completo:
                score += 1

        # Bonus por coincidencia de unidad
        if detalle.unidad.lower().strip() == producto.unidad.lower().strip():
            score += 2

        if score > mejor_score:
            mejor_score = score
            mejor = producto

    # Si no hay coincidencia textual pero hay exactamente 1 producto con ese COG, usarlo
    if mejor is None and productos.count() == 1:
        mejor = productos.first()

    return mejor


def generar_cotizaciones_automaticas(solicitud: SolicitudMaterial):
    """
    Para una solicitud dada, busca en los catálogos de proveedores activos
    y genera cotizaciones automáticas solo para proveedores que cubran
    TODOS los ítems de la solicitud.

    Retorna dict con:
      - cotizaciones_creadas: lista de CotizacionMaterial creados
      - proveedores_parciales: lista de {proveedor, items_cubiertos, items_total}
      - sin_cobertura: True si ningún proveedor cubre al menos 1 ítem
    """
    detalles = list(solicitud.detalles.select_related('cog').all())

    if not detalles:
        return {
            'cotizaciones_creadas': [],
            'proveedores_parciales': [],
            'sin_cobertura': True,
        }

    # Obtener proveedores activos con catálogo
    proveedores = Proveedor.objects.filter(
        estado=Proveedor.EstadoChoices.ACTIVO,
        productos__is_active=True,
    ).distinct()

    cotizaciones_creadas = []
    proveedores_parciales = []

    for proveedor in proveedores:
        matches = []  # Lista de (detalle, producto) tuples

        for detalle in detalles:
            producto = buscar_producto_para_detalle(detalle, proveedor)
            if producto:
                matches.append((detalle, producto))

        if len(matches) == 0:
            continue

        if len(matches) < len(detalles):
            # Cobertura parcial — registrar pero no crear cotización
            proveedores_parciales.append({
                'proveedor_id': proveedor.id,
                'proveedor_nombre': proveedor.razon_social,
                'items_cubiertos': len(matches),
                'items_total': len(detalles),
            })
            continue

        # Cobertura total — verificar que no exista ya cotización auto para este proveedor
        if CotizacionMaterial.objects.filter(
            solicitud=solicitud,
            proveedor=proveedor,
        ).exists():
            continue

        # Crear cotización automática
        cotizacion = CotizacionMaterial.objects.create(
            solicitud=solicitud,
            proveedor=proveedor,
            fecha=timezone.now().date(),
            tiempo_entrega='Según catálogo',
            condiciones_pago='Según acuerdo',
            notas='Cotización generada automáticamente desde catálogo del proveedor.',
            estado=CotizacionMaterial.EstadoChoices.RECIBIDA,
        )

        # Crear detalles de la cotización
        for detalle, producto in matches:
            CotizacionDetalle.objects.create(
                cotizacion=cotizacion,
                detalle_material=detalle,
                concepto=producto.nombre,
                descripcion=producto.descripcion or detalle.descripcion,
                cantidad=detalle.cantidad,
                unidad=producto.unidad,
                precio_unitario=producto.precio_unitario,
            )

        cotizacion.update_totals()
        cotizaciones_creadas.append(cotizacion)

    return {
        'cotizaciones_creadas': cotizaciones_creadas,
        'proveedores_parciales': proveedores_parciales,
        'sin_cobertura': len(cotizaciones_creadas) == 0 and len(proveedores_parciales) == 0,
    }
