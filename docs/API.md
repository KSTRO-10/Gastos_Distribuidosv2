# 📚 API Documentation

Documentación completa de la API REST de Gastos Distribuidos v2.

## Base URL

```
Desarrollo: http://localhost:8000/api/
Producción: https://api.gastosdistribuidos.com/api/
```

## Autenticación

La API utiliza JWT (JSON Web Tokens) para autenticación.

### Obtener Token

```http
POST /auth/token/
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña"
}
```

**Respuesta exitosa (200):**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "usuario@ejemplo.com",
    "full_name": "Nombre Completo",
    "role": "admin"
  }
}
```

### Refrescar Token

```http
POST /auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### Usar Token

Incluir en el header de todas las peticiones:
```http
Authorization: Bearer <access_token>
```

---

## Endpoints

### 👤 Usuarios

#### Listar usuarios
```http
GET /accounts/users/
Authorization: Bearer <token>
```

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| role | string | Filtrar por rol |
| is_active | boolean | Filtrar por estado |
| search | string | Buscar por nombre/email |

#### Crear usuario
```http
POST /accounts/users/
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "nuevo@ejemplo.com",
  "password": "password123",
  "first_name": "Nombre",
  "last_name": "Apellido",
  "role": "area"
}
```

#### Obtener usuario
```http
GET /accounts/users/{id}/
```

#### Actualizar usuario
```http
PATCH /accounts/users/{id}/
```

#### Obtener perfil actual
```http
GET /accounts/users/me/
```

#### Subir o actualizar INE
```http
POST /auth/users/upload_ine/
Authorization: Bearer <token>
Content-Type: multipart/form-data

ine_foto: <archivo imagen>
```

**Respuesta (200):**
```json
{
  "id": 1,
  "email": "usuario@ejemplo.com",
  "full_name": "Nombre Completo",
  "ine_foto": "https://api.example.com/media/ine/usuario_ine.jpg",
  "ine_verificada": false,
  "ine_rechazada": false,
  "ine_rechazo_motivo": ""
}
```

> [!NOTE]
> Al subir una nueva INE se resetea el estado de verificación. Un administrador debe aprobarla de nuevo. Los campos INE también se incluyen en la respuesta del login (`POST /auth/token/`).

---

### 🏢 Áreas

#### Listar áreas
```http
GET /areas/
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "name": "Sistemas",
    "code": "SIS",
    "manager": 5,
    "manager_name": "Juan Pérez",
    "presupuesto_anual": "500000.00",
    "is_active": true
  }
]
```

#### Crear área
```http
POST /areas/
Content-Type: application/json

{
  "name": "Nueva Área",
  "code": "NAR",
  "manager": 5,
  "presupuesto_anual": 100000
}
```

---

### 🏪 Proveedores

#### Listar proveedores
```http
GET /companies/proveedores/
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "razon_social": "Proveedor SA de CV",
    "nombre_comercial": "Proveedor",
    "rfc": "PRO123456ABC",
    "email": "contacto@proveedor.com",
    "telefono": "555-1234567",
    "estado": "activo",
    "is_active": true
  }
]
```

#### Crear proveedor
```http
POST /companies/proveedores/
```

#### Aprobar proveedor
```http
POST /companies/proveedores/{id}/approve/
```

#### Suspender proveedor
```http
POST /companies/proveedores/{id}/suspend/
```

---

### �️ Catálogo de Productos de Proveedor

**Endpoint:** `/companies/catalogo-productos/`

Permite a los proveedores gestionar su catálogo de productos con precios unitarios. El sistema usa este catálogo para generar automáticamente cotizaciones cuando se solicitan productos que coincidan con los COGs registrados.

#### Listar productos del catálogo
```http
GET /companies/catalogo-productos/?search=papel&cog=1
Authorization: Bearer <token>
```

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| search | string | Buscar por nombre o descripción |
| cog | integer | Filtrar por COG (Código de Gasto) |
| proveedor | integer | Filtrar por proveedor (admin) |
| active_only | boolean | Mostrar solo productos activos (default: true) |

**Respuesta (200):**
```json
{
  "count": 5,
  "results": [
    {
      "id": 1,
      "proveedor_id": 3,
      "proveedor_nombre": "Papelería ABC",
      "cog_id": 12,
      "cog_codigo": "COG-0101-001",
      "cog_descripcion": "Papel y papelería",
      "nombre": "Papel Bond Blanco 80gr",
      "descripcion": "Hojas blancas de alta calidad",
      "unidad": "Resma",
      "precio_unitario": "85.50",
      "marca": "Copamex",
      "modelo": "A4",
      "is_active": true,
      "created_at": "2026-03-01T10:30:00Z",
      "updated_at": "2026-03-01T10:30:00Z"
    }
  ]
}
```

#### Crear producto
```http
POST /companies/catalogo-productos/
Authorization: Bearer <token>
Content-Type: application/json

{
  "cog": 12,
  "nombre": "Papel Bond Blanco 80gr",
  "descripcion": "Hojas blancas de alta calidad",
  "unidad": "Resma",
  "precio_unitario": "85.50",
  "marca": "Copamex",
  "modelo": "A4"
}
```

