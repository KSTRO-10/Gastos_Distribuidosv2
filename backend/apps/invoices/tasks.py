"""
Celery tasks for invoice processing.
"""

import logging
from decimal import Decimal
from datetime import datetime

from celery import shared_task
from django.db import transaction

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_cfdi_xml(self, factura_id: int):
    """
    Process uploaded CFDI XML file asynchronously.
    
    This task:
    1. Reads the XML file
    2. Parses CFDI structure
    3. Validates the data
    4. Updates the Factura record with extracted data
    5. Creates FacturaDetalle records for each concepto
    """
    from apps.invoices.models import Factura, FacturaDetalle
    from apps.invoices.services import parse_cfdi_xml, validate_cfdi_structure, validate_cfdi_math, CFDIParseError
    
    try:
        factura = Factura.objects.get(id=factura_id)
        
        # Update status to processing
        factura.status = Factura.EstadoChoices.PROCESANDO
        factura.save(update_fields=['status'])
        
        # Read XML file
        xml_content = factura.xml_file.read()
        
        # Parse CFDI
        data = parse_cfdi_xml(xml_content)
        
        # Validate structure
        errors = validate_cfdi_structure(data)
        if errors:
            raise CFDIParseError("; ".join(errors))
        
        # Validate CFDI math (subtotal vs conceptos, total vs cálculo)
        validate_cfdi_math(data)
        
        # Check for duplicate UUID
        uuid_from_xml = data['timbre']['uuid']
        existing = Factura.objects.filter(uuid_cfdi=uuid_from_xml).exclude(id=factura.id).first()
        if existing:
            raise CFDIParseError(f"Ya existe una factura con este UUID: {uuid_from_xml}. Folio existente: {existing.folio or 'N/A'}")
        
        # Update factura with parsed data
        factura.uuid_cfdi = uuid_from_xml
        factura.folio = data.get('folio', '')
        factura.serie = data.get('serie', '')
        
        # Parse date
        if data.get('fecha'):
            factura.fecha = datetime.fromisoformat(data['fecha'].replace('T', ' '))
        
        # Issuer/Receiver
        factura.rfc_emisor = data['emisor']['rfc']
        factura.nombre_emisor = data['emisor']['nombre']
        factura.rfc_receptor = data['receptor']['rfc']
        factura.nombre_receptor = data['receptor']['nombre']
        
        # Auto-detect proveedor from XML RFC if not already set
        if not factura.proveedor_id:
            from apps.companies.models import Proveedor
            rfc_emisor = data['emisor']['rfc']
            nombre_emisor = data['emisor']['nombre']
            
            # Try to find existing proveedor by RFC
            proveedor = Proveedor.objects.filter(rfc=rfc_emisor).first()
            
            if not proveedor:
                # Create new proveedor automatically
                proveedor = Proveedor.objects.create(
                    rfc=rfc_emisor,
                    razon_social=nombre_emisor,
                    nombre_comercial=nombre_emisor,
                    contacto_email=f'{rfc_emisor.lower()}@proveedor.temporal',  # Placeholder email
                    estado=Proveedor.EstadoChoices.ACTIVO,
                )
                logger.info(f"Created new proveedor from XML: {rfc_emisor} - {nombre_emisor}")
            
            factura.proveedor = proveedor
        
        # Amounts
        factura.subtotal = data['subtotal']
        factura.descuento = data.get('descuento', Decimal('0'))
        factura.total = data['total']
        factura.iva = data['impuestos']['total_impuestos_trasladados']
        
        # Payment info
        factura.forma_pago = data.get('forma_pago', '')
        factura.metodo_pago = data.get('metodo_pago', '')
        factura.moneda = data.get('moneda', 'MXN')
        factura.tipo_cambio = data.get('tipo_cambio', Decimal('1'))
        
        # Type
        factura.tipo_comprobante = data.get('tipo_comprobante', '')
        factura.uso_cfdi = data['receptor'].get('uso_cfdi', '')
        
        # Store full parsed JSON (convert Decimals to strings for JSON)
        def decimal_to_str(obj):
            if isinstance(obj, Decimal):
                return str(obj)
            elif isinstance(obj, dict):
                return {k: decimal_to_str(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [decimal_to_str(i) for i in obj]
            return obj
        
        factura.parsed_json = decimal_to_str(data)
        
        # Update status
        factura.status = Factura.EstadoChoices.PROCESADA
        factura.error_message = ''
        factura.save()
        
        # Create FacturaDetalle records
        for concepto in data['conceptos']:
            FacturaDetalle.objects.create(
                factura=factura,
                clave_prod_serv=concepto.get('clave_prod_serv', ''),
                no_identificacion=concepto.get('no_identificacion', ''),
                cantidad=concepto['cantidad'],
                clave_unidad=concepto.get('clave_unidad', ''),
                unidad=concepto.get('unidad', ''),
                descripcion=concepto['descripcion'],
                valor_unitario=concepto['valor_unitario'],
                importe=concepto['importe'],
                descuento=concepto.get('descuento', Decimal('0')),
                objeto_imp=concepto.get('objeto_imp', ''),
                impuestos=decimal_to_str(concepto.get('impuestos', {})),
            )
        
        logger.info(f"Successfully processed factura {factura_id}: {factura.uuid_cfdi}")
        return {'success': True, 'uuid': factura.uuid_cfdi}
        
    except Factura.DoesNotExist:
        logger.error(f"Factura {factura_id} not found")
        return {'success': False, 'error': 'Factura not found'}
        
    except CFDIParseError as e:
        logger.error(f"CFDI parse error for factura {factura_id}: {e}")
        Factura.objects.filter(id=factura_id).update(
            status=Factura.EstadoChoices.ERROR,
            error_message=str(e)
        )
        return {'success': False, 'error': str(e)}
        
    except Exception as e:
        logger.exception(f"Error processing factura {factura_id}: {e}")
        Factura.objects.filter(id=factura_id).update(
            status=Factura.EstadoChoices.ERROR,
            error_message=str(e)
        )
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task
def distribute_invoice_expenses(factura_id: int, distribution_data: list):
    """
    Distribute invoice expenses to areas asynchronously.
    
    Args:
        factura_id: ID of the factura to distribute
        distribution_data: List of dicts with area_id, concepto_id, monto, porcentaje
    """
    from apps.invoices.models import Factura, FacturaDetalle, DistribucionGasto
    from apps.areas.models import Area
    
    try:
        factura = Factura.objects.get(id=factura_id)
        
        with transaction.atomic():
            # Clean up previous distributions if re-distributing
            DistribucionGasto.objects.filter(factura=factura).delete()
            
            for dist in distribution_data:
                concepto = FacturaDetalle.objects.get(id=dist['concepto_id'])
                area = Area.objects.get(id=dist['area_id'])
                
                DistribucionGasto.objects.create(
                    factura=factura,
                    concepto=concepto,
                    area=area,
                    monto=Decimal(str(dist['monto'])),
                    porcentaje=Decimal(str(dist.get('porcentaje', 100))),
                    notas=dist.get('notas', ''),
                    created_by_id=dist['created_by_id']
                )
            
            factura.status = Factura.EstadoChoices.DISTRIBUIDA
            factura.save(update_fields=['status'])
        
        logger.info(f"Distributed expenses for factura {factura_id}")
        return {'success': True}
        
    except Exception as e:
        logger.exception(f"Error distributing factura {factura_id}: {e}")
        return {'success': False, 'error': str(e)}
