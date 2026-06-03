# Plan: Sistema de PDFs con Membrete Configurable — Fase 1

**Versión:** 1.0  
**Fecha:** 5 de marzo de 2026  
**Módulos:** Procurement, Orders, Documents  
**Estado:** Planificación — listo para implementar  

---

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Alcance de Fase 1](#alcance-de-fase-1)
3. [Inventario Actual](#inventario-actual)
4. [Modelo de Datos](#modelo-de-datos)
5. [Templates HTML para PDFs](#templates-html-para-pdfs)
6. [Backend — Generadores y Task](#backend--generadores-y-task)
7. [Backend — Endpoints](#backend--endpoints)
8. [Frontend — Servicio y Admin](#frontend--servicio-y-admin)
9. [Frontend — Botones de Descarga PDF](#frontend--botones-de-descarga-pdf)
10. [Frontend — Formulario de Solicitud](#frontend--formulario-de-solicitud)
11. [Verificación y Testing](#verificación-y-testing)
12. [Decisiones de Diseño](#decisiones-de-diseño)
13. [Fases Futuras](#fases-futuras)

---

## Descripción General

El cliente solicitó la generación descargable de **9 documentos PDF** en el sistema de gestión de adquisiciones y gastos:

1. Solicitud de materiales de cada área
2. Cotización de materiales, bienes o servicios
3. Solicitud de autorización de suficiencia presupuestaria
4. Autorización de suficiencia presupuestaria
5. Orden de compra de materiales, bienes y/o servicios
6. Entrega/recepción de bienes o servicios
7. Salida de almacén
8. Solicitud del gasto
9. Solicitud de pago
10. Fotos de materiales (anexo)

**Diferenciador clave:** Las empresas (proveedores y administración municipal) podrán subir su **membrete oficial** (imagen completa de encabezado institucional); si no existe, se genera un **membrete genérico** con logo + datos de la empresa.

La infraestructura backend ya existe ~80% construida (WeasyPrint, `PDFDocument`, Celery task, endpoints REST). El trabajo se divide en **4 fases** según madurez de modelos y complejidad.

### Propósito

- Permitir descarga de documentos officialesestandarizados con branding institucional
- Reutilizar membrete oficial de cada empresa/proveedor en todos sus documentos
- Configurar firmantes por tipo de documento y empresa
- Escalar a otros 6 tipos de documentos en fases subsecuentes

---

## Alcance de Fase 1

**Documentos a implementar:**
- ✅ **1. Solicitud de Materiales** (oficio formal)
- ✅ **5. Orden de Compra** (tabular con branding)
- ✅ **4. Autorización de Suficiencia Presupuestaria** (oficio formal)

**Por qué estos 3:**
- Ya tienen modelos, serializers, viewsets y frontend completo
- Ya tienen stubs en `pdf_generator.py` (solo faltan templates)
- Son el flujo crítico: Solicitud → Cotización/Autorización → Orden
- Demuestran el patrón de membrete reutilizable para las demás fases

**Entregables:**
- 3 templates HTML reutilizables
- Sistema de membrete configurable (imagen uploadable con fallback genérico)
- Modelo `FirmanteDocumento` para firmantes configurables
- 3 nuevos campos opcionales en `SolicitudMaterial`
- Servicio frontend `documentService.ts` y `companyService.ts`
- Página admin `EmpresaConfigPage.tsx` para gestión de branding y firmantes
- Botones de descarga en detalle y lista de solicitudes y órdenes

**No incluido en Fase 1:**
- Cotización, Solicitud de Autorización, Entrega/Recepción, Salida, Solicitud del Gasto, Solicitud de Pago, Fotos

---

## Inventario Actual

### Estado de Infraestructura

| Componente | Estado | Ubicación |
|---|---|---|
| **WeasyPrint** | ✅ Instalado | `requirements/base.txt` |
| **Modelo PDFDocument** | ✅ Existe | `documents/models.py` |
| **Servicio pdf_generator** | ✅ Con stubs | `documents/services/pdf_generator.py` |
| **Task Celery** | ✅ Para 3 tipos | `documents/tasks.py` |
| **Endpoints REST** | ✅ CRUD + actions | `documents/views.py` |
| **TipoChoices** | ✅ Parcial | 7 tipos definidos, 3 implementados |
| **Templates HTML** | ❌ No existen | (Carpeta vacía) |
| **Membrete configurable** | ❌ No existe | |
| **Servicio frontend documentService** | ❌ No existe | |
| **Página admin Company** | ❌ No existe | Frontend |

### Modelos con Soporte PDF Fase 1

| Modelo | Archivo | Frontend | Stub PDF | Detalle |
|---|---|---|---|---|
| `SolicitudMaterial` | `procurement/models.py` | ✅ Completo | ✅ L100-108 | Header + 9 detalles |
| `OrdenCompra` | `orders/models.py` | ✅ Completo | ✅ L111-120 | Proveedor + detalles |
| `AutorizacionPresupuestal` | `orders/models.py` | ✅ (parcial) | ✅ L123-130 | Singleton vía relación 1:1 |

---

## Modelo de Datos

### A. Agregar campo `membrete` a `Company` y `Proveedor`

**Archivo:** `backend/apps/companies/models.py`

**Cambios:**

En el modelo `Company` (después del campo `logo`, ~L35-40):

```python
# Nuevo: Línea ~L40
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
```

**Notas:**
- `membrete`: Imagen completa del encabezado (tamaño recomendado: 2100×400px, PNG/JPG)
  - Incluye escudo, nombre de la institución, período, decoración
  - Si existe, se embebe en PDF como encabezado completo
  - Si NO existe, se genera membrete HTML genérico con logo + datos
- `pie_pagina`: Imagen del footer institucional (tamaño recomendado: 2100×80px)
  - Dirección, email, decoración inferior
  - Fallback: texto con datos de la empresa

En el modelo `Proveedor` (después del campo `logo`, ~L95-100):

```python
membrete = models.ImageField(
    upload_to='proveedor_membretes/',
    blank=True,
    null=True,
    verbose_name='Membrete Oficial'
)
```

**Migración:**
```bash
python manage.py makemigrations companies
python manage.py migrate
```

---

### B. Crear modelo `FirmanteDocumento`

**Archivo:** `backend/apps/companies/models.py`

Agregar al final del archivo:

```python
class FirmanteDocumento(models.Model):
    """Configuración de firmantes por tipo de documento y empresa."""
    
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
        nombre_display = self.nombre or (self.user.full_name if self.user else '(sin asignar)')
        return f"{self.company.razon_social} - {self.get_tipo_documento_display()} - {nombre_display}"
    
    @property
    def nombre_completo(self):
        return self.nombre or (self.user.full_name if self.user else '')
```

**Migraciones:**
```bash
python manage.py makemigrations companies
python manage.py migrate
```

---

### C. Agregar 3 campos a `SolicitudMaterial`

**Archivo:** `backend/apps/procurement/models.py`

En el modelo `SolicitudMaterial`, después del campo `justificacion` (~L69):

```python
eje_rector = models.TextField(
    blank=True,
    verbose_name='Eje Rector',
    help_text='Ej: Bienestar Social, Ambiente Sano, etc.'
)

programa_presupuestario = models.TextField(
    blank=True,
    verbose_name='Programa Presupuestario',
    help_text='Ej: Apoyar y subsidiar con recursos económicos a grupos vulnerables'
)

actividad = models.TextField(
    blank=True,
    verbose_name='Actividad o Acción',
    help_text='Ej: Apoyar económicamente o en especie a solicitudes procedentes'
)
```

**Actualizar serializers:** `backend/apps/procurement/serializers.py`

En `SolicitudMaterialSerializer` (~L30-40), agregar a `fields`:
```python
fields = [
    'id', 'numero', 'area', 'area_name', 'fecha_solicitud', 
    'descripcion', 'justificacion', 
    'eje_rector', 'programa_presupuestario', 'actividad',  # NUEVO
    'estado', 'estado_display', 'total_estimado', 'urgente', 
    'fecha_requerida', 'created_by', 'created_by_name', 'detalles',
    'created_at', 'updated_at'
]
```

En `SolicitudMaterialCreateSerializer` (~L50-60), agregar a `fields`:
```python
fields = [
    'area', 'fecha_solicitud', 'descripcion', 'justificacion',
    'eje_rector', 'programa_presupuestario', 'actividad',  # NUEVO
    'urgente', 'fecha_requerida', 'detalles'
]
```

**Migración:**
```bash
python manage.py makemigrations procurement
python manage.py migrate
```

---

### D. Crear Serializer y Admin para `FirmanteDocumento`

**Archivo:** `backend/apps/companies/serializers.py`

Agregar al final:

```python
class FirmanteDocumentoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(
        source='user.full_name',
        read_only=True
    )
    tipo_documento_display = serializers.CharField(
        source='get_tipo_documento_display',
        read_only=True
    )
    nombre_completo_display = serializers.SerializerMethodField()
    
    class Meta:
        model = FirmanteDocumento
        fields = [
            'id', 'company', 'tipo_documento', 'tipo_documento_display',
            'cargo', 'nombre', 'usuario_nombre', 'nombre_completo_display',
            'user', 'sello_imagen', 'orden', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_nombre_completo_display(self, obj):
        return obj.nombre_completo
```

**Archivo:** `backend/apps/companies/admin.py`

Agregar:

```python
from django.contrib import admin
from .models import Company, Proveedor, FirmanteDocumento

class FirmanteDocumentoInline(admin.TabularInline):
    model = FirmanteDocumento
    extra = 1
    fields = ['tipo_documento', 'cargo', 'nombre', 'user', 'sello_imagen', 'orden']
    ordering = ['tipo_documento', 'orden']

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Información General', {
            'fields': ('rfc', 'razon_social', 'nombre_comercial')
        }),
        ('Branding', {
            'fields': ('logo', 'membrete', 'pie_pagina')
        }),
        ('Dirección', {
            'fields': ('calle', 'numero_exterior', 'numero_interior', 'colonia', 
                      'municipio', 'estado', 'codigo_postal')
        }),
        ('Contacto', {
            'fields': ('telefono', 'email')
        }),
        ('Estatus', {
            'fields': ('is_active',)
        }),
        ('Auditoría', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    inlines = [FirmanteDocumentoInline]
    list_display = ('razon_social', 'rfc', 'is_active', 'created_at')
    search_fields = ('razon_social', 'rfc')
    readonly_fields = ('created_at', 'updated_at')
```

---

## Templates HTML para PDFs

### A. Crear estructura de directorios

```
backend/apps/documents/
└── templates/
    └── documents/
        ├── _base_documento.html          # Base reutilizable
        ├── solicitud_material.html        # Oficio formal
        ├── orden_compra.html              # Tabular/oficio híbrido
        └── autorizacion.html              # Oficio formal
```

**Comando:**
```bash
mkdir -p backend/apps/documents/templates/documents
```

---

### B. Template Base: `_base_documento.html`

**Archivo:** `backend/apps/documents/templates/documents/_base_documento.html`

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: letter;
            margin: 1cm;
            @bottom-center {
                content: "Página " counter(page) " de " counter(pages);
                font-size: 8pt;
                color: #666;
            }
        }

        * {
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #333;
        }

        .membrete-container {
            width: 100%;
            margin-bottom: 20px;
            border-bottom: 3px solid #1a472a;
        }

        .membrete-img {
            width: 100%;
            max-height: 200px;
            display: block;
        }

        .membrete-generico {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px;
            background-color: #f8f8f8;
        }

        .membrete-logo {
            width: 100px;
            height: 100px;
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
        }

        .membrete-datos {
            flex: 1;
            margin-left: 30px;
            text-align: center;
        }

        .membrete-datos h1 {
            font-size: 16pt;
            font-weight: bold;
            color: #1a472a;
            margin-bottom: 5px;
        }

        .membrete-datos p {
            font-size: 9pt;
            margin: 2px 0;
        }

        .meta-header {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
            font-size: 10pt;
        }

        .meta-item {
            display: flex;
            flex-direction: column;
        }

        .meta-label {
            font-weight: bold;
            color: #1a472a;
            margin-bottom: 3px;
        }

        .meta-value {
            color: #333;
        }

        .destinatario {
            margin-bottom: 20px;
            font-size: 10pt;
            line-height: 1.6;
        }

        .destinatario-titulo {
            font-weight: bold;
            margin-bottom: 5px;
        }

        .oficio-texto {
            text-align: justify;
            margin-bottom: 15px;
            line-height: 1.7;
            font-size: 11pt;
        }

        .seccion-datos {
            margin: 15px 0;
            padding: 10px;
            background-color: #f8f8f8;
            border-left: 4px solid #1a472a;
        }

        .seccion-label {
            font-weight: bold;
            color: #1a472a;
            margin-bottom: 5px;
        }

        .seccion-valor {
            color: #333;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 10pt;
        }

        thead {
            background-color: #1a472a;
            color: white;
        }

        th, td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
        }

        th {
            font-weight: bold;
            text-align: center;
        }

        td {
            background-color: white;
        }

        tbody tr:nth-child(even) {
            background-color: #f9f9f9;
        }

        .total-row {
            background-color: #e8e8e8;
            font-weight: bold;
        }

        .precio {
            text-align: right;
        }

        .cantidad {
            text-align: center;
        }

        .firmas-container {
            display: flex;
            justify-content: space-around;
            margin-top: 80px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
        }

        .firma-bloque {
            width: 30%;
            text-align: center;
        }

        .sello-img {
            width: 100%;
            max-width: 120px;
            max-height: 100px;
            margin-bottom: 10px;
            display: block;
            margin-left: auto;
            margin-right: auto;
        }

        .firma-linea {
            border-top: 1px solid #000;
            margin-bottom: 8px;
            height: 50px;
        }

        .firma-nombre {
            font-weight: bold;
            font-size: 10pt;
            margin-bottom: 2px;
        }

        .firma-cargo {
            font-size: 9pt;
            color: #666;
        }

        .pie-container {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 9pt;
            color: #666;
        }

        .pie-img {
            width: 100%;
            max-height: 80px;
            margin-bottom: 10px;
        }

        .pie-texto {
            line-height: 1.4;
            white-space: pre-wrap;
        }

        .cuerpo-contenido {
            margin: 20px 0;
        }

        .atentamente {
            margin-top: 40px;
            font-weight: bold;
            text-align: center;
        }
    </style>
</head>
<body>
    <!-- MEMBRETE -->
    <div class="membrete-container">
        {% if company.membrete %}
            <img src="file://{{ membrete_path }}" alt="Membrete" class="membrete-img">
        {% else %}
            <div class="membrete-generico">
                {% if company.logo %}
                    <div class="membrete-logo" style="background-image: url('file://{{ logo_path }}');"></div>
                {% endif %}
                <div class="membrete-datos">
                    <h1>{{ company.razon_social }}</h1>
                    <p><strong>{{ company.nombre_comercial }}</strong></p>
                    <p>{{ company.direccion_completa }}</p>
                    <p>{{ company.telefono }} | {{ company.email }}</p>
                </div>
            </div>
        {% endif %}
    </div>

    <!-- META INFORMACIÓN (dependencia, área, asunto, fecha) -->
    <div class="meta-header">
        {% block meta %}{% endblock %}
    </div>

    <!-- DESTINATARIO -->
    <div class="destinatario">
        {% block destinatario %}{% endblock %}
    </div>

    <!-- CUERPO PRINCIPAL -->
    <div class="cuerpo-contenido">
        {% block cuerpo %}{% endblock %}
    </div>

    <!-- ATENTAMENTE -->
    <div class="atentamente">
        ATENTAMENTE
    </div>

    <!-- FIRMAS -->
    <div class="firmas-container">
        {% for firmante in firmantes %}
            <div class="firma-bloque">
                {% if firmante.sello_imagen %}
                    <img src="file://{{ firmante.sello_path }}" alt="{{ firmante.cargo }}" class="sello-img">
                {% else %}
                    <div class="firma-linea"></div>
                {% endif %}
                <div class="firma-nombre">{{ firmante.nombre_completo }}</div>
                <div class="firma-cargo">{{ firmante.cargo }}</div>
            </div>
        {% endfor %}
    </div>

    <!-- PIE DE PÁGINA -->
    <div class="pie-container">
        {% if company.pie_pagina %}
            <img src="file://{{ pie_path }}" alt="Pie de página" class="pie-img">
        {% else %}
            <div class="pie-texto">
{{ company.razon_social }}
{{ company.direccion_completa }}
Teléfono: {{ company.telefono }} | Email: {{ company.email }}
            </div>
        {% endif %}
    </div>
</body>
</html>
```

---

### C. Template: `solicitud_material.html`

**Archivo:** `backend/apps/documents/templates/documents/solicitud_material.html`

```html
{% extends "documents/_base_documento.html" %}

{% block meta %}
    <div class="meta-item">
        <span class="meta-label">DEPENDENCIA:</span>
        <span class="meta-value">{{ company.razon_social }}</span>
    </div>
    <div class="meta-item">
        <span class="meta-label">ÁREA ADMINISTRATIVA:</span>
        <span class="meta-value">{{ area.name }}</span>
    </div>
    <div class="meta-item">
        <span class="meta-label">ASUNTO:</span>
        <span class="meta-value">SOLICITUD DE MATERIALES</span>
    </div>
    <div class="meta-item">
        <span class="meta-label">LUGAR Y FECHA:</span>
        <span class="meta-value">{{ lugar }}, {{ fecha_solicitud|date:'j \d\e F \d\e Y'|upper }}</span>
    </div>
{% endblock %}

{% block destinatario %}
    <div class="destinatario-titulo">A QUIEN CORRESPONDA:</div>
    {% if destinatario_tesoreria %}
        <p>
            Por este medio me dirijo a usted:
        </p>
        <p>
            <strong>{{ destinatario_tesoreria.full_name }}</strong><br>
            TESORERO(A) MUNICIPAL<br>
            PRESENTE
        </p>
    {% endif %}
    {% if destinatario_adquisiciones %}
        <p style="margin-top: 10px;">
            <strong>ATENCIÓN:</strong> {{ destinatario_adquisiciones.full_name }}<br>
            ENCARGADO DE ADQUISICIONES DE BIENES Y SERVICIOS
        </p>
    {% endif %}
{% endblock %}

{% block cuerpo %}
    <p class="oficio-texto">
        POR ESTE CONDUCTO ME DIRIJO A USTED DE LA MANERA MÁS RESPETUOSA, CON EL FIN DE SOLICITARLE 
        LOS SIGUIENTES MATERIALES LOS CUALES SON NECESARIOS PARA REALIZAR DE MANERA EFICIENTE LAS 
        ACTIVIDADES Y ACCIONES ENCOMENDADAS AL ÁREA A MI CARGO.
    </p>

    <p style="margin: 15px 0; font-weight: bold;">
        ESTOS MATERIALES SOLICITADOS SON CON CARGO AL SIGUIENTE PROGRAMA PRESUPUESTARIO:
    </p>

    {% if solicitud.eje_rector %}
        <div class="seccion-datos">
            <div class="seccion-label">EJE RECTOR:</div>
            <div class="seccion-valor">{{ solicitud.eje_rector }}</div>
        </div>
    {% endif %}

    {% if solicitud.programa_presupuestario %}
        <div class="seccion-datos">
            <div class="seccion-label">PROGRAMA PRESUPUESTARIO:</div>
            <div class="seccion-valor">{{ solicitud.programa_presupuestario }}</div>
        </div>
    {% endif %}

    {% if solicitud.actividad %}
        <div class="seccion-datos">
            <div class="seccion-label">ACTIVIDAD O ACCIÓN:</div>
            <div class="seccion-valor">{{ solicitud.actividad }}</div>
        </div>
    {% endif %}

    <p style="margin-top: 15px; font-weight: bold;">MATERIALES SOLICITADOS:</p>

    <table>
        <thead>
            <tr>
                <th style="width: 10%;">CANTIDAD</th>
                <th style="width: 15%;">UNIDAD DE MEDIDA</th>
                <th style="width: 75%;">CONCEPTO</th>
            </tr>
        </thead>
        <tbody>
            {% for detalle in detalles %}
                <tr>
                    <td class="cantidad">{{ detalle.cantidad }}</td>
                    <td class="cantidad">{{ detalle.unidad }}</td>
                    <td>
                        <strong>{{ detalle.concepto }}</strong>
                        {% if detalle.descripcion %}<br><small>{{ detalle.descripcion }}</small>{% endif %}
                    </td>
                </tr>
            {% endfor %}
        </tbody>
    </table>

    <p class="oficio-texto" style="margin-top: 20px;">
        SIN OTRO PARTICULAR DE MOMENTO Y ESPERANDO CONTAR CON SU VALIOSO APOYO, APROVECHO 
        LA OCASIÓN PARA ENVIARLE UN CORDIAL SALUDO.
    </p>
{% endblock %}
```

---

### D. Template: `orden_compra.html`

**Archivo:** `backend/apps/documents/templates/documents/orden_compra.html`

```html
{% extends "documents/_base_documento.html" %}

{% block meta %}
    <div class="meta-item">
        <span class="meta-label">ORDEN DE COMPRA:</span>
        <span class="meta-value">{{ orden.numero }}</span>
    </div>
    <div class="meta-item">
        <span class="meta-label">FECHA EMISIÓN:</span>
        <span class="meta-value">{{ orden.fecha_emision|date:'d/m/Y' }}</span>
    </div>
    <div class="meta-item">
        <span class="meta-label">PROVEEDOR:</span>
        <span class="meta-value">{{ orden.proveedor.razon_social }}</span>
    </div>
    <div class="meta-item">
        <span class="meta-label">FECHA ENTREGA ESPERADA:</span>
        <span class="meta-value">{% if orden.fecha_entrega_esperada %}{{ orden.fecha_entrega_esperada|date:'d/m/Y' }}{% else %}—{% endif %}</span>
    </div>
{% endblock %}

{% block destinatario %}
    <div class="destinatario-titulo">A: {{ orden.proveedor.razon_social }}</div>
    <p>
        {% if orden.proveedor.contacto_nombre %}
            Atención: {{ orden.proveedor.contacto_nombre }}<br>
        {% endif %}
        {{ orden.proveedor.direccion }}
    </p>
{% endblock %}

{% block cuerpo %}
    {% if orden.cotizacion.solicitud %}
        <p style="margin-bottom: 15px;">
            <strong>Solicitud origen:</strong> {{ orden.cotizacion.solicitud.numero }}
        </p>
    {% endif %}

    <p style="font-weight: bold; margin-bottom: 10px;">MATERIALES Y/O SERVICIOS SOLICITADOS:</p>

    <table>
        <thead>
            <tr>
                <th style="width: 5%; text-align: center;">#</th>
                <th style="width: 40%;">CONCEPTO</th>
                <th style="width: 10%; text-align: center;">CANTIDAD</th>
                <th style="width: 15%;">UNIDAD</th>
                <th style="width: 15%; text-align: right;">P. UNITARIO</th>
                <th style="width: 15%; text-align: right;">SUBTOTAL</th>
            </tr>
        </thead>
        <tbody>
            {% for detalle in detalles %}
                <tr>
                    <td class="cantidad">{{ forloop.counter }}</td>
                    <td>
                        <strong>{{ detalle.concepto }}</strong>
                        {% if detalle.descripcion %}<br><small>{{ detalle.descripcion }}</small>{% endif %}
                    </td>
                    <td class="cantidad">{{ detalle.cantidad }}</td>
                    <td class="cantidad">{{ detalle.unidad }}</td>
                    <td class="precio">${{ detalle.precio_unitario }}</td>
                    <td class="precio"><strong>${{ detalle.subtotal }}</strong></td>
                </tr>
            {% endfor %}
            <tr class="total-row">
                <td colspan="5" style="text-align: right;">SUBTOTAL:</td>
                <td class="precio">${{ orden.subtotal }}</td>
            </tr>
            <tr class="total-row">
                <td colspan="5" style="text-align: right;">IVA (16%):</td>
                <td class="precio">${{ orden.iva }}</td>
            </tr>
            <tr class="total-row">
                <td colspan="5" style="text-align: right; font-size: 12pt;">TOTAL:</td>
                <td class="precio" style="font-size: 12pt;">${{ orden.total }}</td>
            </tr>
        </tbody>
    </table>

    {% if orden.condiciones_pago %}
        <div class="seccion-datos">
            <div class="seccion-label">CONDICIONES DE PAGO:</div>
            <div class="seccion-valor">{{ orden.condiciones_pago }}</div>
        </div>
    {% endif %}

    {% if orden.lugar_entrega %}
        <div class="seccion-datos">
            <div class="seccion-label">LUGAR DE ENTREGA:</div>
            <div class="seccion-valor">{{ orden.lugar_entrega }}</div>
        </div>
    {% endif %}

    {% if orden.notas %}
        <div class="seccion-datos">
            <div class="seccion-label">NOTAS:</div>
            <div class="seccion-valor">{{ orden.notas }}</div>
        </div>
    {% endif %}

    <div style="margin-top: 20px; padding: 15px; background-color: #f0f0f0; border: 1px solid #ccc;">
        <p style="font-weight: bold; margin-bottom: 10px;">DATOS PARA FACTURACIÓN:</p>
        <p>
            RFC: {{ company.rfc }}<br>
            Razón Social: {{ company.razon_social }}<br>
            Domicilio: {{ company.direccion_completa }}
        </p>
    </div>
{% endblock %}
```

---

### E. Template: `autorizacion.html`

**Archivo:** `backend/apps/documents/templates/documents/autorizacion.html`

```html
{% extends "documents/_base_documento.html" %}

{% block meta %}
    <div class="meta-item">
        <span class="meta-label">TIPO:</span>
        <span class="meta-value">AUTORIZACIÓN PRESUPUESTARIA</span>
    </div>
    <div class="meta-item">
        <span class="meta-label">REFERENCIA:</span>
        <span class="meta-value">{{ autorizacion.solicitud_autorizacion.numero }}</span>
    </div>
    <div class="meta-item">
        <span class="meta-label">FECHA AUTORIZACIÓN:</span>
        <span class="meta-value">{{ autorizacion.fecha_aprobacion|date:'d/m/Y' }}</span>
    </div>
    <div class="meta-item">
        <span class="meta-label">AUTORIZADO POR:</span>
        <span class="meta-value">{{ autorizacion.aprobado_por.full_name }}</span>
    </div>
{% endblock %}

{% block destinatario %}
    <div class="destinatario-titulo">MEMORÁNDUM DE AUTORIZACIÓN</div>
    <p>
        Se autoriza por este medio la suficiencia presupuestaria solicitada conforme a los términos 
        establecidos en la normatividad fiscal y presupuestaria aplicable.
    </p>
{% endblock %}

{% block cuerpo %}
    <div class="seccion-datos">
        <div class="seccion-label">SOLICITUD ORIGEN:</div>
        <div class="seccion-valor">{{ autorizacion.solicitud_autorizacion.numero }}</div>
    </div>

    <div class="seccion-datos">
        <div class="seccion-label">MONTO SOLICITADO:</div>
        <div class="seccion-valor">${{ autorizacion.solicitud_autorizacion.monto_solicitado }}</div>
    </div>

    <div class="seccion-datos">
        <div class="seccion-label">MONTO AUTORIZADO:</div>
        <div class="seccion-valor"><strong>${{ autorizacion.monto_autorizado }}</strong></div>
    </div>

    <div class="seccion-datos">
        <div class="seccion-label">PARTIDA PRESUPUESTAL:</div>
        <div class="seccion-valor">{{ autorizacion.partida_presupuestal }}</div>
    </div>

    {% if autorizacion.solicitud_autorizacion.justificacion %}
        <div class="seccion-datos">
            <div class="seccion-label">JUSTIFICACIÓN:</div>
            <div class="seccion-valor">{{ autorizacion.solicitud_autorizacion.justificacion }}</div>
        </div>
    {% endif %}

    {% if autorizacion.observaciones %}
        <div class="seccion-datos">
            <div class="seccion-label">OBSERVACIONES:</div>
            <div class="seccion-valor">{{ autorizacion.observaciones }}</div>
        </div>
    {% endif %}

    <p class="oficio-texto" style="margin-top: 25px;">
        Este documento ampara la ejecución presupuestaria bajo la responsabilidad fiscal de los oficios 
        directamente involucrados en la operación de la presente autorización.
    </p>
{% endblock %}
```

---

## Backend — Generadores y Task

### A. Enriquecer `pdf_generator.py`

**Archivo:** `backend/apps/documents/services/pdf_generator.py`

Actualizar las 3 funciones para inyectar contexto completo con branding. Las funciones existentes (~L100, L111, L123) deben modificarse:

**`generate_solicitud_pdf(solicitud)`** (~L100-108):

```python
def generate_solicitud_pdf(solicitud) -> bytes:
    """Generate PDF for a SolicitudMaterial."""
    from django.core.files.storage import default_storage
    from pathlib import Path
    import os
    
    company = solicitud.area.company
    area = solicitud.area
    
    # Get users for destinatarios
    from apps.accounts.models import User, Role
    destinatario_tesoreria = User.objects.filter(
        role__name=Role.RoleType.TESORERIA
    ).first()
    destinatario_adquisiciones = User.objects.filter(
        role__name=Role.RoleType.ADQUISICIONES
    ).first()
    
    # Get firmantes for this company and document type
    from apps.companies.models import FirmanteDocumento
    firmantes = FirmanteDocumento.objects.filter(
        company=company,
        tipo_documento='solicitud'
    ).order_by('orden')
    
    # Prepare image paths
    membrete_path = None
    logo_path = None
    pie_path = None
    
    if company.membrete:
        membrete_path = company.membrete.path
    if company.logo:
        logo_path = company.logo.path
    if company.pie_pagina:
        pie_path = company.pie_pagina.path
    
    # Prepare firmantes with sello paths
    firmantes_list = []
    for firmante in firmantes:
        sello_path = firmante.sello_imagen.path if firmante.sello_imagen else None
        firmantes_list.append({
            'nombre_completo': firmante.nombre_completo,
            'cargo': firmante.cargo,
            'sello_path': sello_path
        })
    
    context = {
        'solicitud': solicitud,
        'company': company,
        'area': area,
        'detalles': solicitud.detalles.select_related('cog').all(),
        'destinatario_tesoreria': destinatario_tesoreria,
        'destinatario_adquisiciones': destinatario_adquisiciones,
        'firmantes': firmantes_list,
        'lugar': company.municipio or 'Municipio',
        'fecha_solicitud': solicitud.fecha_solicitud,
        'membrete_path': membrete_path,
        'logo_path': logo_path,
        'pie_path': pie_path,
    }
    
    html = render_template('solicitud_material.html', context)
    return generate_pdf_from_html(html)
```

**`generate_orden_compra_pdf(orden)`** (~L111-120):

```python
def generate_orden_compra_pdf(orden) -> bytes:
    """Generate PDF for an OrdenCompra."""
    from apps.companies.models import FirmanteDocumento
    
    company = orden.created_by.area_assignments.first().area.company if \
              orden.created_by.area_assignments.exists() else \
              Company.objects.filter(is_active=True).first()
    
    detalles = orden.detalles.all()
    
    # Get firmantes
    firmantes = FirmanteDocumento.objects.filter(
        company=company,
        tipo_documento='orden_compra'
    ).order_by('orden')
    
    # Prepare image paths
    membrete_path = None
    logo_path = None
    pie_path = None
    
    if company.membrete:
        membrete_path = company.membrete.path
    if company.logo:
        logo_path = company.logo.path
    if company.pie_pagina:
        pie_path = company.pie_pagina.path
    
    # Prepare firmantes
    firmantes_list = []
    for firmante in firmantes:
        sello_path = firmante.sello_imagen.path if firmante.sello_imagen else None
        firmantes_list.append({
            'nombre_completo': firmante.nombre_completo,
            'cargo': firmante.cargo,
            'sello_path': sello_path
        })
    
    context = {
        'orden': orden,
        'company': company,
        'detalles': detalles,
        'proveedor': orden.proveedor,
        'firmantes': firmantes_list,
        'membrete_path': membrete_path,
        'logo_path': logo_path,
        'pie_path': pie_path,
    }
    
    html = render_template('orden_compra.html', context)
    return generate_pdf_from_html(html)
```

**`generate_autorizacion_pdf(autorizacion)`** (~L123-130):

```python
def generate_autorizacion_pdf(autorizacion) -> bytes:
    """Generate PDF for an AutorizacionPresupuestal."""
    from apps.companies.models import FirmanteDocumento
    from apps.companies.models import Company
    
    solicitud_auth = autorizacion.solicitud_autorizacion
    solicitud_material = solicitud_auth.solicitud
    company = solicitud_material.area.company
    
    # Get firmantes
    firmantes = FirmanteDocumento.objects.filter(
        company=company,
        tipo_documento='autorizacion'
    ).order_by('orden')
    
    # Prepare image paths
    membrete_path = None
    logo_path = None
    pie_path = None
    
    if company.membrete:
        membrete_path = company.membrete.path
    if company.logo:
        logo_path = company.logo.path
    if company.pie_pagina:
        pie_path = company.pie_pagina.path
    
    # Prepare firmantes
    firmantes_list = []
    for firmante in firmantes:
        sello_path = firmante.sello_imagen.path if firmante.sello_imagen else None
        firmantes_list.append({
            'nombre_completo': firmante.nombre_completo,
            'cargo': firmante.cargo,
            'sello_path': sello_path
        })
    
    context = {
        'autorizacion': autorizacion,
        'solicitud_autorizacion': solicitud_auth,
        'solicitud_material': solicitud_material,
        'company': company,
        'firmantes': firmantes_list,
        'membrete_path': membrete_path,
        'logo_path': logo_path,
        'pie_path': pie_path,
    }
    
    html = render_template('autorizacion.html', context)
    return generate_pdf_from_html(html)
```

---

## Backend — Endpoints

### A. Action `generar_pdf` en ViewSets

**Archivo:** `backend/apps/procurement/views.py`

En `SolicitudMaterialViewSet` (después de `buscar_cotizaciones_catalogo()` action):

```python
@action(detail=True, methods=['post'], url_path='generar-pdf')
def generar_pdf(self, request, pk=None):
    """Generate PDF for this solicitud."""
    solicitud = self.get_object()
    
    # Validaciones
    if solicitud.estado == 'borrador':
        return Response(
            {'error': 'No se puede generar PDF de solicitudes en estado borrador'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Encolar tarea Celery
    from apps.documents.tasks import generate_document_pdf
    
    if settings.CELERY_TASK_ALWAYS_EAGER:
        # Dev: ejecutar sincrónicamente y retornar document_id
        result = generate_document_pdf.apply().get()
        return Response({
            'document_id': result.get('document_id'),
            'nombre': f'Solicitud_{solicitud.numero}.pdf'
        }, status=status.HTTP_200_OK)
    else:
        # Prod: async, retornar task_id
        task = generate_document_pdf.delay('solicitud', solicitud.id, request.user.id)
        return Response({
            'task_id': task.id,
            'message': 'La generación del documento se realizará en segundo plano.'
        }, status=status.HTTP_202_ACCEPTED)
```

**Archivo:** `backend/apps/orders/views.py`

Similar en `OrdenCompraViewSet`:

```python
@action(detail=True, methods=['post'], url_path='generar-pdf')
def generar_pdf(self, request, pk=None):
    """Generate PDF for this orden de compra."""
    orden = self.get_object()
    
    if orden.estado == 'borrador':
        return Response(
            {'error': 'No se puede generar PDF de órdenes en estado borrador'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    from apps.documents.tasks import generate_document_pdf
    
    if settings.CELERY_TASK_ALWAYS_EAGER:
        result = generate_document_pdf.apply().get()
        return Response({
            'document_id': result.get('document_id'),
            'nombre': f'OrdenCompra_{orden.numero}.pdf'
        }, status=status.HTTP_200_OK)
    else:
        task = generate_document_pdf.delay('orden_compra', orden.id, request.user.id)
        return Response({
            'task_id': task.id,
            'message': 'Generando orden de compra...'
        }, status=status.HTTP_202_ACCEPTED)
```

---

## Frontend — Servicio y Admin

### A. Crear `documentService.ts`

**Archivo:** `frontend/src/services/documentService.ts`

```typescript
import api from './api'

export interface PDFDocument {
  id: number
  tipo: string
  tipo_display: string
  nombre: string
  pdf_file: string
  generated_by_nombre: string
  created_at: string
}

export const documentService = {
  /**
   * Generar PDF de Solicitud de Materiales
   */
  generateSolicitudPDF: async (solicitudId: number): Promise<{ document_id?: number; task_id?: string }> => {
    const response = await api.post(`/procurement/solicitudes/${solicitudId}/generar-pdf/`)
    return response.data
  },

  /**
   * Generar PDF de Orden de Compra
   */
  generateOrdenPDF: async (ordenId: number): Promise<{ document_id?: number; task_id?: string }> => {
    const response = await api.post(`/orders/ordenes/${ordenId}/generar-pdf/`)
    return response.data
  },

  /**
   * Generar PDF de Autorización Presupuestaria
   */
  generateAutorizacionPDF: async (autorizacionId: number): Promise<{ document_id?: number; task_id?: string }> => {
    const response = await api.post(`/orders/autorizaciones/${autorizacionId}/generar-pdf/`)
    return response.data
  },

  /**
   * Descargar PDF por document_id
   */
  downloadPDF: async (documentId: number, filename?: string): Promise<void> => {
    try {
      const response = await api.get(`/documents/pdf/${documentId}/download/`, {
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename || `documento_${documentId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error descargando PDF:', error)
      throw error
    }
  },

  /**
   * Obtener PDF más reciente para un tipo y object_id
   */
  getLatestPDF: async (tipo: string, objectId: number): Promise<PDFDocument | null> => {
    try {
      const response = await api.get(`/documents/pdf/latest/`, {
        params: { tipo, object_id: objectId }
      })
      return response.data
    } catch (error) {
      return null
    }
  },

  /**
   * Orquestar: generar + descargar
   */
  generateAndDownload: async (
    generatorFn: (id: number) => Promise<{ document_id?: number; task_id?: string }>,
    inputId: number,
    filename?: string
  ): Promise<void> => {
    const result = await generatorFn(inputId)

    if (result.document_id) {
      // Dev mode: document_id disponible inmediatamente
      await documentService.downloadPDF(result.document_id, filename)
    } else if (result.task_id) {
      // Prod mode: implementar polling opcional
      console.info('PDF en generación:', result.task_id)
      // TODO: agregar polling para obtener document_id cuando esté listo
    }
  }
}
```

---

### B. Crear `companyService.ts`

**Archivo:** `frontend/src/services/companyService.ts`

```typescript
import api from './api'
import { User } from './userService'

export interface Company {
  id: number
  rfc: string
  razon_social: string
  nombre_comercial: string
  calle: string
  numero_exterior: string
  numero_interior: string
  colonia: string
  municipio: string
  estado: string
  codigo_postal: string
  telefono: string
  email: string
  logo?: string
  membrete?: string
  pie_pagina?: string
  direccion_completa: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FirmanteDocumento {
  id: number
  company: number
  tipo_documento: string
  tipo_documento_display: string
  cargo: string
  nombre: string
  usuario_nombre: string
  nombre_completo_display: string
  user: number | null
  sello_imagen?: string
  orden: number
  created_at: string
  updated_at: string
}

export const companyService = {
  /**
   * Obtener lista de empresas (solo admin)
   */
  getCompanies: async (): Promise<Company[]> => {
    const response = await api.get('/companies/empresas/')
    return Array.isArray(response.data) ? response.data : response.data.results || []
  },

  /**
   * Obtener detalle de empresa
   */
  getCompany: async (id: number): Promise<Company> => {
    const response = await api.get(`/companies/empresas/${id}/`)
    return response.data
  },

  /**
   * Actualizar empresa (con soporte para multipart upload de imágenes)
   */
  updateCompany: async (id: number, data: Partial<Company>, files?: { [key: string]: File }): Promise<Company> => {
    const formData = new FormData()

    // Agregar campos de texto
    Object.keys(data).forEach(key => {
      const value = (data as any)[key]
      if (value && typeof value !== 'object') {
        formData.append(key, value)
      }
    })

    // Agregar archivos
    if (files) {
      Object.keys(files).forEach(key => {
        formData.append(key, files[key])
      })
    }

    const response = await api.patch(`/companies/empresas/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  /**
   * Obtener firmantes de una empresa
   */
  getFirmantes: async (companyId: number, tipoDocumento?: string): Promise<FirmanteDocumento[]> => {
    const params = tipoDocumento ? { tipo_documento: tipoDocumento } : {}
    const response = await api.get(`/companies/empresas/${companyId}/firmantes/`, { params })
    return Array.isArray(response.data) ? response.data : response.data.results || []
  },

  /**
   * Crear firmante
   */
  createFirmante: async (data: Partial<FirmanteDocumento>, file?: File): Promise<FirmanteDocumento> => {
    const formData = new FormData()

    Object.keys(data).forEach(key => {
      const value = (data as any)[key]
      if (value && typeof value !== 'object') {
        formData.append(key, value)
      }
    })

    if (file) {
      formData.append('sello_imagen', file)
    }

    const response = await api.post('/companies/firmantes/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  /**
   * Actualizar firmante
   */
  updateFirmante: async (id: number, data: Partial<FirmanteDocumento>, file?: File): Promise<FirmanteDocumento> => {
    const formData = new FormData()

    Object.keys(data).forEach(key => {
      const value = (data as any)[key]
      if (value && typeof value !== 'object') {
        formData.append(key, value)
      }
    })

    if (file) {
      formData.append('sello_imagen', file)
    }

    const response = await api.patch(`/companies/firmantes/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  /**
   * Eliminar firmante
   */
  deleteFirmante: async (id: number): Promise<void> => {
    await api.delete(`/companies/firmantes/${id}/`)
  },
}
```

---

### C. Crear página `EmpresaConfigPage.tsx`

**Archivo:** `frontend/src/pages/admin/EmpresaConfigPage.tsx`

```typescript
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import { Button, Modal, Input, Select, Textarea } from '@/components/ui'
import { companyService, Company, FirmanteDocumento } from '@/services/companyService'
import { useAuthStore } from '@/stores/authStore'

export default function EmpresaConfigPage() {
  const { user } = useAuthStore()
  const [company, setCompany] = useState<Company | null>(null)
  const [firmantes, setFirmantes] = useState<FirmanteDocumento[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editingFirmante, setEditingFirmante] = useState<FirmanteDocumento | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedFirmante, setSelectedFirmante] = useState<FirmanteDocumento | null>(null)

  // Verificar que es admin
  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('No tienes permisos para acceder a esta página')
      return
    }

    loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    try {
      // Obtener la primera empresa activa (asumiendo un solo tenant)
      const companies = await companyService.getCompanies()
      if (companies.length > 0) {
        const comp = companies[0]
        setCompany(comp)

        // Cargar firmantes
        const firms = await companyService.getFirmantes(comp.id)
        setFirmantes(firms)
      }
    } catch (error) {
      toast.error('Error al cargar datos de la empresa')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Cargando...</div>
  if (!company) return <div>Empresa no encontrada</div>

  return (
    <div className="space-y-8">
      {/* SECCIÓN BRANDING */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Branding y Membrete</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
              {company.logo ? (
                <img src={company.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-gray-400">Sin logo</span>
              )}
            </div>
            <input type="file" accept="image/*" onChange={(e) => console.log('TODO: upload')} />
            <p className="text-xs text-gray-500 mt-1">Tamaño recomendado: 500×500px</p>
          </div>

          {/* Membrete */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Membrete Oficial</label>
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-2 overflow-hidden border-2 border-dashed border-gray-300">
              {company.membrete ? (
                <img src={company.membrete} alt="Membrete" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-center p-4">
                  Sin membrete<br/><small>Se usará membrete genérico</small>
                </span>
              )}
            </div>
            <input type="file" accept="image/*" onChange={(e) => console.log('TODO: upload')} />
            <p className="text-xs text-gray-500 mt-1">Tamaño recomendado: 2100×400px. Incluye escudo, nombre, período, decoración.</p>
          </div>

          {/* Pie de Página */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Pie de Página</label>
            <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
              {company.pie_pagina ? (
                <img src={company.pie_pagina} alt="Pie" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400">Sin pie de página</span>
              )}
            </div>
            <input type="file" accept="image/*" onChange={(e) => console.log('TODO: upload')} />
            <p className="text-xs text-gray-500 mt-1">Tamaño recomendado: 2100×80px. Footer institucional.</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN FIRMANTES */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Firmantes de Documentos</h2>
          <Button onClick={() => setEditingFirmante({ company: company.id } as any)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Agregar Firmante
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo Documento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {firmantes.map(firmante => (
                <tr key={firmante.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{firmante.tipo_documento_display}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{firmante.cargo}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{firmante.nombre_completo_display}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{firmante.orden}</td>
                  <td className="px-4 py-3 text-sm">
                    <button onClick={() => setEditingFirmante(firmante)} className="text-blue-600 hover:text-blue-900">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => { setSelectedFirmante(firmante); setDeleteModalOpen(true) }}
                      className="text-red-600 hover:text-red-900 ml-3"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TODO: Modal para crear/editar firmante */}
      </div>

      {/* TODO: Modal de borrado */}
    </div>
  )
}
```

---

## Frontend — Botones de Descarga PDF

### A. Conectar en `SolicitudDetailPage.tsx`

En `frontend/src/pages/procurement/SolicitudDetailPage.tsx`:

- Importar `documentService`: `import { documentService } from '@/services/documentService'`
- Agregar estado: `const [generatingPDF, setGeneratingPDF] = useState(false)`
- Agregar handler:

```typescript
const handleDescargarPDF = async () => {
  if (!solicitud) return
  setGeneratingPDF(true)
  try {
    toast.loading('Generando PDF...')
    await documentService.generateAndDownload(
      documentService.generateSolicitudPDF,
      solicitud.id,
      `Solicitud_${solicitud.numero}.pdf`
    )
    toast.dismiss()
    toast.success('PDF descargado correctamente')
  } catch (error: any) {
    toast.dismiss()
    toast.error(error.response?.data?.error || 'Error al generar PDF')
  } finally {
    setGeneratingPDF(false)
  }
}
```

- Modificar botón "Imprimir" (~L241):

```typescript
<Button 
  variant="secondary"
  onClick={handleDescargarPDF}
  loading={generatingPDF}
  disabled={solicitud.estado === 'borrador'}
>
  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
  Descargar PDF
</Button>
```

### B. Agregar por fila en `SolicitudesPage.tsx`

En `frontend/src/pages/procurement/SolicitudesPage.tsx`, en la columna de acciones de cada fila:

```typescript
{solicitud.estado !== 'borrador' && (
  <button
    onClick={() => documentService.generateAndDownload(
      documentService.generateSolicitudPDF,
      solicitud.id,
      `Solicitud_${solicitud.numero}.pdf`
    )}
    className="text-blue-600 hover:text-blue-900"
  >
    <ArrowDownTrayIcon className="h-4 w-4" />
  </button>
)}
```

### C. Conectar en `OrdenDetailPage.tsx` y `OrdenesPage.tsx`

Similar al anterior, pero usando `documentService.generateOrdenPDF(orden.id)`

---

## Frontend — Formulario de Solicitud

### Actualizar `SolicitudFormPage.tsx`

En `frontend/src/pages/procurement/SolicitudFormPage.tsx`:

1. Actualizar interface `SolicitudForm`:

```typescript
interface SolicitudForm {
  area: number
  fecha_solicitud: string
  descripcion: string
  justificacion: string
  eje_rector: string           // NUEVO
  programa_presupuestario: string  // NUEVO
  actividad: string             // NUEVO
  urgente: boolean
  fecha_requerida?: string | null
  detalles: DetalleFo...
}
```

2. Agregar 3 campos textarea en la sección "Datos Generales" (después de `justificacion`):

```typescript
<div>
  <label htmlFor="eje_rector" className="block text-sm font-medium text-gray-700">
    Eje Rector
  </label>
  <textarea
    {...register('eje_rector')}
    placeholder="Ej: Bienestar Social"
    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
    rows={2}
  />
</div>

<div>
  <label htmlFor="programa_presupuestario" className="block text-sm font-medium text-gray-700">
    Programa Presupuestario
  </label>
  <textarea
    {...register('programa_presupuestario')}
    placeholder="Ej: Apoyar y subsidiar con recursos económicos..."
    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
    rows={3}
  />
</div>

<div>
  <label htmlFor="actividad" className="block text-sm font-medium text-gray-700">
    Actividad o Acción
  </label>
  <textarea
    {...register('actividad')}
    placeholder="Ej: Apoyar económicamente o en especie..."
    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
    rows={3}
  />
</div>
```

3. Mostrar los 3 campos en `SolicitudDetailPage.tsx` en la sección "Datos Generales"

---

## Verificación y Testing

### Fase de Migraciones

1. **Crear migraciones:**
   ```bash
   cd backend
   python manage.py makemigrations companies
   python manage.py makemigrations procurement
   python manage.py migrate
   ```

2. **Verificar en Django Admin:**
   - Crear una `Company` con membrete, pie_pagina y logo
   - Agregar 3 `FirmanteDocumento` para `tipo_documento='solicitud'`

### Fase de Backend

3. **PDF Shell Test:**
   ```bash
   python manage.py shell
   from apps.documents.services.pdf_generator import generate_solicitud_pdf
   from apps.procurement.models import SolicitudMaterial
   pdf = generate_solicitud_pdf(SolicitudMaterial.objects.first())
   print(pdf[:4] == b'%PDF')  # Debe ser True
   ```

4. **Endpoint Test:**
   ```bash
   curl -X POST http://localhost:8000/api/procurement/solicitudes/1/generar-pdf/ \
     -H "Authorization: Bearer TOKEN"
   # Debe retornar { "document_id": X } o { "task_id": "..." }
   ```

5. **Download Test:**
   ```bash
   curl -X GET http://localhost:8000/api/documents/pdf/1/download/ \
     -H "Authorization: Bearer TOKEN" \
     -o test.pdf
   # Abrir test.pdf — debe ver membrete, tabla, firmas
   ```

### Fase de Frontend

6. **Visual Test:**
   - Navegar a `/solicitudes/{id}`
   - Click "Descargar PDF" → debe descargar PDF con membrete
   - Verificar que: membrete aparece, tabla sin precios, 3 firmas, pie de página
   - Sin membrete: debe aparecer membrete genérico con logo + datos

7. **Lista Test:**
   - Ir a `/solicitudes`
   - Click ícono descarga en fila → descarga PDF

8. **Órdenes Test:**
   - Repetir pasos 6-7 para `/ordenes` (tabla con precios)

9. **Autorización Test:**
   - Aprobar una solicitud de autorización
   - Descargar PDF → verificar que contiene monto autorizado, partida presupuestal

---

## Decisiones de Diseño

| Decisión | Justificación |
|----------|---|
| **Membrete como ImageField** | Permite a cada empresa subir su membrete oficial real con escudo, decoración, sin código. Fallback genérico si no existe. |
| **Pie de página también uploadable** | La imagen de ejemplo muestra footer decorativo. Garantiza branding consistente. |
| **`FirmanteDocumento` por tipo de documento** | Cada tipo de documento puede tener firmantes distintos. Escalable a 9 tipos futuros. |
| **Sello/firma como imagen** | Permite subir firma digitalizada de cada funcionario. Más profesional que línea dibujada. |
| **Tabla de Solicitud sin precios** | Acorde a requisito del cliente: "los precios irán en otro documento". |
| **Fase 1 = 3 documentos** | Modelos existentes → menor esfuerzo → demostrar patrón → facilitar fases futuras. |
| **Action `generar-pdf` en cada ViewSet** | Simplifica permisos por rol + URL intuitiva vs endpoint genérico. |
| **EmpresaConfigPage nueva en admin** | Actualmente no hay forma de editar Company desde frontend. |
| **`documentService.ts` centralizado** | Un servicio para todos los tipos PDF, no uno por módulo. Reutilizado en Fases 2-4. |
| **Template base `_base_documento.html`** | Evita duplicar encabezado/firma en cada template. Branding consistente. |

---

## Fases Futuras

### Fase 2: Cotización, Solicitud de Autorización, Entrega

| Documento | Modelo | Notas |
|-----------|--------|-------|
| **Cotización de Materiales** | `CotizacionMaterial` | Formato tabular. Membrete del proveedor. Incluye precios, IVA, condiciones pago. |
| **Solicitud de Autorización** | `SolicitudAutorizacion` | Oficio. Referencia a `SolicitudMaterial`. Monto solicitado + justificación. |
| **Entrega/Recepción de Bienes** | `EntregaBienes` | Formato acta. Tabla de detalles recibidos. Observaciones de condición. |

**Trabajo:** 3 generadores + 3 templates + action `generar-pdf` en cada ViewSet + botones en UI

### Fase 3: Salida de Almacén, Fotos de Materiales

| Documento | Modelo | Notas |
|-----------|--------|-------|
| **Salida de Almacén** | `SalidaBienes` | Formato simple. Origen/destino + tabla de materiales. |
| **Fotos de Materiales** | `EvidenciaEntrega` | PDF con galería de imágenes de la entrega. |

### Fase 4: Solicitud del Gasto, Solicitud de Pago

| Documento | Modelo | Notas |
|-----------|--------|-------|
| **Solicitud del Gasto** | Nueva | Crear desde cero. Vinculada a `DistribucionGasto`. |
| **Solicitud de Pago** | Nueva | Crear desde cero. Vinculada a `Factura` + `DistribucionGasto`. |

---

## Sumario de Archivos a Modificar/Crear

### Backend

**Modificar:**
- `backend/apps/companies/models.py` — agregar campos `membrete`, `pie_pagina` a Company; agregar modelo `FirmanteDocumento`
- `backend/apps/companies/serializers.py` — agregar `FirmanteDocumentoSerializer`
- `backend/apps/companies/admin.py` — actualizar CompanyAdmin con inline de firmantes
- `backend/apps/procurement/models.py` — agregar 3 campos a SolicitudMaterial
- `backend/apps/procurement/serializers.py` — incluir 3 nuevos campos
- `backend/apps/documents/services/pdf_generator.py` — enriquecer 3 funciones generadoras con contexto completo
- `backend/apps/procurement/views.py` — agregar action `generar_pdf` a SolicitudMaterialViewSet
- `backend/apps/orders/views.py` — agregar action `generar_pdf` a OrdenCompraViewSet

**Crear:**
- `backend/apps/documents/templates/documents/_base_documento.html`
- `backend/apps/documents/templates/documents/solicitud_material.html`
- `backend/apps/documents/templates/documents/orden_compra.html`
- `backend/apps/documents/templates/documents/autorizacion.html`

### Frontend

**Crear:**
- `frontend/src/services/documentService.ts`
- `frontend/src/services/companyService.ts`
- `frontend/src/pages/admin/EmpresaConfigPage.tsx`

**Modificar:**
- `frontend/src/pages/procurement/SolicitudDetailPage.tsx` — agregar handler + botón PDF, mostrar 3 campos
- `frontend/src/pages/procurement/SolicitudesPage.tsx` — agregar ícono descarga por fila
- `frontend/src/pages/procurement/SolicitudFormPage.tsx` — agregar 3 campos al formulario
- `frontend/src/pages/orders/OrdenDetailPage.tsx` — agregar botón PDF
- `frontend/src/pages/orders/OrdenesPage.tsx` — agregar ícono descarga por fila

---

**Total estimado:** ~2-3 días dev (4 devs × 8h) incluyendo testing
