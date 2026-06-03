"""Order and Authorization models."""

from django.db import models
from django.conf import settings


class SolicitudAutorizacion(models.Model):
    """Authorization request for budget sufficiency."""
    
    class EstadoChoices(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente'
        APROBADA = 'aprobada', 'Aprobada'
        RECHAZADA = 'rechazada', 'Rechazada'
    
    solicitud = models.ForeignKey(
        'procurement.SolicitudMaterial',
        on_delete=models.CASCADE,
        related_name='autorizaciones_solicitadas',
        verbose_name='Solicitud de Material'
    )
    cotizacion = models.ForeignKey(
        'quotations.CotizacionMaterial',
        on_delete=models.SET_NULL,
        null=True,
        related_name='autorizaciones',
        verbose_name='Cotización seleccionada'
    )
    
    numero = models.CharField(max_length=50, unique=True, verbose_name='Número')
    fecha_solicitud = models.DateField(auto_now_add=True, verbose_name='Fecha de solicitud')
    monto_solicitado = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Monto solicitado')
    justificacion = models.TextField(blank=True, verbose_name='Justificación')
    
    estado = models.CharField(
        max_length=20,
        choices=EstadoChoices.choices,
        default=EstadoChoices.PENDIENTE,
        verbose_name='Estado'
    )
    
    # Motivo de rechazo (cuando aplica)
    motivo_rechazo = models.TextField(blank=True, verbose_name='Motivo de rechazo')
    
    # Audit
    solicitante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='autorizaciones_solicitadas',
        verbose_name='Solicitante'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Solicitud de Autorización'
        verbose_name_plural = 'Solicitudes de Autorización'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.numero} - {self.get_estado_display()}"

    def save(self, *args, **kwargs):
        if not self.numero:
            from django.utils import timezone
            year = timezone.now().year
            count = SolicitudAutorizacion.objects.filter(created_at__year=year).count() + 1
            self.numero = f"AUT-{year}-{count:05d}"
        super().save(*args, **kwargs)


class AutorizacionPresupuestal(models.Model):
    """Budget authorization granted by treasury."""
    
    solicitud_autorizacion = models.OneToOneField(
        SolicitudAutorizacion,
        on_delete=models.CASCADE,
        related_name='autorizacion_presupuestal',
        verbose_name='Solicitud de Autorización'
    )
    
    monto_autorizado = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Monto autorizado')
    partida_presupuestal = models.CharField(max_length=100, blank=True, verbose_name='Partida presupuestal')
    fecha_aprobacion = models.DateField(verbose_name='Fecha de aprobación')
    observaciones = models.TextField(blank=True, verbose_name='Observaciones')
    
    aprobado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='autorizaciones_aprobadas',
        verbose_name='Aprobado por'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Autorización Presupuestal'
        verbose_name_plural = 'Autorizaciones Presupuestales'

    def __str__(self):
        return f"Autorización {self.solicitud_autorizacion.numero}"


class OrdenCompra(models.Model):
    """Purchase order sent to supplier."""
    
    class EstadoChoices(models.TextChoices):
        BORRADOR = 'borrador', 'Borrador'
        ENVIADA = 'enviada', 'Enviada'
        CONFIRMADA = 'confirmada', 'Confirmada por Proveedor'
        PARCIAL = 'parcial', 'Parcialmente Entregada'
        ENTREGADA = 'entregada', 'Entregada'
        CANCELADA = 'cancelada', 'Cancelada'
    
    proveedor = models.ForeignKey(
        'companies.Proveedor',
        on_delete=models.PROTECT,
        related_name='ordenes_compra',
        verbose_name='Proveedor'
    )
    autorizacion = models.ForeignKey(
        AutorizacionPresupuestal,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='ordenes_compra',
        verbose_name='Autorización'
    )
    cotizacion = models.ForeignKey(
        'quotations.CotizacionMaterial',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ordenes_compra',
        verbose_name='Cotización'
    )
    
    numero = models.CharField(max_length=50, unique=True, verbose_name='Número')
    fecha_emision = models.DateField(verbose_name='Fecha de emisión')
    fecha_entrega_esperada = models.DateField(null=True, blank=True, verbose_name='Fecha de entrega esperada')
    
    # Totals
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='Subtotal')
    iva = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='IVA')
    total = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name='Total')
    
    # Terms
    condiciones_pago = models.TextField(blank=True, verbose_name='Condiciones de pago')
    lugar_entrega = models.TextField(blank=True, verbose_name='Lugar de entrega')
    notas = models.TextField(blank=True, verbose_name='Notas')
    
    estado = models.CharField(
        max_length=20,
        choices=EstadoChoices.choices,
        default=EstadoChoices.BORRADOR,
        verbose_name='Estado'
    )
    
    # External reference
    referencia_externa = models.CharField(max_length=100, blank=True, verbose_name='Referencia externa')
    
    # Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='ordenes_creadas',
        verbose_name='Creado por'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Orden de Compra'
        verbose_name_plural = 'Órdenes de Compra'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.numero} - {self.proveedor.razon_social}"

    def save(self, *args, **kwargs):
        if not self.numero:
            from django.utils import timezone
            year = timezone.now().year
            count = OrdenCompra.objects.filter(created_at__year=year).count() + 1
            self.numero = f"OC-{year}-{count:05d}"
        super().save(*args, **kwargs)

    def actualizar_estado_entrega(self):
        """
        Actualiza el estado de la orden basándose en las cantidades recibidas.
        Llamar después de registrar una entrega.
        """
        if self.estado in [self.EstadoChoices.CANCELADA, self.EstadoChoices.BORRADOR]:
            return  # No actualizar órdenes canceladas o en borrador
        
        detalles = self.detalles.all()
        if not detalles.exists():
            return
        
        total_ordenado = sum(d.cantidad for d in detalles)
        total_recibido = sum(d.cantidad_recibida for d in detalles)
        
        if total_recibido >= total_ordenado:
            # Todo entregado
            self.estado = self.EstadoChoices.ENTREGADA
        elif total_recibido > 0:
            # Entrega parcial
            self.estado = self.EstadoChoices.PARCIAL
        # Si no hay entregas, mantener estado actual
        
        self.save(update_fields=['estado'])


class DetalleOrden(models.Model):
    """Line item in a purchase order."""
    
    orden = models.ForeignKey(
        OrdenCompra,
        on_delete=models.CASCADE,
        related_name='detalles',
        verbose_name='Orden de Compra'
    )
    detalle_material = models.ForeignKey(
        'procurement.DetalleMaterial',
        on_delete=models.SET_NULL,
        null=True,
        related_name='detalles_orden',
        verbose_name='Material solicitado'
    )
    
    concepto = models.CharField(max_length=500, verbose_name='Concepto')
    descripcion = models.TextField(blank=True, verbose_name='Descripción')
    cantidad = models.DecimalField(max_digits=15, decimal_places=4, verbose_name='Cantidad')
    unidad = models.CharField(max_length=50, verbose_name='Unidad')
    precio_unitario = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Precio unitario')
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Subtotal')
    
    # Delivery tracking
    cantidad_recibida = models.DecimalField(max_digits=15, decimal_places=4, default=0, verbose_name='Cantidad recibida')

    class Meta:
        verbose_name = 'Detalle de Orden'
        verbose_name_plural = 'Detalles de Orden'

    def __str__(self):
        return f"{self.concepto} - {self.orden.numero}"

    def save(self, *args, **kwargs):
        self.subtotal = self.cantidad * self.precio_unitario
        super().save(*args, **kwargs)

    @property
    def cantidad_pendiente(self):
        return self.cantidad - self.cantidad_recibida
