import logging
from io import BytesIO
from pathlib import Path
from django.utils import timezone

from django.template import loader
from django.conf import settings

logger = logging.getLogger(__name__)


def merge_pdfs_in_memory(pdf_bytes_list: list[bytes]) -> bytes:
    """Merge multiple in-memory PDFs (as bytes) into a single PDF (bytes)."""
    import io
    from pypdf import PdfReader, PdfWriter

    writer = PdfWriter()
    for pdf_bytes in pdf_bytes_list:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        for page in reader.pages:
            writer.add_page(page)
    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


# Template directory
TEMPLATE_DIR = Path(__file__).parent.parent / 'templates' / 'documents'


def get_base_context():
    """Obtiene el contexto base común para todos los PDFs (membrete, logos, etc.)"""
    from apps.companies.models import Company
    
    company = Company.objects.first()
    context = {'company': company}
    
    if company:
        if company.membrete and hasattr(company.membrete, 'path'):
            context['membrete_path'] = Path(company.membrete.path).as_posix()
        if company.logo and hasattr(company.logo, 'path'):
            context['logo_path'] = Path(company.logo.path).as_posix()
        if company.pie_pagina and hasattr(company.pie_pagina, 'path'):
            context['pie_path'] = Path(company.pie_pagina.path).as_posix()
            
    return context


def get_firmantes_context(tipo_documento):
    """Obtiene los firmantes configurados para un tipo de documento"""
    from apps.companies.models import FirmanteDocumento
    
    firmantes = FirmanteDocumento.objects.filter(tipo_documento=tipo_documento).order_by('orden')
    firmantes_data = []
    
    for f in firmantes:
        firmantes_data.append({
            'nombre_completo': f.nombre_completo,
            'cargo': f.cargo,
            'sello_path': Path(f.sello_imagen.path).as_posix() if f.sello_imagen and hasattr(f.sello_imagen, 'path') else None
        })
        
    return firmantes_data


def generate_pdf_from_html(html_content: str) -> bytes:
    """
    Generate PDF from HTML content using xhtml2pdf (pisa).
    Pure-Python, works on Windows without any native library dependencies.

    Args:
        html_content: HTML string to convert

    Returns:
        PDF content as bytes
    """
    try:
        from xhtml2pdf import pisa

        pdf_buffer = BytesIO()
        # encode to bytes so pisa handles encoding correctly
        result = pisa.CreatePDF(
            html_content.encode('utf-8'),
            dest=pdf_buffer,
            encoding='utf-8',
        )

        if result.err:
            raise RuntimeError(f"xhtml2pdf reported errors: {result.err}")

        return pdf_buffer.getvalue()

    except ImportError:
        logger.error("xhtml2pdf not installed. Run: pip install xhtml2pdf")
        raise
    except Exception as e:
        logger.exception(f"Error generating PDF: {e}")
        raise


def render_template(template_name: str, context: dict) -> str:
    """
    Render a Django template to HTML string.
    
    Args:
        template_name: Name of the template file
        context: Template context dictionary
        
    Returns:
        Rendered HTML string
    """
    template = loader.get_template(f'documents/{template_name}')
    return template.render(context)


def generate_solicitud_pdf(solicitud) -> bytes:
    """Generate PDF for a SolicitudMaterial."""
    context = get_base_context()
    
    # Contexto específico
    context.update({
        'solicitud': solicitud,
        'detalles': solicitud.detalles.all(),
        'area': solicitud.area,
        'fecha_solicitud': solicitud.fecha_solicitud,
        'lugar': 'Presidencia Municipal' # Consider making this dynamic later based on company
    })
    
    # Firmantes
    context['firmantes'] = get_firmantes_context('solicitud_material')
    
    html = render_template('solicitud_material.html', context)
    return generate_pdf_from_html(html)


def generate_orden_compra_pdf(orden) -> bytes:
    """Generate PDF for an OrdenCompra."""
    context = get_base_context()
    
    context.update({
        'orden': orden,
        'detalles': orden.detalles.all(),
        'proveedor': orden.proveedor,
    })
    
    # Firmantes
    context['firmantes'] = get_firmantes_context('orden_compra')
    
    html = render_template('orden_compra.html', context)
    return generate_pdf_from_html(html)


def generate_autorizacion_pdf(autorizacion) -> bytes:
    """Generate PDF for an AutorizacionPresupuestal."""
    context = get_base_context()

    context.update({
        'autorizacion': autorizacion,
        'solicitud': autorizacion.solicitud_autorizacion,
    })

    # Firmantes
    context['firmantes'] = get_firmantes_context('autorizacion')

    html = render_template('autorizacion.html', context)
    return generate_pdf_from_html(html)


