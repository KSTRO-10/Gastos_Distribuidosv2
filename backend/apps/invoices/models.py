"""Invoice models - CFDI 4.0 processing."""

from django.db import models
from django.conf import settings


class Factura(models.Model):
    """CFDI 4.0 Invoice."""
    
    class EstadoChoices(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente de procesar'
        PROCESANDO = 'procesando', 'Procesando'
        PROCESADA = 'procesada', 'Procesada'
        ERROR = 'error', 'Error en procesamiento'
        DISTRIBUIDA = 'distribuida', 'Distribuida'
    
    proveedor = models.ForeignKey(
        'companies.Proveedor',
        on_delete=models.PROTECT,
        related_name='facturas',
        verbose_name='Proveedor',
        null=True,
        blank=True  # Will be auto-detected from XML RFC
    )
    
    # XML File
    xml_file = models.FileField(upload_to='facturas/xml/', verbose_name='Archivo XML')
    pdf_file = models.FileField(upload_to='facturas/pdf/', blank=True, null=True, verbose_name='Archivo PDF')
    
    # CFDI Data (extracted from XML)
    uuid_cfdi = models.CharField(max_length=36, unique=True, blank=True, null=True, verbose_name='UUID CFDI')
    folio = models.CharField(max_length=50, blank=True, verbose_name='Folio')
    serie = models.CharField(max_length=25, blank=True, verbose_name='Serie')
    fecha = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de emisión')
    
    # Issuer/Receiver
    rfc_emisor = models.CharField(max_length=13, blank=True, verbose_name='RFC Emisor')
    nombre_emisor = models.CharField(max_length=255, blank=True, verbose_name='Nombre Emisor')
    rfc_receptor = models.CharField(max_length=13, blank=True, verbose_name='RFC Receptor')
    nombre_receptor = models.CharField(max_length=255, blank=True, verbose_name='Nombre Receptor')
    
    # Amounts
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='Subtotal')
    descuento = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='Descuento')
    iva = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='IVA')
    isr = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='ISR Retenido')
    iva_retenido = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='IVA Retenido')
    total = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='Total')
    
    # Payment info
    forma_pago = models.CharField(max_length=10, blank=True, verbose_name='Forma de pago')
    metodo_pago = models.CharField(max_length=10, blank=True, verbose_name='Método de pago')
    moneda = models.CharField(max_length=10, default='MXN', verbose_name='Moneda')
    tipo_cambio = models.DecimalField(max_digits=10, decimal_places=4, default=1, verbose_name='Tipo de cambio')
    
    # CFDI type
    tipo_comprobante = models.CharField(max_length=10, blank=True, verbose_name='Tipo de comprobante')
    uso_cfdi = models.CharField(max_length=10, blank=True, verbose_name='Uso CFDI')
    
    # Full parsed data
    parsed_json = models.JSONField(default=dict, blank=True, verbose_name='JSON Parseado')
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=EstadoChoices.choices,
        default=EstadoChoices.PENDIENTE,
        verbose_name='Estado'
    )
    error_message = models.TextField(blank=True, verbose_name='Mensaje de error')
    
    # Quick flow flag
    is_quick_flow = models.BooleanField(
        default=False,
        verbose_name='Flujo rápido',
        help_text='Indica si la factura fue procesada mediante el flujo rápido (sin solicitud/orden previa)'
    )
    
    # Audit
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='facturas_uploaded',
        verbose_name='Subido por'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Factura'
        verbose_name_plural = 'Facturas'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.uuid_cfdi or 'Pendiente'} - {self.proveedor.razon_social}"


class FacturaDetalle(models.Model):
    """Invoice line item (concepto)."""
    
    factura = models.ForeignKey(
        Factura,
        on_delete=models.CASCADE,
        related_name='conceptos',
        verbose_name='Factura'
    )
    
    # Concept details
    clave_prod_serv = models.CharField(max_length=20, blank=True, verbose_name='Clave Prod/Serv')
    no_identificacion = models.CharField(max_length=100, blank=True, verbose_name='No. Identificación')
    cantidad = models.DecimalField(max_digits=15, decimal_places=4, verbose_name='Cantidad')
    clave_unidad = models.CharField(max_length=20, blank=True, verbose_name='Clave Unidad')
    unidad = models.CharField(max_length=50, blank=True, verbose_name='Unidad')
    descripcion = models.TextField(verbose_name='Descripción')
    valor_unitario = models.DecimalField(max_digits=15, decimal_places=6, verbose_name='Valor unitario')
    importe = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Importe')
    descuento = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='Descuento')
    
    # Object of tax (CFDI 4.0)
    objeto_imp = models.CharField(max_length=5, blank=True, verbose_name='Objeto de impuesto')
    
    # Taxes (JSON for flexibility)
    impuestos = models.JSONField(default=dict, blank=True, verbose_name='Impuestos')

    class Meta:
        verbose_name = 'Concepto de Factura'
        verbose_name_plural = 'Conceptos de Factura'

    def __str__(self):
        return f"{self.descripcion[:50]}..."


class DistribucionGasto(models.Model):
    """Expense distribution to areas."""
    
    factura = models.ForeignKey(
        Factura,
        on_delete=models.CASCADE,
        related_name='distribuciones',
        verbose_name='Factura'
    )
    concepto = models.ForeignKey(
        FacturaDetalle,
        on_delete=models.CASCADE,
        related_name='distribuciones',
        verbose_name='Concepto'
    )
    area = models.ForeignKey(
        'areas.Area',
        on_delete=models.PROTECT,
        related_name='gastos_distribuidos',
        verbose_name='Área'
    )
    solicitud = models.ForeignKey(
        'procurement.SolicitudMaterial',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='gastos_asociados',
        verbose_name='Solicitud origen'
    )
    
    monto = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Monto')
    porcentaje = models.DecimalField(max_digits=5, decimal_places=2, default=100, verbose_name='Porcentaje')
    notas = models.TextField(blank=True, verbose_name='Notas')
    
    # Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='distribuciones_creadas',
        verbose_name='Creado por'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Distribución de Gasto'
        verbose_name_plural = 'Distribuciones de Gasto'

    def __str__(self):
        return f"{self.factura.uuid_cfdi} -> {self.area.name}: ${self.monto}"