**Respuesta (201):** Objeto producto creado.

#### Actualizar producto
```http
PATCH /companies/catalogo-productos/{id}/
Authorization: Bearer <token>
Content-Type: application/json

{
  "precio_unitario": "87.00"
}
```

#### Eliminar producto
```http
DELETE /companies/catalogo-productos/{id}/
Authorization: Bearer <token>
```

#### Cargar productos desde CSV
```http
POST /companies/catalogo-productos/upload_csv/
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <archivo CSV>
```

**Formato del CSV:**
```csv
cog_codigo,nombre,descripcion,unidad,precio_unitario,marca,modelo
COG-0101-001,Papel Bond Blanco 80gr,Hojas blancas de alta calidad,Resma,85.50,Copamex,A4
COG-0101-002,Papel Bond Blanco 90gr,Hojas blancas premium,Resma,95.00,Copamex,A4
```

**Respuesta (200):**
```json
{
  "created": 2,
  "updated": 1,
  "errors": [
    {
      "row": 3,
      "error": "COG no existe"
    }
  ]
}
```

> [!NOTE]
> Los proveedores solo pueden ver y editar sus propios productos. El admin/tesorería pueden ver todos.

---

### �📦 Catálogo de Productos (COGs)

#### Listar productos
```http
GET /procurement/cogs/
```

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| search | string | Buscar por código/nombre |
| categoria | string | Filtrar por categoría |

**Respuesta:**
```json
[
  {
    "id": 1,
    "codigo": "MAT001",
    "nombre": "Papel Bond",
    "descripcion": "Papel bond carta 500 hojas",
    "categoria": "Papelería",
    "unidad_medida": "Paquete",
    "precio_referencia": "85.00",
    "activo": true
  }
]
```

---

### 📝 Solicitudes de Material

#### Listar solicitudes
```http
GET /procurement/solicitudes/
```

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| estado | string | Filtrar por estado |
| area | integer | Filtrar por área |
| fecha_desde | date | Fecha inicial |
| fecha_hasta | date | Fecha final |

**Estados disponibles:**
- `pendiente_verificacion` — INE subida, esperando aprobación de admin
- `ine_rechazada` — INE rechazada, usuario debe resubir
- `borrador`
- `enviado`
- `en_cotizacion`
- `cotizado`
- `autorizado`
- `ordenado`
- `completado`
- `cancelado`

#### Crear solicitud
```http
POST /procurement/solicitudes/
Content-Type: multipart/form-data   (si el usuario no tiene INE registrada)
Content-Type: application/json      (si el usuario ya tiene INE)
```

Cuando el usuario **no tiene INE registrada**, el payload debe ser `multipart/form-data`:

```
data: <JSON stringificado con los campos de la solicitud>
ine_foto: <archivo imagen de la INE>
```

Cuando el usuario ya tiene INE, se puede enviar JSON normal:

```json
{
  "area": 1,
  "descripcion": "Material de oficina mensual",
  "fecha_requerida": "2026-02-15",
  "prioridad": "media",
  "detalles": [
    {
      "cog": 1,
      "concepto": "Papel Bond",
      "descripcion": "Papel para impresora",
      "cantidad": 10,
      "unidad": "Paquete",
      "precio_estimado": 85.00
    }
  ]
}
```

> [!NOTE]
> Si el usuario no tiene INE registrada, la solicitud se crea con estado `pendiente_verificacion` y permanece bloqueada hasta que un administrador apruebe la INE.
```

#### Obtener solicitud
```http
GET /procurement/solicitudes/{id}/
```

**Respuesta:**
```json
{
  "id": 1,
  "numero": "SOL-2026-0001",
  "area": 1,
  "area_nombre": "Sistemas",
  "descripcion": "Material de oficina",
  "estado": "enviado",
  "estado_display": "Enviado",
  "fecha_solicitud": "2026-01-24",
  "fecha_requerida": "2026-02-15",
  "prioridad": "media",
  "total_estimado": "850.00",
  "detalles": [...],
  "created_by": 1,
  "created_by_nombre": "Admin",
  "created_at": "2026-01-24T10:30:00Z"
}
```

#### Enviar solicitud
```http
POST /procurement/solicitudes/{id}/submit/
```

#### Cancelar solicitud
```http
POST /procurement/solicitudes/{id}/cancel/
```

#### Verificar INE (admin)
```http
POST /procurement/solicitudes/{id}/verificar_ine/
Authorization: Bearer <token>
Content-Type: application/json

{
  "accion": "aprobar"
}
```

O para rechazar:
```json
{
  "accion": "rechazar",
  "motivo": "La foto de la INE está borrosa, suba una imagen más clara."
}
```

**Respuesta aprobación (200):**
```json
{
  "detail": "INE verificada correctamente.",
  "estado": "borrador"
}
```

**Respuesta rechazo (200):**
```json
{
  "detail": "INE rechazada.",
  "estado": "ine_rechazada"
}
```

> [!NOTE]
> Solo usuarios con rol `admin` pueden usar este endpoint. Al aprobar, la solicitud pasa a estado `borrador` y el usuario puede operarla normalmente.

#### Re-subir INE tras rechazo
```http
POST /procurement/solicitudes/{id}/resubir_ine/
Authorization: Bearer <token>
Content-Type: multipart/form-data