def generate_cotizacion_pdf(cotizacion) -> bytes:
    """Generate PDF for a Cotizacion."""
    context = get_base_context()

    context.update({
        'cotizacion': cotizacion,
        'proveedor': cotizacion.proveedor,
        'detalles': cotizacion.detalles.all(),
        'lugar': 'Presidencia Municipal',
    })

    context['firmantes'] = get_firmantes_context('cotizacion')

    html = render_template('cotizacion.html', context)
    return generate_pdf_from_html(html)


def generate_entrega_pdf(entrega) -> bytes:
    """Generate PDF for an EntregaBienes."""
    context = get_base_context()

    context.update({
        'entrega': entrega,
        'orden': entrega.orden,
        'detalles': entrega.detalles.all(),
        'lugar': 'Presidencia Municipal',
    })

    context['firmantes'] = get_firmantes_context('entrega_bienes')

    # Photo evidence (rendered on a separate page after firmas)
    from apps.inventory.models import EvidenciaEntrega
    evidencias_qs = EvidenciaEntrega.objects.filter(
        entrega=entrega).order_by('created_at')
    fotos = []
    for ev in evidencias_qs:
        if ev.imagen and hasattr(ev.imagen, 'path'):
            fotos.append({
                'path': Path(ev.imagen.path).as_posix(),
                'descripcion': ev.descripcion or '',
                'fecha': ev.created_at,
            })
    context['evidencias'] = fotos

    html = render_template('entrega_bienes.html', context)
    return generate_pdf_from_html(html)


def generate_salida_pdf(salida) -> bytes:
    """Generate PDF for a SalidaAlmacen."""
    context = get_base_context()

    context.update({
        'salida': salida,
        'area': salida.area,
        'detalles': salida.detalles.all(),
        'lugar': 'Presidencia Municipal',
    })

    context['firmantes'] = get_firmantes_context('salida_almacen')

    html = render_template('salida_almacen.html', context)
    return generate_pdf_from_html(html)


def generate_solicitud_autorizacion_pdf(solicitud_aut) -> bytes:
    """Generate PDF for a SolicitudAutorizacion."""
    context = get_base_context()

    context.update({
        'solicitud_aut': solicitud_aut,
        'solicitud': solicitud_aut.solicitud,
        'detalles': solicitud_aut.solicitud.detalles.all(),
        'cotizacion': solicitud_aut.cotizacion,
    })

    context['firmantes'] = get_firmantes_context('solicitud_autorizacion')

    html = render_template('solicitud_autorizacion.html', context)
    return generate_pdf_from_html(html)


def generate_evidencias_pdf(entrega) -> bytes:
    """Generate a photo evidence sheet PDF for an EntregaBienes.

    Returns bytes with the rendered PDF, or None if no photos exist.
    """
    evidencias = entrega.evidencias.all().order_by('created_at')
    if not evidencias.exists():
        return None

    fotos = []
    for ev in evidencias:
        if ev.imagen and hasattr(ev.imagen, 'path'):
            fotos.append({
                'path': Path(ev.imagen.path).as_posix(),
                'descripcion': ev.descripcion or '',
                'fecha': ev.created_at,
            })

    if not fotos:
        return None

    context = get_base_context()
    context.update({
        'entrega': entrega,
        'fotos': fotos,
        'lugar': 'Presidencia Municipal',
    })
    context['firmantes'] = get_firmantes_context('entrega_bienes')

    html = render_template('evidencias_entrega.html', context)
    return generate_pdf_from_html(html)


def _safe_user_by_role(role_name):
    """Best-effort lookup of a user by role name. Returns None on any error."""
    try:
        from apps.accounts.models import User
        return User.objects.filter(role__name=role_name).first()
    except Exception:
        return None


def generate_solicitud_gasto_pdf(solicitud_gasto_id, tenant) -> bytes:
    """Generate PDF for a SolicitudGasto."""
    from decimal import Decimal
    from collections import defaultdict
    from apps.treasury.models import SolicitudGasto

    solicitud_gasto = SolicitudGasto.objects.select_related(
        'factura__proveedor', 'solicitante', 'tenant'
    ).prefetch_related('items__area').get(
        id=solicitud_gasto_id, tenant=tenant
    )

    subtotales_por_area = defaultdict(Decimal)
    for item in solicitud_gasto.items.all():
        subtotales_por_area[item.area_id] += item.costo_total

    context = get_base_context()
    context.update({
        'solicitud_gasto': solicitud_gasto,
        'lugar': context.get('company').municipio if context.get('company') else '',
        'presidente_municipal': _safe_user_by_role('PRESIDENTE'),
        'sindico_municipal': _safe_user_by_role('SINDICO'),
        'subtotales_por_area': dict(subtotales_por_area),
        'lema_anual': (tenant.settings or {}).get('lema_anual', ''),
    })

    context['firmantes'] = get_firmantes_context('solicitud_gasto')

    html = render_template('solicitud_gasto.html', context)
    return generate_pdf_from_html(html)


