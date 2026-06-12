"""
Company models (AntePubli in the original system).
"""

from typing import Any
from django.db import models
from django.conf import settings


class Company(models.Model):
    """
    Company model (previously AntePubli).
    Represents an organization within a tenant.
    """
    objects: Any
    DoesNotExist: Any
    
    rfc = models.CharField(max_length=13, unique=True, verbose_name='RFC')
    razon_social = models.CharField(max_length=255, verbose_name='Razón Social')
    nombre_comercial = models.CharField(max_length=255, blank=True, verbose_name='Nombre Comercial')
    
    # Address
    calle = models.CharField(max_length=255, blank=True, verbose_name='Calle')
    numero_exterior = models.CharField(max_length=20, blank=True, verbose_name='Número Exterior')
    numero_interior = models.CharField(max_length=20, blank=True, verbose_name='Número Interior')
    colonia = models.CharField(max_length=255, blank=True, verbose_name='Colonia')
    municipio = models.CharField(max_length=255, blank=True, verbose_name='Municipio')
    estado = models.CharField(max_length=100, blank=True, verbose_name='Estado')
    codigo_postal = models.CharField(max_length=10, blank=True, verbose_name='Código Postal')
    
    # Contact
    telefono = models.CharField(max_length=20, blank=True, verbose_name='Teléfono')
    email = models.EmailField(blank=True, verbose_name='Correo electrónico')
    
    # Branding
    logo = models.ImageField(
        upload_to='company_logos/',
        blank=True,
        null=True,
        verbose_name='Logo'
    )
    
    membrete = models.ImageField(
        upload_to='company_membretes/',
        blank=True,
        null=True,
        verbose_name='Membrete Oficial'
    )
    
    pie_pagina = models.ImageField(
        upload_to='company_pies/',
        blank=True,
        null=True,
        verbose_name='Pie de Página'
    )
    
    # Status
    is_active = models.BooleanField(default=True, verbose_name='Activa')
    
    # Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='companies_created',
        verbose_name='Creado por'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')

    class Meta:
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'
        ordering = ['razon_social']

    def __str__(self):
        return str(self.razon_social)

    @property
    def direccion_completa(self):
        """Return complete address as string."""
        parts = [
            self.calle,
            self.numero_exterior,
            self.colonia,
            self.municipio,
            self.estado,
            self.codigo_postal
        ]
        return ', '.join(filter(None, parts))  # type: ignore[arg-type]


class Proveedor(models.Model):
    """
    Supplier/Provider model for external companies.
    """
    objects: Any
    DoesNotExist: Any
    
    class EstadoChoices(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente'
        ACTIVO = 'activo', 'Activo'
        SUSPENDIDO = 'suspendido', 'Suspendido'
    
    # Basic info
    rfc = models.CharField(max_length=13, unique=True, verbose_name='RFC')
    razon_social = models.CharField(max_length=255, verbose_name='Razón Social')
    nombre_comercial = models.CharField(max_length=255, blank=True, verbose_name='Nombre Comercial')
    
    # Contact
    contacto_nombre = models.CharField(max_length=255, blank=True, verbose_name='Nombre de contacto')
    contacto_email = models.EmailField(verbose_name='Email de contacto')
    contacto_telefono = models.CharField(max_length=20, blank=True, verbose_name='Teléfono de contacto')
    
    # Address
    direccion = models.TextField(blank=True, verbose_name='Dirección')
    
    # Branding
    logo = models.ImageField(
        upload_to='proveedor_logos/',
        blank=True,
        null=True,
        verbose_name='Logo'
    )
    
    membrete = models.ImageField(
        upload_to='proveedor_membretes/',
        blank=True,
        null=True,
        verbose_name='Membrete Oficial'
    )
    
    # Status
    estado = models.CharField(
        max_length=20,
        choices=EstadoChoices.choices,
        default=EstadoChoices.PENDIENTE,
        verbose_name='Estado'
    )
    
    # Link to user account (for provider portal)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='proveedor_profile',
        verbose_name='Usuario'
    )
    
    # Documents
    documentos = models.JSONField(default=list, blank=True, verbose_name='Documentos')
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de registro')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')

    class Meta:
        verbose_name = 'Proveedor'
        verbose_name_plural = 'Proveedores'
        ordering = ['razon_social']

    def __str__(self):
        return str(self.razon_social)