ine_foto: <archivo imagen>
```

**Respuesta (200):**
```json
{
  "detail": "INE re-subida correctamente. Pendiente de verificación.",
  "estado": "pendiente_verificacion"
}
```

---

### 📋 Cotizaciones

#### Listar cotizaciones
```http
GET /quotations/cotizaciones/
```

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| solicitud | integer | Filtrar por solicitud |
| proveedor | integer | Filtrar por proveedor |
| estado | string | Filtrar por estado |

#### Crear cotización
```http
POST /quotations/cotizaciones/
Content-Type: application/json

{
  "solicitud": 1,
  "proveedor": 1,
  "fecha": "2026-01-24",
  "vigencia": "2026-02-24",
  "tiempo_entrega": "5 días hábiles",
  "condiciones_pago": "Crédito 30 días",
  "detalles": [
    {
      "detalle_material": 1,
      "concepto": "Papel Bond",
      "cantidad": 10,
      "unidad": "Paquete",
      "precio_unitario": 80.00
    }
  ]
}
```

#### Seleccionar cotización ganadora
```http
POST /quotations/cotizaciones/{id}/select/
```
*Requiere rol: tesoreria*

---

### 🛒 Órdenes de Compra

#### Listar órdenes
```http
GET /orders/
```

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| estado | string | Filtrar por estado |
| proveedor | integer | Filtrar por proveedor |

**Estados:**
- `borrador`
- `enviada`
- `confirmada`
- `parcial`
- `entregada`
- `cancelada`

#### Crear orden
```http
POST /orders/
Content-Type: application/json

{
  "proveedor": 1,
  "autorizacion": 1,
  "cotizacion": 1,
  "fecha_emision": "2026-01-24",
  "fecha_entrega_esperada": "2026-02-01",
  "condiciones_pago": "Crédito 30 días",
  "lugar_entrega": "Almacén central",
  "detalles": [...]
}
```

#### Enviar orden a proveedor
```http
POST /orders/{id}/send/
```
*Requiere rol: adquisiciones*

#### Confirmar orden (proveedor)
```http
POST /orders/{id}/confirm/
Content-Type: application/json

{
  "referencia_externa": "PED-12345"
}
```
*Requiere rol: proveedor*

#### Cancelar orden
```http
POST /orders/{id}/cancel/
```

---

### 🧾 Facturas

#### Listar facturas
```http
GET /invoices/facturas/
```

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| status | string | pendiente, procesada, distribuida |
| proveedor | integer | Filtrar por proveedor |

#### Subir factura
```http
POST /invoices/facturas/
Content-Type: multipart/form-data

archivo_xml: <file>
archivo_pdf: <file>
proveedor: 1
orden: 1
```

#### Distribuir gastos
```http
POST /invoices/facturas/{id}/distribute/
Content-Type: application/json

{
  "distribuciones": [
    {
      "area": 1,
      "monto": 500.00,
      "concepto": "Material de oficina"
    },
    {
      "area": 2,
      "monto": 350.00,
      "concepto": "Material de oficina"
    }
  ]
}
```

---

### 📊 Dashboard y Reportes

#### Estadísticas generales
```http
GET /reports/dashboard/stats/
```

**Respuesta:**
```json
{
  "solicitudes_pendientes": 5,
  "solicitudes_aprobadas": 12,
  "cotizaciones_pendientes": 3,
  "ordenes_activas": 8,
  "ordenes_completadas": 45,
  "facturas_pendientes": 2,
  "total_gastado_mes": 125000.00,
  "total_presupuesto": 500000.00,
  "total_disponible": 375000.00,
  "user_role": "admin"
}
```

#### Gastos por área
```http
GET /reports/dashboard/gastos-por-area/
```

#### Gastos mensuales
```http
GET /reports/dashboard/gastos-mensuales/
```

#### Dashboard del proveedor
```http
GET /reports/proveedor/dashboard/
```
*Solo para rol proveedor*

#### Solicitudes para cotizar
```http
GET /reports/proveedor/solicitudes-para-cotizar/
```
*Solo para rol proveedor*

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token inválido o expirado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error |

**Formato de error:**
```json
{
  "detail": "Mensaje de error",
  "code": "error_code"
}
```

---

## Rate Limiting

- 1000 requests por hora por usuario autenticado
- 100 requests por hora para endpoints públicos

---

## Paginación

La API usa paginación por defecto:

```json
{
  "count": 100,
  "next": "http://api/recurso/?page=2",
  "previous": null,
  "results": [...]
}
```

**Parámetros:**
- `page`: Número de página
- `page_size`: Items por página (máx 100)

---

## Versionado

La API actual es v1. Futuras versiones serán anunciadas.

---

*Documentación generada el 24 de enero de 2026*
