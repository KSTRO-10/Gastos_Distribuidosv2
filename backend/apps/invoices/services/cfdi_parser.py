"""
CFDI 4.0 XML Parser Service.
"""

import logging
from decimal import Decimal
from typing import Any

import xmltodict
from lxml import etree

logger = logging.getLogger(__name__)

# CFDI 4.0 Namespaces
CFDI_NAMESPACES = {
    'cfdi': 'http://www.sat.gob.mx/cfd/4',
    'tfd': 'http://www.sat.gob.mx/TimbreFiscalDigital',
    'xsi': 'http://www.w3.org/2001/XMLSchema-instance',
}


class CFDIParseError(Exception):
    """Error during CFDI parsing."""
    pass


def parse_cfdi_xml(xml_content: bytes) -> dict[str, Any]:
    """
    Parse CFDI 4.0 XML file and extract relevant data.
    
    Args:
        xml_content: Raw XML content as bytes
        
    Returns:
        Dictionary with parsed CFDI data
        
    Raises:
        CFDIParseError: If parsing fails
    """
    try:
        # Parse XML
        root = etree.fromstring(xml_content)
        
        # Also parse with xmltodict for full structure
        full_dict = xmltodict.parse(xml_content)
        
        # Get the Comprobante element
        comprobante = root
        
        # Helper to get case-insensitive attributes dictionary
        def get_attrs(node):
            if node is None: return {}
            return {k.lower(): v for k, v in node.attrib.items()}
            
        c_attrs = get_attrs(comprobante)
        
        # Extract basic attributes
        data = {
            'version': c_attrs.get('version', '4.0'),
            'serie': c_attrs.get('serie', ''),
            'folio': c_attrs.get('folio', ''),
            'fecha': c_attrs.get('fecha', ''),
            'forma_pago': c_attrs.get('formapago', ''),
            'condiciones_pago': c_attrs.get('condicionesdepago', ''),
            'subtotal': Decimal(c_attrs.get('subtotal', '0')),
            'descuento': Decimal(c_attrs.get('descuento', '0')),
            'moneda': c_attrs.get('moneda', 'MXN'),
            'tipo_cambio': Decimal(c_attrs.get('tipocambio', '1')),
            'total': Decimal(c_attrs.get('total', '0')),
            'tipo_comprobante': c_attrs.get('tipodecomprobante', ''),
            'exportacion': c_attrs.get('exportacion', ''),
            'metodo_pago': c_attrs.get('metodopago', ''),
            'lugar_expedicion': c_attrs.get('lugarexpedicion', ''),
        }
        
        # Parse Emisor (Issuer)
        emisor = comprobante.find('{*}Emisor')
        e_attrs = get_attrs(emisor)
        if emisor is not None:
            data['emisor'] = {
                'rfc': e_attrs.get('rfc', ''),
                'nombre': e_attrs.get('nombre', ''),
                'regimen_fiscal': e_attrs.get('regimenfiscal', ''),
            }
        else:
            data['emisor'] = {'rfc': '', 'nombre': '', 'regimen_fiscal': ''}
        
        # Parse Receptor (Receiver)
        receptor = comprobante.find('{*}Receptor')
        r_attrs = get_attrs(receptor)
        if receptor is not None:
            data['receptor'] = {
                'rfc': r_attrs.get('rfc', ''),
                'nombre': r_attrs.get('nombre', ''),
                'domicilio_fiscal': r_attrs.get('domiciliofiscalreceptor', ''),
                'regimen_fiscal': r_attrs.get('regimenfiscalreceptor', ''),
                'uso_cfdi': r_attrs.get('usocfdi', ''),
            }
        else:
            data['receptor'] = {'rfc': '', 'nombre': '', 'uso_cfdi': ''}
        
        # Parse Conceptos (Line items)
        conceptos = []
        conceptos_elem = comprobante.find('{*}Conceptos')
        if conceptos_elem is not None:
            for concepto in conceptos_elem.findall('{*}Concepto'):
                item_attrs = get_attrs(concepto)
                concepto_data = {
                    'clave_prod_serv': item_attrs.get('claveprodserv', ''),
                    'no_identificacion': item_attrs.get('noidentificacion', ''),
                    'cantidad': Decimal(item_attrs.get('cantidad', '0')),
                    'clave_unidad': item_attrs.get('claveunidad', ''),
                    'unidad': item_attrs.get('unidad', ''),
                    'descripcion': item_attrs.get('descripcion', ''),
                    'valor_unitario': Decimal(item_attrs.get('valorunitario', '0')),
                    'importe': Decimal(item_attrs.get('importe', '0')),
                    'descuento': Decimal(item_attrs.get('descuento', '0')),
                    'objeto_imp': item_attrs.get('objetoimp', ''),
                    'impuestos': {},
                }
                
                # Parse taxes for this concept
                impuestos_elem = concepto.find('{*}Impuestos')
                if impuestos_elem is not None:
                    traslados = []
                    retenciones = []
                    
                    traslados_elem = impuestos_elem.find('{*}Traslados')
                    if traslados_elem is not None:
                        for traslado in traslados_elem.findall('{*}Traslado'):
                            t_attrs = get_attrs(traslado)
                            traslados.append({
                                'base': Decimal(t_attrs.get('base', '0')),
                                'impuesto': t_attrs.get('impuesto', ''),
                                'tipo_factor': t_attrs.get('tipofactor', ''),
                                'tasa_cuota': Decimal(t_attrs.get('tasaocuota', '0')),
                                'importe': Decimal(t_attrs.get('importe', '0')),
                            })
                    
                    retenciones_elem = impuestos_elem.find('{*}Retenciones')
                    if retenciones_elem is not None:
                        for retencion in retenciones_elem.findall('{*}Retencion'):
                            rt_attrs = get_attrs(retencion)
                            retenciones.append({
                                'base': Decimal(rt_attrs.get('base', '0')),
                                'impuesto': rt_attrs.get('impuesto', ''),
                                'tipo_factor': rt_attrs.get('tipofactor', ''),
                                'tasa_cuota': Decimal(rt_attrs.get('tasaocuota', '0')),
                                'importe': Decimal(rt_attrs.get('importe', '0')),
                            })
                    
                    concepto_data['impuestos'] = {
                        'traslados': traslados,
                        'retenciones': retenciones,
                    }
                
                conceptos.append(concepto_data)
        
        data['conceptos'] = conceptos
        
        # Parse global Impuestos (Taxes)
        impuestos_global = comprobante.find('{*}Impuestos')
        ig_attrs = get_attrs(impuestos_global)
        if impuestos_global is not None:
            data['impuestos'] = {
                'total_impuestos_trasladados': Decimal(ig_attrs.get('totalimpuestostrasladados', '0')),
                'total_impuestos_retenidos': Decimal(ig_attrs.get('totalimpuestosretenidos', '0')),
            }
        else:
            data['impuestos'] = {
                'total_impuestos_trasladados': Decimal('0'),
                'total_impuestos_retenidos': Decimal('0'),
            }
        
        # Parse Complemento - TimbreFiscalDigital (UUID)
        timbre = comprobante.find('.//{*}TimbreFiscalDigital')
        tf_attrs = get_attrs(timbre)
        if timbre is not None:
            data['timbre'] = {
                'uuid': tf_attrs.get('uuid', ''),
                'fecha_timbrado': tf_attrs.get('fechatimbrado', ''),
                'rfc_prov_certif': tf_attrs.get('rfcprovcertif', ''),
                'no_certificado_sat': tf_attrs.get('nocertificadosat', ''),
            }
        else:
            data['timbre'] = {'uuid': ''}
        
        # Store full parsed structure
        data['raw'] = full_dict
        
        return data
        
    except etree.XMLSyntaxError as e:
        logger.error(f"XML syntax error: {e}")
        raise CFDIParseError(f"Error de sintaxis XML: {e}")
    except Exception as e:
        logger.exception(f"Error parsing CFDI: {e}")
        raise CFDIParseError(f"Error al parsear CFDI: {e}")


