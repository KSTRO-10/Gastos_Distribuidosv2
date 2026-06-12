"""
Celery tasks for PDF generation.
"""

import logging

from celery import shared_task
from django.core.files.base import ContentFile
from django.contrib.contenttypes.models import ContentType

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def generate_document_pdf(self, document_type: str, object_id: int, user_id: int):
    """
    Generate PDF document asynchronously.
    
    Args:
        document_type: Type of document (solicitud, orden_compra, autorizacion)
        object_id: ID of the related object
        user_id: ID of the user requesting the document
    """
    from apps.documents.models import PDFDocument
    from apps.documents.services import (
        generate_solicitud_pdf,
        generate_orden_compra_pdf,
        generate_autorizacion_pdf,
        generate_cotizacion_pdf,
        generate_entrega_pdf,
        generate_salida_pdf,
        generate_solicitud_autorizacion_pdf,
    )
    
    try:
        if document_type == 'solicitud':
            from apps.procurement.models import SolicitudMaterial
            obj = SolicitudMaterial.objects.get(id=object_id)
            pdf_bytes = generate_solicitud_pdf(obj)
            nombre = f"Solicitud_{obj.numero}.pdf"
            content_type = ContentType.objects.get_for_model(obj)
            
        elif document_type == 'orden_compra':
            from apps.orders.models import OrdenCompra
            obj = OrdenCompra.objects.get(id=object_id)
            pdf_bytes = generate_orden_compra_pdf(obj)
            nombre = f"OrdenCompra_{obj.numero}.pdf"
            content_type = ContentType.objects.get_for_model(obj)
            
        elif document_type == 'autorizacion':
            from apps.orders.models import AutorizacionPresupuestal
            obj = AutorizacionPresupuestal.objects.get(id=object_id)
            pdf_bytes = generate_autorizacion_pdf(obj)
            nombre = f"Autorizacion_{obj.solicitud_autorizacion.numero}.pdf"
            content_type = ContentType.objects.get_for_model(obj)

        elif document_type == 'cotizacion':
            from apps.quotations.models import CotizacionMaterial
            obj = CotizacionMaterial.objects.get(id=object_id)
            pdf_bytes = generate_cotizacion_pdf(obj)
            nombre = f"Cotizacion_{obj.numero}.pdf"
            content_type = ContentType.objects.get_for_model(obj)

        elif document_type == 'entrega_bienes':
            from apps.inventory.models import EntregaBienes
            obj = EntregaBienes.objects.get(id=object_id)
            pdf_bytes = generate_entrega_pdf(obj)
            nombre = f"Entrega_{obj.numero}.pdf"
            content_type = ContentType.objects.get_for_model(obj)

        elif document_type == 'salida_almacen':
            from apps.inventory.models import SalidaBienes
            obj = SalidaBienes.objects.get(id=object_id)
            pdf_bytes = generate_salida_pdf(obj)
            nombre = f"Salida_{obj.numero}.pdf"
            content_type = ContentType.objects.get_for_model(obj)

        elif document_type == 'solicitud_autorizacion':
            from apps.orders.models import SolicitudAutorizacion
            obj = SolicitudAutorizacion.objects.get(id=object_id)
            pdf_bytes = generate_solicitud_autorizacion_pdf(obj)
            nombre = f"SolicitudAut_{obj.numero}.pdf"
            content_type = ContentType.objects.get_for_model(obj)

        else:
            raise ValueError(f"Unknown document type: {document_type}")
        
        # Create PDFDocument record
        doc = PDFDocument(
            content_type=content_type,
            object_id=object_id,
            tipo=document_type,
            nombre=nombre,
            generated_by_task=self.request.id or '',
            generated_by_id=user_id,
        )
        doc.pdf_file.save(nombre, ContentFile(pdf_bytes))
        doc.save()
        
        logger.info(f"Generated PDF document: {nombre}")
        return {'success': True, 'document_id': doc.id}
        
    except Exception as e:
        logger.exception(f"Error generating PDF: {e}")
        raise self.retry(exc=e, countdown=30 * (2 ** self.request.retries))
