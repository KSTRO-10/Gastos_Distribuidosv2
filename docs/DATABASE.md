# 🗄️ Esquema de Base de Datos — Gastos Distribuidos v2

Modelo de datos: **38 entidades** en **13 aplicaciones** Django.
Arquitectura multi-tenant con **django-tenants** (esquema por tenant en PostgreSQL 15+).

---

## Tabla de Contenidos

1. [Resumen de Módulos](#1-resumen-de-módulos)
2. [Multi-tenancy](#2-multi-tenancy)
3. [Usuarios y Roles](#3-usuarios-y-roles)
4. [Compañías y Proveedores](#4-compañías-y-proveedores)
5. [Áreas y Personal](#5-áreas-y-personal)
6. [Clasificador por Objeto del Gasto (COG)](#6-clasificador-por-objeto-del-gasto-cog)
7. [Flujo de Procuración](#7-flujo-de-procuración)
8. [Inventario](#8-inventario)
9. [Facturación CFDI 4.0](#9-facturación-cfdi-40)
10. [Distribución de Gastos](#10-distribución-de-gastos)
11. [Tesorería y Presupuestos](#11-tesorería-y-presupuestos)
12. [Documentos, Media y Auditoría](#12-documentos-media-y-auditoría)
13. [Índices y Optimización](#13-índices-y-optimización)
14. [Migraciones y Backup](#14-migraciones-y-backup)

---

## 1. Resumen de Módulos

| Módulo | App Django | Entidades | Tablas |
|--------|-----------|-----------|--------|
| **Multi-tenancy** | `tenants` | Tenant, Domain, SolicitudGubernamental | 3 |
| **Usuarios** | `accounts` | Role, User | 2 |
| **Compañías** | `companies` | Company, Proveedor, ProductoProveedor, FirmanteDocumento | 4 |
| **Áreas** | `areas` | Area, PersonalArea | 2 |
| **Catálogo COG** | `procurement` | Cog | 1 |
| **Solicitudes** | `procurement` | SolicitudMaterial, DetalleMaterial | 2 |
| **Cotizaciones** | `quotations` | CotizacionMaterial, CotizacionDetalle | 2 |
| **Autorizaciones y Órdenes** | `orders` | SolicitudAutorizacion, AutorizacionPresupuestal, OrdenCompra, DetalleOrden | 4 |
| **Inventario** | `inventory` | EntregaBienes, EntregaDetalle, EvidenciaEntrega, SalidaBienes, SalidaDetalle | 5 |
| **Facturación** | `invoices` | Factura, FacturaDetalle | 2 |
| **Distribución** | `invoices` | DistribucionGasto | 1 |
| **Tesorería** | `treasury` | SolicitudGasto, ItemSolicitudGasto, SolicitudPago, ItemSolicitudPago | 4 |
| **Presupuestos** | `budget` | PlantillaPresupuestal, ItemClavePres | 2 |
| **Documentos** | `documents` | PDFDocument, Media | 2 |
| **Notificaciones** | `notifications` | Notification, ActivityLog | 2 |
| **Total** | **13 apps** | | **38** |

**Conexiones entre módulos:** Documentadas en tablas de "Relaciones externas" dentro de cada sección. **No se dibujan líneas cruzadas** entre diagramas para mantener la legibilidad.

---

## 2. Multi-tenancy

Arquitectura **schema-per-tenant** vía django-tenants.

```mermaid
erDiagram
    Tenant ||--o{ Domain : "tiene"
    Tenant ||--o| SolicitudGubernamental : "registro"
    User ||--o{ SolicitudGubernamental : "reviewed_by"

    Tenant {
        bigint id PK
        varchar schema_name UK "esquema PostgreSQL"
        varchar name "organización"
        varchar rfc
        boolean is_active
        json settings
    }

    Domain {
        bigint id PK
        varchar domain UK
        bigint tenant_id FK
        boolean is_primary
    }

    SolicitudGubernamental {
        bigint id PK
        varchar nombre_solicitante
        varchar email_solicitante
        varchar nombre_organizacion
        varchar rfc
        varchar estado "pendiente|aprobada|rechazada"
        bigint reviewed_by_id FK
        text rejection_reason
        bigint tenant_id FK "OneToOne al aprobar"
    }
```

**Relaciones externas:**

| Tabla | Campo FK | Referencia |
|-------|----------|------------|
| SolicitudGubernamental | `reviewed_by_id` | `User.id` |

**Nota:** El esquema `public` de PostgreSQL solo contiene Tenant, Domain y SolicitudGubernamental. Cada tenant tiene su propio esquema con todas las demás tablas de negocio replicadas.

---

## 3. Usuarios y Roles

```mermaid
erDiagram
    Role ||--o{ User : "role_id"

    Role {
        bigint id PK
        varchar name UK "admin|tesoreria|adquisiciones|almacen|area|proveedor"
        text description
        json permissions "lista de strings"
        boolean is_active
    }

    User {
        bigint id PK
        varchar email UK "username"
        varchar full_name
        varchar phone
        bigint role_id FK
        varchar avatar "upload_to='avatars/'"
        boolean ine_verificada
        boolean ine_rechazada
        text ine_rechazo_motivo
        varchar last_login_ip
        json settings
    }
```

**Relaciones externas (User como FK en otras tablas):**

| Tabla externa | Campo FK | Uso |
|---------------|----------|-----|
| SolicitudGubernamental | `reviewed_by_id` | Revisión de registro |
| Proveedor | `user_id` | Perfil de proveedor (OneToOne) |
| Company | `created_by_id` | Quién creó la compañía |
| Area | `manager_id` | Responsable del área |
| PersonalArea | `user_id` | Usuario asignado al área |
| FirmanteDocumento | `user_id` | Firmante del documento |
| SolicitudMaterial | `created_by_id` | Quién creó la solicitud |
| CotizacionMaterial | — | (vía proveedor) |
| SolicitudAutorizacion | `solicitante_id` | Quién solicita autorización |
| AutorizacionPresupuestal | `aprobado_por_id` | Quién aprueba presupuesto |
| OrdenCompra | `created_by_id` | Quién creó la orden |
| EntregaBienes | `recibido_por_id` | Quién recibió bienes |
| SalidaBienes | `responsable_id` | Responsable de salida |
| Factura | `uploaded_by_id` | Quién subió la factura |
| DistribucionGasto | `created_by_id` | Quién distribuyó el gasto |
| SolicitudGasto | `solicitante_id` | Solicitante de gasto |
| PlantillaPresupuestal | `created_by_id` | Creador de plantilla |
| PDFDocument | `generated_by_id` | Quién generó el PDF |
| Media | `owner_id` | Dueño del archivo |
| Notification | `user_id` | Destinatario |
| ActivityLog | `user_id` | Quién realizó la acción |

---

## 4. Compañías y Proveedores

```mermaid
erDiagram
    Company ||--o{ FirmanteDocumento : "company_id"
    Proveedor ||--o{ ProductoProveedor : "proveedor_id"
    Cog ||--o{ ProductoProveedor : "cog_id"

    Company {
        bigint id PK
        varchar rfc UK
        varchar razon_social
        varchar nombre_comercial
        varchar calle
        varchar numero_exterior
        varchar numero_interior
        varchar colonia
        varchar municipio
        varchar estado
        varchar codigo_postal
        varchar telefono
        varchar email
        varchar logo "upload_to='company_logos/'"
        varchar membrete "upload_to='company_membretes/'"
        varchar pie_pagina "upload_to='company_pies/'"
        boolean is_active
        bigint created_by_id FK
    }

    Proveedor {
        bigint id PK
        varchar rfc UK
        varchar razon_social
        varchar nombre_comercial
        varchar contacto_nombre
        varchar contacto_email
        varchar contacto_telefono
        text direccion
        varchar logo "upload_to='proveedor_logos/'"
        varchar membrete "upload_to='proveedor_membretes/'"
        varchar estado "pendiente|activo|suspendido"
        bigint user_id FK "OneToOne"
        json documentos
    }

    ProductoProveedor {
        bigint id PK
        bigint proveedor_id FK
        bigint cog_id FK
        varchar nombre "500 chars"
        text descripcion
        varchar unidad
        decimal precio_unitario "15,2"
        varchar marca
        varchar modelo
        boolean is_active
    }

    FirmanteDocumento {
        bigint id PK
        bigint company_id FK
        varchar tipo_documento "solicitud|cotizacion|autorizacion|orden_compra|entrega|salida|solicitud_gasto|solicitud_pago|distribucion_gasto"
        varchar cargo
        varchar nombre
        bigint user_id FK
        varchar sello_imagen "upload_to='sellos_firmantes/'"
        integer orden
    }
```

**Relaciones externas:**

| Tabla | Campo FK | Referencia |
|-------|----------|------------|
| Company | `created_by_id` | `User.id` |
| Proveedor | `user_id` | `User.id` (OneToOne) |
| FirmanteDocumento | `user_id` | `User.id` |
| ProductoProveedor | `cog_id` | `Cog.id` |

**Constraints de unicidad:**

| Tabla | Constraint |
|-------|-----------|
| Proveedor | `rfc` UK, `user_id` UK |
| ProductoProveedor | `(proveedor, nombre, unidad)` UK |
| FirmanteDocumento | `(company, tipo_documento, orden)` UK |

---

## 5. Áreas y Personal

```mermaid
erDiagram
    Area ||--o| Area : "parent_id (self-ref)"
    Area ||--o{ PersonalArea : "area_id"

    Area {
        bigint id PK
        bigint company_id FK
        varchar name
        varchar code "50 chars"
        text description
        bigint parent_id FK "self-ref jerarquía"
        bigint manager_id FK
        decimal presupuesto_anual "15,2"
        boolean is_active
        bigint created_by_id FK
    }

    PersonalArea {
        bigint id PK
        bigint user_id FK
        bigint area_id FK
        varchar cargo "255 chars"
        boolean is_primary
    }
```

**Relaciones externas:**

| Tabla | Campo FK | Referencia |
|-------|----------|------------|
| Area | `company_id` | `Company.id` |
| Area | `manager_id` | `User.id` |
| Area | `parent_id` | `Area.id` (self-ref) |
| PersonalArea | `user_id` | `User.id` |

**Constraints:** `(company, code)` UK, `(user, area)` UK

---

## 6. Clasificador por Objeto del Gasto (COG)

Catálogo presupuestario mexicano con jerarquía de 4 niveles.

```mermaid
erDiagram
    Cog {
        bigint id PK
        varchar codigo UK "ej: 21101"
        varchar descripcion "500 chars"
        varchar capitulo "2000"
        varchar concepto "2100"
        varchar partida_generica "2110"
        varchar partida_especifica "21101"
        text palabras_clave
        boolean is_active
    }
```

**Jerarquía del COG:**

```
Capítulo 2000 — Materiales y Suministros
  └─ Concepto 2100 — Materiales de Administración
       └─ PG 2110 — Materiales de Oficina
            ├─ PE 21101 — Papelería
            └─ PE 21102 — Útiles de Oficina
       └─ PG 2160 — Material de Cómputo
            ├─ PE 21601 — Consumibles de Cómputo
            └─ PE 21602 — Tóner y Cartuchos
```

**Relaciones externas (COG es referenciado por):**

| Tabla | Campo FK | Uso |
|-------|----------|-----|
| DetalleMaterial | `cog_id` | Clasifica ítem de solicitud |
| ProductoProveedor | `cog_id` | Clasifica producto del proveedor |

---

## 7. Flujo de Procuración

Flujo completo: **Solicitud de Material → Cotización → Autorización Presupuestal → Orden de Compra**

```mermaid
erDiagram
    Cog ||--o{ DetalleMaterial : "cog_id"
    SolicitudMaterial ||--o{ DetalleMaterial : "solicitud_id"
    SolicitudMaterial ||--o{ CotizacionMaterial : "solicitud_id"
    CotizacionMaterial ||--o{ CotizacionDetalle : "cotizacion_id"
    DetalleMaterial ||--o{ CotizacionDetalle : "detalle_material_id"
    SolicitudMaterial ||--o{ SolicitudAutorizacion : "solicitud_id"
    CotizacionMaterial ||--o{ SolicitudAutorizacion : "cotizacion_id"
    SolicitudAutorizacion ||--|| AutorizacionPresupuestal : "solicitud_autorizacion_id"
    CotizacionMaterial ||--o{ OrdenCompra : "cotizacion_id"
    AutorizacionPresupuestal ||--o{ OrdenCompra : "autorizacion_id"
    OrdenCompra ||--o{ DetalleOrden : "orden_id"
    DetalleMaterial ||--o{ DetalleOrden : "detalle_material_id"

    SolicitudMaterial {
        bigint id PK
        bigint area_id FK
        varchar numero UK "SOL-YYYY-NNNNN"
        date fecha_solicitud
        text descripcion
        text justificacion
        text eje_rector
        text programa_presupuestario
        text actividad
        varchar estado "13 estados"
        decimal total_estimado "15,2"
        boolean urgente
        date fecha_requerida
        bigint created_by_id FK
    }

    DetalleMaterial {
        bigint id PK
        bigint solicitud_id FK
        bigint cog_id FK
        varchar concepto "500 chars"
        text descripcion
        decimal cantidad "15,4"
        varchar unidad
        decimal precio_estimado "15,2"
        text notas
    }

    CotizacionMaterial {
        bigint id PK
        bigint solicitud_id FK
        bigint proveedor_id FK
        varchar numero UK "COT-YYYY-NNNNN"
        date fecha
        date vigencia
        decimal subtotal "15,2"
        decimal iva "15,2"
        decimal total "15,2"
        varchar tiempo_entrega "100 chars"
        text condiciones_pago
        text notas
        varchar estado "pendiente|recibida|seleccionada|rechazada"
        varchar documento "PDF"
    }

    CotizacionDetalle {
        bigint id PK
        bigint cotizacion_id FK
        bigint detalle_material_id FK
        varchar concepto
        text descripcion
        decimal cantidad "15,4"
        varchar unidad
        decimal precio_unitario "15,2"
        decimal subtotal "15,2"
    }

    SolicitudAutorizacion {
        bigint id PK
        bigint solicitud_id FK
        bigint cotizacion_id FK
        varchar numero UK "AUT-YYYY-NNNNN"
        date fecha_solicitud
        decimal monto_solicitado "15,2"
        text justificacion
        varchar estado "pendiente|aprobada|rechazada"
        text motivo_rechazo
        bigint solicitante_id FK
    }

    AutorizacionPresupuestal {
        bigint id PK
        bigint solicitud_autorizacion_id FK "OneToOne"
        decimal monto_autorizado "15,2"
        varchar partida_presupuestal "100 chars"
        date fecha_aprobacion
        text observaciones
        bigint aprobado_por_id FK
    }

    OrdenCompra {
        bigint id PK
        bigint proveedor_id FK
        bigint autorizacion_id FK
        bigint cotizacion_id FK
        varchar numero UK "OC-YYYY-NNNNN"
        date fecha_emision
        date fecha_entrega_esperada
        decimal subtotal "15,2"
        decimal iva "15,2"
        decimal total "15,2"
        text condiciones_pago
        text lugar_entrega
        text notas
        varchar estado "borrador|enviada|confirmada|parcial|entregada|cancelada"
        varchar referencia_externa "100 chars"
        bigint created_by_id FK
    }

    DetalleOrden {
        bigint id PK
        bigint orden_id FK
        bigint detalle_material_id FK
        varchar concepto
        text descripcion
        decimal cantidad "15,4"
        varchar unidad
        decimal precio_unitario "15,2"
        decimal subtotal "15,2"
        decimal cantidad_recibida "15,4"
    }
```

**Relaciones externas:**

| Tabla | Campo FK | Referencia |
|-------|----------|------------|
| SolicitudMaterial | `area_id` | `Area.id` |
| SolicitudMaterial | `created_by_id` | `User.id` |
| CotizacionMaterial | `proveedor_id` | `Proveedor.id` |
| SolicitudAutorizacion | `solicitante_id` | `User.id` |
| AutorizacionPresupuestal | `aprobado_por_id` | `User.id` |
| OrdenCompra | `proveedor_id` | `Proveedor.id` |
| OrdenCompra | `created_by_id` | `User.id` |

---

## 8. Inventario

Recepción de bienes contra órdenes de compra y salidas de almacén a áreas.

```mermaid
erDiagram
    EntregaBienes ||--o{ EntregaDetalle : "entrega_id"
    EntregaBienes ||--o{ EvidenciaEntrega : "entrega_id"
    SalidaBienes ||--o{ SalidaDetalle : "salida_id"

    EntregaBienes {
        bigint id PK
        bigint orden_id FK
        bigint factura_id FK
        varchar numero UK "REC-YYYY-NNNNN"
        timestamp fecha_recepcion
        text notas
        bigint recibido_por_id FK
        boolean completa
    }

    EntregaDetalle {
        bigint id PK
        bigint entrega_id FK
        bigint detalle_orden_id FK
        decimal cantidad_recibida "15,4"
        text notas
        boolean condicion_buena
        text observaciones_condicion
    }

    EvidenciaEntrega {
        bigint id PK
        bigint entrega_id FK
        varchar imagen "upload_to='evidencias/entregas/'"
        varchar descripcion
    }

    SalidaBienes {
        bigint id PK
        bigint almacen_id FK
        bigint destino_area_id FK
        varchar numero UK "SAL-YYYY-NNNNN"
        timestamp fecha
        varchar referencia "100 chars"
        text notas
        bigint responsable_id FK
        boolean confirmada
        bigint confirmada_por_id FK
        timestamp fecha_confirmacion
    }

    SalidaDetalle {
        bigint id PK
        bigint salida_id FK
        varchar material "500 chars"
        text descripcion
        decimal cantidad "15,4"
        varchar unidad
    }
```

**Relaciones externas:**

| Tabla | Campo FK | Referencia |
|-------|----------|------------|
| EntregaBienes | `orden_id` | `OrdenCompra.id` |
| EntregaBienes | `factura_id` | `Factura.id` |
| EntregaBienes | `recibido_por_id` | `User.id` |
| EntregaDetalle | `detalle_orden_id` | `DetalleOrden.id` |
| SalidaBienes | `almacen_id` | `Area.id` (origen) |
| SalidaBienes | `destino_area_id` | `Area.id` (destino) |
| SalidaBienes | `responsable_id` | `User.id` |
| SalidaBienes | `confirmada_por_id` | `User.id` |

---

## 9. Facturación CFDI 4.0

```mermaid
erDiagram
    Factura ||--o{ FacturaDetalle : "factura_id"

    Factura {
        bigint id PK
        bigint proveedor_id FK
        varchar xml_file "upload_to='facturas/xml/'"
        varchar pdf_file "upload_to='facturas/pdf/'"
        varchar uuid_cfdi UK "36 chars"
        varchar folio
        varchar serie
        timestamp fecha
        varchar rfc_emisor "13 chars"
        varchar nombre_emisor "255 chars"
        varchar rfc_receptor "13 chars"
        varchar nombre_receptor "255 chars"
        decimal subtotal "15,2"
        decimal descuento "15,2"
        decimal iva "15,2"
        decimal isr "15,2"
        decimal iva_retenido "15,2"
        decimal total "15,2"
        varchar forma_pago
        varchar metodo_pago "PUE|PPD"
        varchar moneda "default: MXN"
        decimal tipo_cambio "10,4 default: 1"
        varchar tipo_comprobante "I|E|P|T|N"
        varchar uso_cfdi "G01|G03|..."
        json parsed_json
        varchar status "pendiente|procesando|procesada|error|distribuida"
        text error_message
        boolean is_quick_flow "default: False"
        bigint uploaded_by_id FK
    }

    FacturaDetalle {
        bigint id PK
        bigint factura_id FK
        varchar clave_prod_serv "SAT catalog"
        varchar no_identificacion "100 chars"
        decimal cantidad "15,4"
        varchar clave_unidad
        varchar unidad
        text descripcion
        decimal valor_unitario "15,6"
        decimal importe "15,2"
        decimal descuento "15,2"
        varchar objeto_imp "01|02|03"
        json impuestos
    }
```

**Relaciones externas:**

| Tabla | Campo FK | Referencia |
|-------|----------|------------|
| Factura | `proveedor_id` | `Proveedor.id` (opcional, auto-detectado por RFC) |
| Factura | `uploaded_by_id` | `User.id` |
| EntregaBienes | `factura_id` | `Factura.id` (vincula recepción con factura) |

---

## 10. Distribución de Gastos

Asigna el costo de cada concepto de factura a las áreas que lo consumieron.

```mermaid
erDiagram
    DistribucionGasto {
        bigint id PK
        bigint factura_id FK
        bigint concepto_id FK
        bigint area_id FK
        bigint solicitud_id FK
        decimal monto "15,2"
        decimal porcentaje "5,2 default: 100"
        text notas
        bigint created_by_id FK
    }
```

**Relaciones externas:**

| Campo FK | Referencia |
|----------|------------|
| `factura_id` | `Factura.id` |
| `concepto_id` | `FacturaDetalle.id` (concepto específico de la factura) |
| `area_id` | `Area.id` (área que recibe el costo) |
| `solicitud_id` | `SolicitudMaterial.id` (opcional, referencia de origen) |
| `created_by_id` | `User.id` |

---

## 11. Tesorería y Presupuestos

### Tesorería

```mermaid
erDiagram
    SolicitudGasto ||--o{ ItemSolicitudGasto : "solicitud_gasto_id"
    SolicitudGasto ||--|| SolicitudPago : "solicitud_gasto_id"
    SolicitudPago ||--o{ ItemSolicitudPago : "solicitud_pago_id"

    SolicitudGasto {
        bigint id PK
        bigint factura_id FK
        varchar numero UK "SOG-YYYY-NNNNN"
        varchar fondo_programa "200 chars"
        varchar tipo_material "200 chars"
        date fecha_solicitud
        bigint solicitante_id FK
        varchar estado "BORRADOR|ENVIADA|AUTORIZADA|RECHAZADA"
    }

    ItemSolicitudGasto {
        bigint id PK
        bigint solicitud_gasto_id FK
        bigint area_id FK
        varchar clave_presupuestaria "200 chars"
        varchar concepto_bien "200 chars"
        varchar descripcion_adquirido "200 chars"
        decimal cantidad "10,2"
        decimal precio_unitario "12,2"
        decimal costo_total "14,2"
    }

    SolicitudPago {
        bigint id PK
        bigint solicitud_gasto_id FK "OneToOne"
        varchar numero UK "SOP-YYYY-NNNNN"
        varchar banco "100 chars"
        varchar numero_cuenta "50 chars"
        varchar cog_clave "20 chars"
        varchar cog_nombre "200 chars"
        date fecha_solicitud
        varchar estado "BORRADOR|ENVIADA|PAGADA|RECHAZADA"
    }

    ItemSolicitudPago {
        bigint id PK
        bigint solicitud_pago_id FK
        bigint area_id FK
        varchar clave_presupuestaria "200 chars"
        decimal importe "14,2"
    }
```

### Presupuestos

```mermaid
erDiagram
    PlantillaPresupuestal ||--o{ ItemClavePres : "plantilla_id"

    PlantillaPresupuestal {
        bigint id PK
        bigint tenant_id FK
        varchar nombre
        integer ejercicio_fiscal
        varchar entidad_federativa "10 chars"
        varchar clasificador_administrativo "20 chars"
        varchar no_municipio_ramo "20 chars"
        varchar unidad_administrativa "20 chars"
        bigint created_by_id FK
    }

    ItemClavePres {
        bigint id PK
        bigint plantilla_id FK
        varchar unidad_ejecutora_gasto "20 chars"
        varchar cog "10 chars"
        varchar cog_fondo "4to dígito"
        varchar cog_desagregacion "3er dígito"
        varchar clasificador_programatico "20 chars"
        varchar tipo_gasto "5 chars"
        varchar finalidad_funcion "10 chars"
        varchar fuente_financiamiento "10 chars"
        varchar clasificador_economico "20 chars"
        varchar actividad_institucional "20 chars"
        varchar programa_presupuestario "20 chars"
        varchar accion "10 chars"
        text descripcion
    }
```

**Relaciones externas:**

| Tabla | Campo FK | Referencia |
|-------|----------|------------|
| SolicitudGasto | `factura_id` | `Factura.id` |
| SolicitudGasto | `solicitante_id` | `User.id` |
| ItemSolicitudGasto | `area_id` | `Area.id` |
| ItemSolicitudPago | `area_id` | `Area.id` |
| PlantillaPresupuestal | `tenant_id` | `Tenant.id` |
| PlantillaPresupuestal | `created_by_id` | `User.id` |

**Constraint:** `(tenant, nombre, ejercicio_fiscal)` UK en PlantillaPresupuestal.

---

## 12. Documentos, Media y Auditoría

```mermaid
erDiagram
    PDFDocument {
        bigint id PK
        integer content_type_id "GenericFK"
        integer object_id "GenericFK"
        varchar tipo "solicitud|cotizacion|autorizacion|orden_compra|entrega|salida|reporte"
        varchar nombre
        text descripcion
        varchar pdf_file "upload_to='documents/pdf/'"
        varchar generated_by_task "Celery task ID"
        varchar template_used
        bigint generated_by_id FK
    }

    Media {
        bigint id PK
        varchar file "upload_to='media/files/'"
        varchar original_name
        varchar content_type "MIME"
        integer size "bytes"
        bigint owner_id FK
        json metadata
    }

    Notification {
        bigint id PK
        bigint user_id FK
        varchar tipo "info|success|warning|error"
        varchar title
        text message
        varchar action_url
        boolean read
        timestamp read_at
    }

    ActivityLog {
        bigint id PK
        bigint user_id FK
        varchar accion "crear|actualizar|eliminar|aprobar|rechazar|subir|generar"
        varchar modelo "100 chars"
        integer objeto_id
        text descripcion
        json datos_anteriores
        json datos_nuevos
        varchar ip_address
        varchar user_agent
    }
```

**Relaciones externas:**

| Tabla | Campo FK | Referencia |
|-------|----------|------------|
| PDFDocument | `generated_by_id` | `User.id` |
| Media | `owner_id` | `User.id` |
| Notification | `user_id` | `User.id` |
| ActivityLog | `user_id` | `User.id` |

**Nota sobre PDFDocument:** Usa `GenericForeignKey` de Django (`content_type_id` + `object_id`) para vincularse a cualquier entidad: SolicitudMaterial, CotizacionMaterial, OrdenCompra, EntregaBienes, etc. Los PDFs se generan asíncronamente vía Celery + WeasyPrint.

---

## 13. Índices y Optimización

### Índices por Aplicación

| App | Tabla | Índices |
|-----|-------|---------|
| accounts | User | `email` UK, `role_id`, `is_active` |
| companies | Proveedor | `rfc` UK, `user_id` UK, `estado`, `contacto_email` |
| companies | ProductoProveedor | `(proveedor, nombre, unidad)` UK |
| companies | FirmanteDocumento | `(company, tipo_documento, orden)` UK |
| areas | Area | `(company, code)` UK, `parent_id` |
| areas | PersonalArea | `(user, area)` UK |
| procurement | Cog | `codigo` UK |
| procurement | SolicitudMaterial | `numero` UK, `estado`, `area_id`, `created_by_id` |
| procurement | DetalleMaterial | `solicitud_id`, `cog_id` |
| quotations | CotizacionMaterial | `numero` UK, `solicitud_id`, `proveedor_id`, `estado` |
| orders | OrdenCompra | `numero` UK, `proveedor_id`, `estado`, `fecha_emision` |
| orders | SolicitudAutorizacion | `numero` UK, `solicitud_id` |
| orders | AutorizacionPresupuestal | `solicitud_autorizacion_id` UK |
| inventory | EntregaBienes | `numero` UK, `orden_id`, `fecha_recepcion` |
| inventory | SalidaBienes | `numero` UK, `almacen_id`, `destino_area_id` |
| invoices | Factura | `uuid_cfdi` UK, `proveedor_id`, `rfc_emisor`, `status`, `fecha` |
| invoices | DistribucionGasto | `factura_id`, `area_id`, `concepto_id` |
| treasury | SolicitudGasto | `numero` UK, `factura_id` |
| treasury | SolicitudPago | `numero` UK, `solicitud_gasto_id` UK |
| budget | PlantillaPresupuestal | `(tenant, nombre, ejercicio_fiscal)` UK |
| notifications | Notification | `user_id`, `read`, `created_at` |
| notifications | ActivityLog | `user_id`, `modelo`, `created_at` |

### Índices Compuestos Recomendados

```sql
-- Dashboard: solicitudes por estado y fecha
CREATE INDEX idx_sol_estado_fecha
ON procurement_solicitudmaterial(estado, created_at DESC);

-- Órdenes pendientes de entrega
CREATE INDEX idx_orden_pendiente
ON orders_ordencompra(estado, proveedor_id)
WHERE estado IN ('enviada', 'confirmada', 'parcial');

-- Facturas por procesar
CREATE INDEX idx_factura_pendiente
ON invoices_factura(status, fecha)
WHERE status = 'pendiente';

-- Distribuciones por área (reportes financieros)
CREATE INDEX idx_dist_area_monto
ON invoices_distribuciongasto(area_id, monto);

-- Búsqueda full-text: proveedores
CREATE INDEX idx_proveedor_search
ON companies_proveedor
USING gin(to_tsvector('spanish', razon_social || ' ' || rfc));

-- Búsqueda full-text: COG
CREATE INDEX idx_cog_search
ON procurement_cog
USING gin(to_tsvector('spanish', descripcion || ' ' || palabras_clave));
```

---

## 14. Migraciones y Backup

### Comandos Django

```bash
# Windows PowerShell (desde backend/)
python manage.py makemigrations <app_name>
python manage.py sqlmigrate <app_name> <migration_number>
python manage.py migrate
python manage.py migrate_schemas       # django-tenants: replica en todos los tenants
python manage.py showmigrations

# Crear tenant
python manage.py create_tenant --schema_name=org_001 --name="Organización" --domain=org.midominio.com
```

### Backup PostgreSQL (Producción)

```bash
# Backup completo (todos los esquemas)
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -f backup_$(date +%Y%m%d).dump

# Backup de un tenant específico
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -n schema_001 -F c -f tenant_001.dump

# Restore
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME -c backup_20260505.dump
```

### Backup SQLite (Desarrollo)

```powershell
Copy-Item -LiteralPath "db.sqlite3" -Destination "db_backup_$(Get-Date -Format 'yyyyMMdd').sqlite3"
```

---

*Última actualización: mayo 2026 — 38 entidades, 13 apps Django, PostgreSQL 15+ con django-tenants.*