def generate_solicitud_pago_pdf(solicitud_pago_id, tenant) -> bytes:
    """Generate PDF for a SolicitudPago."""
    from apps.treasury.models import SolicitudPago

    solicitud_pago = SolicitudPago.objects.select_related(
        'solicitud_gasto__factura',
        'solicitud_gasto__factura__proveedor',
        'solicitud_gasto__solicitante'
    ).prefetch_related('items__area').get(
        id=solicitud_pago_id, tenant=tenant
    )

    context = get_base_context()
    context.update({
        'solicitud_pago': solicitud_pago,
        'lugar': context.get('company').municipio if context.get('company') else '',
        'tesorera': _safe_user_by_role('TESORERA'),
        'presidente_municipal': _safe_user_by_role('PRESIDENTE'),
        'lema_anual': (tenant.settings or {}).get('lema_anual', ''),
    })

    context['firmantes'] = get_firmantes_context('solicitud_pago')

    html = render_template('solicitud_pago.html', context)
    return generate_pdf_from_html(html)


def generate_distribucion_gasto_pdf(factura_id, tenant) -> bytes:
    """Generate PDF for the DistribucionGasto of a Factura."""
    from decimal import Decimal
    from collections import defaultdict
    from apps.invoices.models import Factura, DistribucionGasto

    factura = Factura.objects.select_related('proveedor').get(id=factura_id)

    distribuciones = (
        DistribucionGasto.objects
        .filter(factura=factura)
        .select_related('area', 'concepto')
        .order_by('area__name', 'id')
    )

    subtotales_por_area = defaultdict(Decimal)
    for d in distribuciones:
        subtotales_por_area[d.area_id] += d.monto

    context = get_base_context()
    context.update({
        'factura': factura,
        'distribuciones': distribuciones,
        'subtotales_por_area': dict(subtotales_por_area),
        'lugar': context.get('company').municipio if context.get('company') else '',
        'lema_anual': (tenant.settings or {}).get('lema_anual', '') if tenant else '',
    })

    context['firmantes'] = get_firmantes_context('distribucion_gasto')

    html = render_template('distribucion_gasto.html', context)
    return generate_pdf_from_html(html)


def generate_expediente_gasto_pdf(solicitud_gasto_id, tenant) -> bytes:
    """
    Generate a combined PDF:
      1. Solicitud de Gasto
      2. Distribucion de Gasto (from the linked factura)
      3. Solicitud de Pago (if exists)
    Returns bytes.
    """
    from apps.treasury.models import SolicitudGasto

    solicitud_gasto = SolicitudGasto.objects.select_related(
        'factura__proveedor', 'solicitante'
    ).prefetch_related('items__area').get(
        id=solicitud_gasto_id, tenant=tenant
    )

    gasto_bytes = generate_solicitud_gasto_pdf(solicitud_gasto_id, tenant)
    pdf_parts = [gasto_bytes]

    # Distribucion de gasto (from the linked factura)
    if solicitud_gasto.factura_id:
        try:
            dist_bytes = generate_distribucion_gasto_pdf(
                solicitud_gasto.factura_id, tenant
            )
            pdf_parts.append(dist_bytes)
        except Exception:
            logger.exception(
                "No se pudo generar distribucion_gasto para factura %s",
                solicitud_gasto.factura_id,
            )

    if hasattr(solicitud_gasto, 'solicitud_pago'):
        pago_bytes = generate_solicitud_pago_pdf(
            solicitud_gasto.solicitud_pago.id, tenant
        )
        pdf_parts.append(pago_bytes)

    if len(pdf_parts) == 1:
        return gasto_bytes

    return merge_pdfs_in_memory(pdf_parts)