def validate_cfdi_math(data: dict) -> None:
    """
    Valida la coherencia matemática interna de un CFDI 4.0 parseado.

    Regla 1: La suma de los importes de todos los conceptos debe ser igual
             al subtotal del comprobante.
    Regla 2: subtotal - descuento + TotalImpuestosTrasladados - TotalImpuestosRetenidos
             debe ser igual al total del comprobante.

    Se usa una tolerancia de  $0.10 MXN  para absorber diferencias de
    redondeo permitidas por el SAT.

    Lanza ``rest_framework.exceptions.ValidationError`` (HTTP 400) si alguna
    regla falla o si los valores no se pueden convertir a Decimal.
    """
    from decimal import InvalidOperation
    from rest_framework.exceptions import ValidationError

    TOLERANCIA = Decimal('0.10')

    try:
        subtotal = Decimal(str(data.get('subtotal', '0')))
        descuento = Decimal(str(data.get('descuento', '0')))
        total = Decimal(str(data.get('total', '0')))

        impuestos = data.get('impuestos', {})
        total_traslados = Decimal(str(impuestos.get('total_impuestos_trasladados', '0')))
        total_retenidos = Decimal(str(impuestos.get('total_impuestos_retenidos', '0')))

        # --- Regla 1: suma de importes de conceptos == subtotal --------
        conceptos = data.get('conceptos', [])
        suma_importes = sum(
            (Decimal(str(c.get('importe', '0'))) for c in conceptos),
            Decimal('0'),
        )

        diferencia_subtotal = abs(suma_importes - subtotal)
        if diferencia_subtotal > TOLERANCIA:
            raise ValidationError(
                f"Error de validación matemática del CFDI: la suma de los importes "
                f"de los conceptos ({suma_importes}) no coincide con el subtotal "
                f"declarado ({subtotal}). Diferencia: {diferencia_subtotal}."
            )

        # --- Regla 2: subtotal - descuento + traslados - retenidos == total
        total_calculado = subtotal - descuento + total_traslados - total_retenidos
        diferencia_total = abs(total_calculado - total)
        if diferencia_total > TOLERANCIA:
            raise ValidationError(
                f"Error de validación matemática del CFDI: el total calculado "
                f"(subtotal {subtotal} - descuento {descuento} + traslados "
                f"{total_traslados} - retenidos {total_retenidos} = {total_calculado}) "
                f"no coincide con el total declarado ({total}). "
                f"Diferencia: {diferencia_total}."
            )

    except InvalidOperation as e:
        raise ValidationError(
            f"Error de validación matemática del CFDI: no se pudo convertir "
            f"un valor numérico a Decimal. Detalle: {e}"
        )


def validate_cfdi_structure(data: dict) -> list[str]:
    """
    Validate CFDI parsed data structure.
    
    Returns:
        List of validation errors (empty if valid)
    """
    errors = []
    
    if not data.get('timbre', {}).get('uuid'):
        errors.append("No se encontró UUID en el timbre fiscal")
    
    if not data.get('emisor', {}).get('rfc'):
        errors.append("No se encontró RFC del emisor")
    
    if not data.get('receptor', {}).get('rfc'):
        errors.append("No se encontró RFC del receptor")
    
    if not data.get('conceptos'):
        errors.append("No se encontraron conceptos en la factura")
    
    if data.get('total', 0) <= 0:
        errors.append("El total de la factura debe ser mayor a cero")
    
    return errors
