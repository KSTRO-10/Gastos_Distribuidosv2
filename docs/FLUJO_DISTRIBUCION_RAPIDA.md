# Flujo de Distribución Rápida de Facturas CFDI

**Versión:** 1.0  
**Fecha:** 26 de febrero de 2026  
**Módulo:** Invoices (Facturas)  
**Estado:** Implementado y funcional

---

## Índice

1. [Descripción General](#descripción-general)
2. [Flujo Visual (Frontend)](#flujo-visual-frontend)
3. [Flujo Interno (Backend)](#flujo-interno-backend)
4. [Cambios en la Base de Datos](#cambios-en-la-base-de-datos)
5. [Casos de Error](#casos-de-error)
6. [Diagrama de Secuencia](#diagrama-de-secuencia)
7. [Auditoría y Logging](#auditoría-y-logging)

---

## Descripción General

El flujo de **Distribución Rápida** permite a los usuarios (con rol Tesorería o Admin) distribuir gastos de facturas CFDI directamente a áreas en 2-3 pasos, sin pasar por el proceso completo de solicitud → cotización → orden → recepción.

### Propósito del Flujo
- Agilizar la distribución cuando ya existen facturas emitidas
- Evitar pasos innecesarios de procura cuando hay pre-acuerdos de proveedor
- Permitir distribución en tiempo real con auditoría completa

### Actores Principales
- **Usuario Frontend:** Tesorería o Admin que distribuye gastos
- **Sistema Backend:** Django + DRF que procesa y valida
- **Base de Datos:** SQLite que registra distribuciones

### Entidades Involucradas
- **Factura:** Documento fiscal CFDI con conceptos
- **FacturaDetalle:** Líneas de concepto dentro de la factura (CÁMARA 4K, SERVICIO WEB, etc.)
- **DistribucionGasto:** Registro que asigna cada concepto a un área
- **Area:** Departamento/centro de costo que recibe el gasto

---

## Flujo Visual (Frontend)

### 1. Inicio: Página de Distribución Rápida

**URL:** `http://localhost:3000/facturas/distribucion-rapida`

**Ubicación:** Menú principal → Facturas → botón "Dist. Rápida"

**Pantalla inicial:**
```
┌─────────────────────────────────────────────────────────────┐
│ Distribución Rápida                                    ⬜ 🔧  │
│ Suba un archivo XML de factura CFDI para distribuir...     │
└─────────────────────────────────────────────────────────────┘

✓ Subir XML          2  Distribuir Gastos

┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  [Dropzone] Arrastre su archivo XML aquí                   │
│                                                               │
│  📁 Seleccionar XML *     📎 Adjuntar PDF (opcional)       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2. Fase 1: Upload del XML

**Acciones del Usuario:**
- Arrastra un archivo `.xml` (CFDI 4.0) al dropzone, O
- Hace clic en "Seleccionar XML" y elige el archivo

**Validaciones en el Navegador:**
```javascript
// frontend/src/pages/invoices/DistribucionRapidaPage.tsx:140
if (!xmlFile) return  // No envía si no hay XML
```

**Que hace visualmente:**
- Archivo se muestra en tarjeta con ícono, nombre, tamaño
- Opción para quitar el archivo (botón ×)
- PDF es completamente opcional

**Al hacer clic "Procesar Factura":**
```
1. Valida que xmlFile ≠ null
2. Spinner cenrado: "Procesando archivo XML..."
3. Envía multipart/form-data a: POST /api/invoices/upload-and-process/
   {
     "xml_file": <Blob>,
     "pdf_file": <opcional>
   }
```

**Respuesta exitosa (201 Created):**
```json
{
  "message": "Factura procesada correctamente.",
  "factura": {
    "id": 14,
    "uuid_cfdi": "99999999-...",
    "folio": "F-1050",
    "serie": "A",
    "fecha": "2026-02-26",
    "nombre_emisor": "SOLUCIONES TECNOLOGICAS AVANZADAS SA DE CV",
    "rfc_emisor": "STA090909XYZ",
    "subtotal": 1200.00,
    "iva": 192.00,
    "total": 1392.00,
    "conceptos": [
      {
        "id": 1,
        "descripcion": "SERVICIO DE HOSPEDAJE WEB ANUAL",
        "importe": 1200.00
      }
    ],
    "is_quick_flow": true
  }
}
```

### 3. Paso a Fase 2: Tabla de Distribución

**Interfaz se transforma:**

```
┌──────────────────────────────────────────────────────────────┐
│ Factura: 99999999... — SOLUCIONES TECNOLOGICAS...  ⬜ 🔧 📋 │
└──────────────────────────────────────────────────────────────┘

✓ Subir XML          ⚫ Distribuir Gastos  (step indicator)

┌──────────────────────────────────────────────────────────────┐
│ PROVEEDOR                  FOLIO/SERIE       SUBTOTAL/IVA    │
│ SOLUCIONES TEGNOLOGICAS    F-1050            $1,200.00       │
│ STA090909XYZ               2026-02-26        IVA: $192.00    │
└──────────────────────────────────────────────────────────────┘

TOTAL: $1,392.00 (1 concepto)

┌──────────────────────────────────────────────────────────────┐
│ Asignar Áreas a Conceptos                                    │
│ Seleccione el área responsable de cada concepto              │
├──────────────────────────────────────────────────────────────┤
│ CONCEPTO          │ IMPORTE │ ÁREA *      │ %  │ MONTO       │
├──────────────────────────────────────────────────────────────┤
│ SERVICIO HOSPEDAJE│$1,200.00│[Seleccione] │100%│ $1,200.00   │
│ WEB ANUAL         │         │ área...     │    │             │
└──────────────────────────────────────────────────────────────┘
                                    Total Distribuido: $0.00
```

### 4. Usuario Asigna Áreas (Interactividad)

**Click en dropdown "Seleccione área":**

```html
<!-- Dropdown renderizado en frontend/src/pages/invoices/DistribucionRapidaPage.tsx:430 -->
<select value={dist.area_id} onChange={(e) => handleAreaChange(index, e.target.value)}>
  <option value="">Seleccionar área...</option>
  <option value="1">Administración</option>
  <option value="2">Recursos Humanos</option>
  <option value="3">Tecnología</option>
  <option value="4">Marketing</option>
</select>
```

**Actions del Usuario:**
1. Selecciona "Recursos Humanos" (id=2)
2. Ajusta % si quiere distribuir parcialmente (ej: 50%)
3. Opcionales: Agrega nota (ej: "Para capacitación del equipo")

**Estado en React (en memoria):**
```javascript
distribuciones = [
  {
    concepto_id: 1,
    concepto_desc: "SERVICIO DE HOSPEDAJE WEB ANUAL",
    importe: 1200.00,
    area_id: "2",  // ← Asignado
    porcentaje: 100,
    monto: 1200.00,  // ← Recalculado
    notas: "nada"
  }
]
```

**Pantalla después de asignar:**
```
┌──────────────────────────────────────────────────────────────┐
│ CONCEPTO          │ IMPORTE │ ÁREA            │ % │ MONTO    │
├──────────────────────────────────────────────────────────────┤
│ SERVICIO HOSPEDAJE│$1,200.00│Recursos Humanos │100│$1,200.00 │
└──────────────────────────────────────────────────────────────┘
                                    Total Distribuido: $1,200.00

[← Subir otro XML]                    [Cancelar] [Distribuir Gastos ✓]
```

**El botón "Distribuir Gastos" ahora está HABILITADO** porque:
- `allAreasSelected = true` (todos los conceptos tienen área)
- `distribuciones.length > 0` (hay datos)

### 5. Validación Final y Envío

**Al hacer clic "Distribuir Gastos":**

```javascript
// frontend/src/pages/invoices/DistribucionRapidaPage.tsx:140-165
const handleDistribute = async () => {
  // 1. Validación: ¿todos tienen área?
  const incomplete = distribuciones.filter(d => !d.area_id)
  if (incomplete.length > 0) {
    setError('Debe asignar un área a todos los conceptos')
    return  // Detiene acá
  }

  // 2. Construye payload
  const payload: DistribucionData[] = distribuciones.map(d => ({
    concepto_id: 1,
    area_id: 2,
    monto: 1200.00,
    porcentaje: 100,
    notas: "nada"
  }))

  // 3. Envía
  await facturaService.distributeFactura(factura.id, payload)
  // POST /api/invoices/14/distribute/
  // Content-Type: application/json
  // Body: { "distributions": [ {...} ] }
}
```

### 6. Respuesta y Redirección

**Caso Exitoso:**

```
(Spinner en botón por 2-3 segundos)

✅ ¡Distribución completada exitosamente!  (verde)

(Después de 2 segundos: redirige a /facturas)
```

**Caso Error (ejemplo: área inválida):**

```
❌ Error al distribuir los gastos  (rojo)
   Campo error: El área 999 no existe o no está activa.
   
(Usuario puede corregir o cancelar)
```

---

## Flujo Interno (Backend)

### 1. Recepción de Solicitud POST

**Endpoint:** `POST /api/invoices/{id}/distribute/`

**Headers esperados:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
```

**Body recibido:**
```json
{
  "distributions": [
    {
      "concepto_id": 1,
      "area_id": 2,
      "monto": 1200.00,
      "porcentaje": 100,
      "notas": "nada"
    }
  ]
}
```

### 2. Pipeline de Procesamiento en ViewSet

**Archivo:** `backend/apps/invoices/views.py:90-117`

#### a) Obtención de la Factura
```python
@action(detail=True, methods=['post'], permission_classes=[IsTesoreria])
def distribute(self, request, pk=None):
    factura = self.get_object()  # Obtiene Factura con id=14
    # SELECT * FROM invoices_factura WHERE id=14
```

#### b) Validación de Estado
```python
if factura.status not in [Factura.EstadoChoices.PROCESADA, 
                          Factura.EstadoChoices.DISTRIBUIDA]:
    return Response(
        {'error': 'La factura debe estar procesada para distribuir.'},
        status=status.HTTP_400_BAD_REQUEST  # 400
    )
```

**Factura válida:** estado = "procesada" ✓

**Estados válidos:**
- `PROCESADA` - Ya se leyó el XML, se extrajeron conceptos
- `DISTRIBUIDA` - Ya se distribuyó antes (allowing re-distribution)

**Error 400 si:** "pendiente", "procesando", "error"

#### c) Validación de Datos
```python
serializer = DistributeRequestSerializer(data=request.data)
serializer.is_valid(raise_exception=True)  # Si falla → 400

# Si pasa, obtiene:
distributions = serializer.validated_data['distributions']
```

### 3. Validación con DistributeRequestSerializer

**Archivo:** `backend/apps/invoices/serializers.py:89-136`

Para **cada distribución** valida:

```python
# Paso 1: Campos requeridos
if 'area_id' not in dist:
    raise ValidationError("Distribución 1: requiere area_id.")
if 'concepto_id' not in dist:
    raise ValidationError("Distribución 1: requiere concepto_id.")
if 'monto' not in dist:
    raise ValidationError("Distribución 1: requiere monto.")

# Paso 2: Tipos válidos
try:
    dist['area_id'] = int(dist['area_id'])  # "2" → 2
except ValueError:
    raise ValidationError("Distribución 1: area_id debe ser un número.")

try:
    dist['concepto_id'] = int(dist['concepto_id'])  # "1" → 1
except ValueError:
    raise ValidationError("Distribución 1: concepto_id debe ser un número.")

# Paso 3: Monto válido (> 0)
try:
    monto = float(dist['monto'])  # 1200.00
    if monto <= 0:
        raise ValidationError("Distribución 1: monto debe ser mayor a cero.")
except ValueError:
    raise ValidationError("Distribución 1: monto debe ser un número válido.")

# Paso 4: Área existe?
if not Area.objects.filter(id=dist['area_id'], is_active=True).exists():
    # SELECT * FROM areas_area WHERE id=2 AND is_active=true
    raise ValidationError("Distribución 1: el área 2 no existe o no está activa.")

# Paso 5: Sin duplicados de concepto
seen_conceptos = set()
if dist['concepto_id'] in seen_conceptos:
    raise ValidationError("Distribución 1: el concepto 1 ya fue asignado.")
seen_conceptos.add(dist['concepto_id'])
```

**Si pasa TODO:** se retorna a la vista con datos validados ✓

### 4. Enriquecimiento de Datos

```python
# backend/apps/invoices/views.py:105
for dist in distributions:
    dist['created_by_id'] = request.user.id  # Quién lo hizo
```

**Ejemplo después de enriquecimiento:**
```python
distributions = [
    {
        'concepto_id': 1,
        'area_id': 2,
        'monto': 1200.00,
        'porcentaje': 100,
        'notas': 'nada',
        'created_by_id': 1  # ← Agregado
    }
]
```

### 5. Ejecución (Sincrónica o Asincrónica)

```python
# backend/apps/invoices/views.py:108-115
try:
    distribute_invoice_expenses.delay(factura.id, distributions)
    # Intenta Celery (RECOMENDADO en producción)
    message = 'La distribución se procesará en segundo plano.'
except Exception:
    # Fallback: Ejecuta sincrónico (en DESARROLLO)
    distribute_invoice_expenses(factura.id, distributions)
    message = 'Distribución completada correctamente.'
```

**En tu ambiente actual:** Celery no está activo → **Sincrónico** (esperas respuesta)

### 6. Procesamiento en Tarea (Task)

**Archivo:** `backend/apps/invoices/tasks.py:168-205`

```python
@shared_task
def distribute_invoice_expenses(factura_id: int, distribution_data: list):
    """Distribute expenses to areas."""
    from apps.invoices.models import Factura, FacturaDetalle, DistribucionGasto
    from apps.areas.models import Area
    
    try:
        factura = Factura.objects.get(id=14)
        # SELECT * FROM invoices_factura WHERE id=14
        
        with transaction.atomic():  # ← TRANSACCIÓN ATÓMICA
```

#### 6.1. Limpieza de Distribuciones Previas

```python
            # Elimina distribuciones viejas si re-distribuyes
            DistribucionGasto.objects.filter(factura=factura).delete()
            # DELETE FROM invoices_distribuciongasto WHERE factura_id=14
```

**¿Por qué?** Permite re-distribuir sin acumular registros:
- Primera distribución → crea 1 registro
- Re-distribución → borra 1, crea 1 nuevo (sin duplicados)

#### 6.2. Creación de Nuevos Registros

```python
            for dist in distribution_data:  # data = [{...}]
                # Obtiene los objetos
                concepto = FacturaDetalle.objects.get(id=1)
                area = Area.objects.get(id=2)
                
                # Crea el registro
                DistribucionGasto.objects.create(
                    factura=factura,               # Factura #14
                    concepto=concepto,             # Línea de concepto #1
                    area=area,                     # Área Recursos Humanos
                    monto=Decimal('1200.00'),      # Monto distribuido
                    porcentaje=Decimal('100'),     # 100% del concepto
                    notas='nada',                  # Nota opcional
                    created_by_id=1                # Usuario que lo creó
                )
                # INSERT INTO invoices_distribuciongasto (...)
```

#### 6.3. Actualización de Estado

```python
            # Marca factura como distribuida
            factura.status = Factura.EstadoChoices.DISTRIBUIDA
            factura.save(update_fields=['status'])
            # UPDATE invoices_factura SET status='distribuida' WHERE id=14
```

#### 6.4. Confirmación de Transacción

```python
        # Si NO hay excepciones → COMMIT de la transacción
        # Si hay excepciones → ROLLBACK (todo se revierte)
        
        logger.info(f"Distributed expenses for factura 14")
        return {'success': True}
        
    except Exception as e:
        logger.exception(f"Error distributing factura 14: {e}")
        return {'success': False, 'error': str(e)}
```

### 7. Respuesta al Cliente

```python
# backend/apps/invoices/views.py:116-118
return Response({
    'message': 'Distribución completada correctamente.'
})
# HTTP 200 OK
```

**El Frontend recibe:**
```json
{
  "message": "Distribución completada correctamente."
}
```

---

## Cambios en la Base de Datos

### Tabla: `invoices_distribuciongasto`

**Antes:**
```
id | factura_id | concepto_id | area_id | monto | porcentaje | notas | created_by_id | created_at
---|---|---|---|---|---|---|---|---
```

**Después (nuevo registro):**
```
id | factura_id | concepto_id | area_id | monto | porcentaje | notas | created_by_id | created_at
1  | 14         | 1           | 2       | 1200.00 | 100    | nada  | 1            | 2026-02-26 21:49:19
```

| Campo | Valor | Tipo | Significado |
|-------|-------|------|-------------|
| `id` | 1 | INT PK | Identificador único |
| `factura_id` | 14 | FK | Factura a la que pertenece |
| `concepto_id` | 1 | FK | Línea de la factura (CÁMARA WEB) |
| `area_id` | 2 | FK | Área asignada (Recursos Humanos) |
| `monto` | 1200.00 | DECIMAL | Importe distribuido |
| `porcentaje` | 100 | DECIMAL | Porcentaje del concepto (100%) |
| `notas` | 'nada' | VARCHAR | Notas del usuario |
| `created_by_id` | 1 | FK | Usuario que distribuyó |
| `created_at` | 2026-02-26 21:49:19 | DATETIME | Timestamp de creación |

### Tabla: `invoices_factura`

**Campo afectado:** `status`

**Antes:**
```
id | status | uuid_cfdi | total | ...
14 | procesada | 99999999-... | 1392.00 | ...
```

**Después:**
```
id | status | uuid_cfdi | total | ...
14 | distribuida | 99999999-... | 1392.00 | ...
```

| De | A | Significado |
|---|---|---|
| `procesada` | `distribuida` | Factura ha sido distribuida a áreas |

---

## Casos de Error

### Error 1: Factura no procesada

**Condición:** Status = "pendiente" o "procesando"

**Respuesta Backend:**
```http
HTTP 400 Bad Request
Content-Type: application/json

{
  "error": "La factura debe estar procesada para distribuir."
}
```

**Mensaje Frontend:**
```
❌ Error al distribuir los gastos
   La factura debe estar procesada para distribuir.
```

---

### Error 2: Area no existe

**Condición:** `area_id: 999` que no existe en BD

**Validación:** DistributeRequestSerializer

**Respuesta Backend:**
```http
HTTP 400 Bad Request

{
  "distributions.0": "Distribución 1: el área 999 no existe o no está activa."
}
```

**Mensaje Frontend:**
```
❌ Error al distribuir los gastos
   Distribución 1: el área 999 no existe o no está activa.
```

---

### Error 3: Concepto duplicado

**Condición:** Mismo `concepto_id` en 2 distribuciones

**Ejemplo:**
```json
{
  "distributions": [
    {"concepto_id": 1, "area_id": 2, "monto": 600},
    {"concepto_id": 1, "area_id": 3, "monto": 600}  // Duplo
  ]
}
```

**Respuesta Backend:**
```http
HTTP 400 Bad Request

{
  "distributions.1": "Distribución 2: el concepto 1 ya fue asignado."
}
```

**Razón:** "Cada concepto va a UN SOLO área"

---

### Error 4: Monto inválido

**Condición:** `monto: -500` o `monto: 0` o `monto: "xyz"`

**Respuesta Backend:**
```http
HTTP 400 Bad Request

{
  "distributions.0": "Distribución 1: monto debe ser mayor a cero."
}
```

---

### Error 5: Fallo en Base de Datos (transacción)

**Condición:** BD no disponible durante creación

**Respuesta Backend:**
```python
logger.exception(f"Error distributing factura 14: database connection lost")
return {'success': False, 'error': 'database connection lost'}
```

**Behavior:** Toda la transacción se revierte (ROLLBACK)
- No se crea DistribucionGasto
- Factura sigue en estado "procesada"
- Usuario puede reintentar

---

## Diagrama de Secuencia

```
USUARIO (Frontend)              SERVIDOR (Backend)              BASE DE DATOS
    │                                │                                 │
    │──────── Upload XML ────────────→                                │
    │         POST /upload-and-process                                │
    │                                │                                │
    │                           Parse CFDI                           │
    │                           Validate XML                         │
    │                                │═════════ INSERT conceptos ════→│
    │                                │                                │
    │←──── JSON {factura, conceptos}─│                                │
    │         201 Created                                             │
    │                                                                 │
    │  [Muestra tabla de distribución]                                │
    │  Usuario selecciona áreas                                       │
    │                                                                 │
    │──── POST /invoices/14/distribute/ ────────→                    │
    │      {distributions: [{...}]}              │                   │
    │                                   Validate │                   │
    │                                   - Tipos  │                   │
    │                                   - Ranges │                   │
    │                                   - Exists │                   │
    │                                     │═════→ SELECT area:2 ───→ │
    │                                     │←───── OK (exists) ←────│
    │                                            │                   │
    │                         BEGIN TRANSACTION  │                   │
    │                                     │═════→ DELETE distrib. ──→│
    │                                     │       WHERE factura=14   │
    │                                     │←───── OK ←─────────────│
    │                                            │                   │
    │                                     │═════→ INSERT distrib. ──→│
    │                                     │       (new record)       │
    │                                     │←───── OK ←─────────────│
    │                                            │                   │
    │                                     │═════→ UPDATE factura ───→│
    │                                     │       status='dist'      │
    │                                     │←───── OK ←─────────────│
    │                         COMMIT TRANSACTION  │                   │
    │                                            │                   │
    │←──── {message: "Completado"} ─────────────│                   │
    │         200 OK                                                 │
    │                                                                 │
    │  [Muestra "✅ Distribución completada"]                         │
    │  [Redirige a /facturas después 2s]                             │
    │                                                                 │
```

---

## Auditoría y Logging

### 1. Campo: `created_by_id`

**¿Qué registra?** Usuario que realizó la distribución

**Tabla:** `invoices_distribuciongasto.created_by_id`

**Ejemplo:**
- Usuario "david perez" (id=1) distribuye → se guarda id=1
- Usuario "maria lopez" (id=3) re-distribuye → se guarda id=3

**Query para auditar:**
```sql
SELECT 
    dg.id,
    dg.factura_id,
    dg.area_id,
    dg.monto,
    au.username as distribuido_por,
    dg.created_at
FROM invoices_distribuciongasto dg
JOIN auth_user au ON dg.created_by_id = au.id
WHERE dg.factura_id = 14;
```

### 2. Timestamp: `created_at`

**¿Qué registra?** Fecha y hora exacta de la distribución

**Formato:** `YYYY-MM-DD HH:MM:SS`

**Ejemplo:** `2026-02-26 21:49:19`

### 3. Logs en Console

**Archivo:** `backend/apps/invoices/tasks.py`

```python
# Éxito
logger.info(f"Distributed expenses for factura 14")
# Output: INFO:invoices.tasks:Distributed expenses for factura 14

# Error
logger.exception(f"Error distributing factura 14: {error_message}")
# Output: ERROR:invoices.tasks:Error distributing factura 14: area_id invalid
#         Traceback (most recent call last):...
```

---

## Resumen de Estados

### Estado de Factura

```
Pendiente ──[upload XML]──> Procesando ──[parsed]──> Procesada
                                    ↓
                                  Error

Procesada ──[distribute]──> Distribuida
    ↑                            ↓
    └────── [re-distribute] ─────┘
```

### Validaciones por Estado

| Estado | Puedo distribuir | Razón |
|--------|------------------|-------|
| `pendiente` | ❌ NO | XML aún no se subió |
| `procesando` | ❌ NO | Sistema leyendo XML |
| `procesada` | ✅ SÍ | Conceptos listos |
| `distribuida` | ✅ SÍ | Permite re-distribuir |
| `error` | ❌ NO | Debe reprocessar antes |

---

## Performance y Consideraciones

### Transacción Atómica

**Ventaja:** Si algo falla, TODO se revierte
```
DELETE + INSERT + UPDATE
    ↓
Si hay error en UPDATE → TODO se revierte
No queda estado inconsistente
```

**Tiempo esperado:** 100-500ms

### Re-distribución

**Caso:** Usuario distribuye 2 veces

**Acción:**
1. Primera distribución → crea registro #1
2. Segunda distribución → borra registro #1, crea registro #2

**Resultado:** 1 solo registro final (no duplicados)

### Validación Completa

**Pasos de validación:** 5
1. Factura existe ✓
2. Factura está procesada ✓
3. Campos requeridos ✓
4. Tipos de datos válidos ✓
5. Referencias existen (area, concepto) ✓

**Total:** ~2-5ms validación

---

## Anexo: Estructura de Tables

### FacturaDetalle (Concepto)
```
id: int (PK)
factura_id: int (FK)
clave_prod_serv: varchar
descripcion: varchar ← "SERVICIO DE HOSPEDAJE WEB ANUAL"
importe: decimal ← 1200.00
descuento: decimal
```

### Area
```
id: int (PK)
nombre: varchar ← "Recursos Humanos"
codigo: varchar ← "RH"
is_active: boolean ← true
presupuesto_anual: decimal
```

### DistribucionGasto
```
id: int (PK)
factura_id: int (FK) ← 14
concepto_id: int (FK) ← 1
area_id: int (FK) ← 2
monto: decimal ← 1200.00
porcentaje: decimal ← 100
notas: varchar
created_by_id: int (FK) ← 1
created_at: datetime
```

---

**Documento compilado:** 26/Feb/2026  
**Revisado por:** Arquitecto del Sistema  
**Estatus:** Versión Final 1.0