def generate_expediente_completo_pdf(solicitud_gasto_id, tenant):
    """
    Traverses the full procurement cycle backwards from SolicitudGasto
    and merges all available documents in order.  Skips gracefully if
    a link is missing (quick_flow facturas have no order chain).

    Order:
    1. SolicitudMaterial PDF        (if found)
    2. Cotizacion PDF               (if found)
    3. SolicitudAutorizacion PDF    (if found)
    4. AutorizacionPresupuestal PDF (if found)
    5. OrdenCompra PDF              (if found)
    6. EntregaBienes PDF            (if found)
    7. SalidaBienes PDF             (best-effort — skipped, no direct FK)
    8. SolicitudGasto PDF           (always present)
    9. DistribucionGasto PDF        (always present if distribuciones exist)
    10. SolicitudPago PDF           (if exists)
    """
    from apps.treasury.models import SolicitudGasto
    from apps.invoices.models import DistribucionGasto
    from apps.orders.models import (
        OrdenCompra, SolicitudAutorizacion, AutorizacionPresupuestal,
    )
    from apps.procurement.models import SolicitudMaterial
    from apps.quotations.models import CotizacionMaterial
    from apps.inventory.models import EntregaBienes

    pdf_parts = []

    # Load root object
    solicitud_gasto = SolicitudGasto.objects.select_related(
        'factura',
    ).get(id=solicitud_gasto_id, tenant=tenant)
    factura = solicitud_gasto.factura

    # --- Steps 1-6: traverse backwards via EntregaBienes bridge ---
    # EntregaBienes links both OrdenCompra and Factura
    entrega = (
        EntregaBienes.objects
        .filter(factura=factura)
        .select_related('orden__cotizacion__solicitud')
        .first()
    )

    if entrega and entrega.orden:
        orden = entrega.orden

        # 1. SolicitudMaterial
        solicitud_mat = None
        if orden.cotizacion and orden.cotizacion.solicitud:
            solicitud_mat = orden.cotizacion.solicitud
            try:
                pdf_parts.append(generate_solicitud_pdf(solicitud_mat))
            except Exception:
                logger.exception("Expediente: error generating SolicitudMaterial PDF")

        # 2. Cotizacion
        if orden.cotizacion:
            try:
                pdf_parts.append(generate_cotizacion_pdf(orden.cotizacion))
            except Exception:
                logger.exception("Expediente: error generating Cotizacion PDF")

        # 3. SolicitudAutorizacion + 4. AutorizacionPresupuestal
        if solicitud_mat:
            sol_aut = SolicitudAutorizacion.objects.filter(
                solicitud=solicitud_mat,
            ).first()
            if sol_aut:
                try:
                    pdf_parts.append(
                        generate_solicitud_autorizacion_pdf(sol_aut))
                except Exception:
                    logger.exception(
                        "Expediente: error generating SolicitudAutorizacion PDF")
                if hasattr(sol_aut, 'autorizacion_presupuestal'):
                    try:
                        pdf_parts.append(
                            generate_autorizacion_pdf(
                                sol_aut.autorizacion_presupuestal))
                    except Exception:
                        logger.exception(
                            "Expediente: error generating AutorizacionPresupuestal PDF")

        # 5. OrdenCompra
        try:
            pdf_parts.append(generate_orden_compra_pdf(orden))
        except Exception:
            logger.exception("Expediente: error generating OrdenCompra PDF")

        # 6. EntregaBienes
        try:
            pdf_parts.append(generate_entrega_pdf(entrega))
        except Exception:
            logger.exception("Expediente: error generating EntregaBienes PDF")

    # 6b. Evidencias fotográficas de la entrega
    if entrega:
        try:
            ev_bytes = generate_evidencias_pdf(entrega)
            if ev_bytes:  # None when no photos exist
                pdf_parts.append(ev_bytes)
        except Exception:
            logger.exception("Expediente: error generating Evidencias PDF")

    # 7. SalidaBienes — best effort, no direct FK
    # Skip for now (disconnected model); include when FK is added.

    # 8. SolicitudGasto (always present)
    try:
        pdf_parts.append(
            generate_solicitud_gasto_pdf(solicitud_gasto_id, tenant))
    except Exception:
        logger.exception("Expediente: error generating SolicitudGasto PDF")

    # 9. DistribucionGasto
    if factura and DistribucionGasto.objects.filter(factura=factura).exists():
        try:
            pdf_parts.append(
                generate_distribucion_gasto_pdf(factura.id, tenant))
        except Exception:
            logger.exception(
                "Expediente: error generating DistribucionGasto PDF")

    # 10. SolicitudPago
    if hasattr(solicitud_gasto, 'solicitud_pago'):
        try:
            pdf_parts.append(
                generate_solicitud_pago_pdf(
                    solicitud_gasto.solicitud_pago.id, tenant))
        except Exception:
            logger.exception("Expediente: error generating SolicitudPago PDF")

    if not pdf_parts:
        raise ValueError(
            "No documents could be generated for this expediente")

    return merge_pdfs_in_memory(pdf_parts)