class ProductoProveedor(models.Model):
    """
    Catálogo de productos/servicios que ofrece un proveedor con sus precios.
    Permite generar cotizaciones automáticas al cruzar con solicitudes de material.
    """
    objects: Any
    DoesNotExist: Any

    proveedor = models.ForeignKey(
        Proveedor,
        on_delete=models.CASCADE,
        related_name='productos',
        verbose_name='Proveedor'
    )
    cog = models.ForeignKey(
        'procurement.Cog',
        on_delete=models.PROTECT,
        related_name='productos_proveedor',
        verbose_name='COG'
    )

    # Producto
    nombre = models.CharField(max_length=500, verbose_name='Nombre del producto/servicio')
    descripcion = models.TextField(blank=True, verbose_name='Descripción')
    unidad = models.CharField(max_length=50, verbose_name='Unidad de medida')
    precio_unitario = models.DecimalField(
        max_digits=15, decimal_places=2, verbose_name='Precio unitario'
    )
    marca = models.CharField(max_length=255, blank=True, verbose_name='Marca')
    modelo = models.CharField(max_length=255, blank=True, verbose_name='Modelo')

    # Estado
    is_active = models.BooleanField(default=True, verbose_name='Activo')

    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de creación')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Fecha de actualización')

    class Meta:
        verbose_name = 'Producto de Proveedor'
        verbose_name_plural = 'Productos de Proveedores'
        ordering = ['nombre']
        constraints = [
            models.UniqueConstraint(
                fields=['proveedor', 'nombre', 'unidad'],
                name='unique_producto_proveedor'
            )
        ]

    def __str__(self):
        return f"{self.nombre} - {self.proveedor.razon_social} (${self.precio_unitario})"


class FirmanteDocumento(models.Model):
    """Configuración de firmantes por tipo de documento y empresa."""
    objects: Any
    DoesNotExist: Any
    
    class TipoDocumentoChoices(models.TextChoices):
        SOLICITUD = 'solicitud', 'Solicitud de Materiales'
        COTIZACION = 'cotizacion', 'Cotización'
        SOLICITUD_AUTORIZACION = 'solicitud_autorizacion', 'Solicitud de Autorización'
        AUTORIZACION = 'autorizacion', 'Autorización Presupuestal'
        ORDEN_COMPRA = 'orden_compra', 'Orden de Compra'
        ENTREGA = 'entrega', 'Entrega/Recepción'
        SALIDA = 'salida', 'Salida de Almacén'
        SOLICITUD_GASTO = 'solicitud_gasto', 'Solicitud del Gasto'
        SOLICITUD_PAGO = 'solicitud_pago', 'Solicitud de Pago'
        DISTRIBUCION_GASTO = 'distribucion_gasto', 'Distribución del Gasto'
    
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='firmantes',
        verbose_name='Empresa'
    )
    
    tipo_documento = models.CharField(
        max_length=30,
        choices=TipoDocumentoChoices.choices,
        verbose_name='Tipo de Documento'
    )
    
    cargo = models.CharField(
        max_length=255,
        verbose_name='Cargo/Puesto',
        help_text='Ej: Sindicatura, Secretario Particular, Tesorero(a) Municipal'
    )
    
    nombre = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Nombre (fijo)',
        help_text='Si se deja vacío se usa el nombre del usuario vinculado'
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='firmante_como',
        verbose_name='Usuario'
    )
    
    sello_imagen = models.ImageField(
        upload_to='sellos_firmantes/',
        blank=True,
        null=True,
        verbose_name='Imagen del Sello'
    )
    
    orden = models.PositiveIntegerField(
        default=1,
        verbose_name='Orden',
        help_text='Posición de izquierda a derecha (1, 2, 3...)'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Firmante de Documento'
        verbose_name_plural = 'Firmantes de Documentos'
        ordering = ['tipo_documento', 'orden']
        unique_together = ['company', 'tipo_documento', 'orden']
    
    def __str__(self):
        nombre_display: str = self.nombre or (getattr(self.user, 'full_name', None) or '(sin asignar)') if self.user else '(sin asignar)'  # type: ignore[assignment]
        return f"{self.company.razon_social} - {self.get_tipo_documento_display()} - {nombre_display}"  # type: ignore[attr-defined]
    
    @property
    def nombre_completo(self):
        return self.nombre or (getattr(self.user, 'full_name', None) or '') if self.user else ''
