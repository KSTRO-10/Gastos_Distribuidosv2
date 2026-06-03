# 🎯 Feature: Catálogo de Proveedores y Auto-Cotización

**Versión:** 1.0  
**Fecha:** Marzo 2, 2026  
**Estado:** ✅ Completado

---

## 📋 Resumen Ejecutivo

Nuevo feature que permite a los **proveedores** registrar un catálogo de productos con precios, y al **sistema** generar automáticamente cotizaciones basadas en coincidencias de COG (Clasificador por Objeto del Gasto).

**Beneficios:**
- ⏱️ Reduce tiempo de cotización de días a segundos
- 📊 Vista comparativa lado-a-lado de todas las opciones
- 🤖 Automatización inteligente con matching por COG + scoring textual
- 💼 Mejora participación de proveedores (aparecen automáticamente sin esperar email)

---

## 🎬 Quick Start

### Para Proveedores
```
Login → "Mi Catálogo" → Agregar Productos (manual o CSV)
```

### Para Adquisiciones
```
Solicitud en "En Cotización" → "Buscar en Catálogos" → "Ver Comparativa" → Seleccionar Ganador
```

---

## 🏗️ Cambios Técnicos

### Backend

| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `apps/companies/models.py` | Nuevo modelo `ProductoProveedor` | +50 |
| `apps/companies/serializers.py` | Dos serializers (read/write) | +40 |
| `apps/companies/views.py` | `ProductoProveedorViewSet` + CSV upload | +100 |
| `apps/companies/urls.py` | Ruta `catalogo-productos` | +2 |
| `apps/companies/admin.py` | `ProductoProveedorAdmin` | +15 |
| `apps/companies/migrations/0003_...py` | Migración (automática) | - |
| `apps/quotations/services.py` | Auto-quotation service (NUEVO) | +100 |
| `apps/procurement/views.py` | Acción `buscar_cotizaciones_catalogo` | +20 |
| `apps/quotations/views.py` | Acción `comparar` | +60 |

**Líneas de código backend:** ~400 (nuevo + modificado)

### Frontend

| Archivo | Cambio | Lineas |
|---------|--------|--------|
| `services/catalogoProveedorService.ts` | Service CRUD + CSV (NUEVO) | +80 |
| `services/quotationService.ts` | Interfaces + `getComparativa()` | +60 |
| `services/procurementService.ts` | `buscarCotizacionesCatalogo()` | +10 |
| `pages/proveedor/CatalogoProveedorPage.tsx` | Portal catálogo (NUEVO) | +300 |
| `pages/quotations/ComparativaCotizacionesPage.tsx` | Comparativa (NUEVO) | +280 |
| `pages/procurement/SolicitudDetailPage.tsx` | Dos botones nuevos | +30 |
| `layouts/MainLayout.tsx` | Nav item "Mi Catálogo" | +2 |
| `App.tsx` | Dos rutas nuevas | +5 |

**Líneas de código frontend:** ~770 (nuevo + modificado)

---

## 📊 Base de Datos

### Nuevo Modelo: ProductoProveedor

```
ProductoProveedor {
  id: PK
  proveedor: FK → Proveedor (CASCADE)
  cog: FK → Cog (PROTECT)
  nombre: string(255)
  descripcion: text
  unidad: string(50)          # "Resma", "Caja", "Kg", etc.
  precio_unitario: Decimal(15,2)
  marca: string(100)
  modelo: string(100)
  is_active: bool = True
  created_at: timestamp
  updated_at: timestamp
  
  UniqueConstraint: (proveedor, nombre, unidad)
}
```

**Índices automáticos:**
- PK (id)
- FK (proveedor_id, cog_id)
- Unique (proveedor_id, nombre, unidad)

---

## 🔌 Endpoints API

### Catálogo de Productos

```http
GET    /api/companies/catalogo-productos/          # Listar
POST   /api/companies/catalogo-productos/          # Crear
PATCH  /api/companies/catalogo-productos/{id}/    # Actualizar
DELETE /api/companies/catalogo-productos/{id}/    # Eliminar
POST   /api/companies/catalogo-productos/upload_csv/  # Carga CSV
```

### Auto-Cotización

```http
POST   /api/procurement/solicitudes/{id}/buscar_cotizaciones_catalogo/
```

**Response:**
```json
{
  "cotizaciones_creadas": 2,
  "cotizaciones_ids": [15, 16],
  "proveedores_parciales": [
    {"nombre": "Proveedor X", "productos_encontrados": 2, "total_items": 3}
  ],
  "sin_cobertura": ["Proveedor Y"]
}
```

### Comparativa

```http
GET    /api/quotations/cotizaciones/comparar/{solicitud_id}/
```

**Response:**
```json
{
  "solicitud": {...},
  "items": [...],
  "proveedores": [...],
  "comparativa": [
    [{"precio_unitario": 85.50, "subtotal": 256.50, ...}, ...],
    ...
  ],
  "mejores_precios": [0, 1, 0]
}
```

---

## 🎨 Interfaces Frontend

### CatalogoProveedorPage

**Características:**
- ✅ Tabla de productos con búsqueda
- ✅ Formulario modal para agregar/editar
- ✅ Modal carga CSV con descarga de plantilla
- ✅ Confirmación de eliminación
- ✅ Validación de precios > 0
- ✅ Filtros por COG y búsqueda textual

**Ruta:** `/portal/catalogo` (solo para proveedores)

### ComparativaCotizacionesPage

**Características:**
- ✅ Tarjetas resumen de proveedores
- ✅ Tabla comparativa items vs proveedores
- ✅ Precios resaltados en verde (mejores)
- ✅ Botón "Seleccionar" ganador
- ✅ Links a detalle de cotización
- ✅ Manejo de sin cotizaciones

**Ruta:** `/cotizaciones/comparar/:solicitudId` (admin/adquisiciones/tesorería)

---

## 🔐 Permisos

| Acción | Admin | Adquisiciones | Tesorería | Área | Almacén | Proveedor |
|--------|-------|---------------|-----------|------|---------|-----------|
| Ver propio catálogo | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Editar propio catálogo | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ver todos catálogos | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Buscar en catálogos | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ver comparativa | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Seleccionar ganador | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🧪 Cómo Probar

### Test 1: Cargar Catálogo

1. Inicia sesión como **proveedor**
2. Navega a **"Mi Catálogo"**
3. Clic **"Agregar Producto"**
4. Selecciona un COG, completa datos, guarda
5. Verifica que aparece en la tabla

### Test 2: Carga CSV

1. Desde **"Mi Catálogo"**, clic **"Cargar CSV"**
2. Descarga plantilla
3. Llena con 5-10 productos
4. Sube y verifica resumen

### Test 3: Auto-Cotización

1. Inicia sesión como **adquisiciones**
2. Abre solicitud en estado **"En Cotización"**
3. Clic **"Buscar en Catálogos"**
4. Sistema busca proveedores cuyo catálogo cubre todos los ítems
5. Toast muestra cotizaciones creadas

### Test 4: Comparativa

1. Desde detalle de solicitud, clic **"Ver Comparativa"**
2. Verás tarjetas de proveedores
3. Tabla comparativa lado-a-lado
4. Precios en verde marcan mejores opción
5. Clic **"Seleccionar"** para elegir ganador

---

## 📚 Documentación

| Archivo | Sección |
|---------|---------|
| `API.md` | Endpoints con ejemplos request/response |
| `MANUAL_USUARIO.md` | Guía para proveedores y adquisiciones |
| `ARCHITECTURE.md` | Flujos de datos de comparación |
| `DOCUMENTACION_TECNICA.md` | Sección 11: Detalles técnicos completos |

---

## ✨ Algoritmo de Matching (Clave)

```python
# 1. Filtrar productos del mismo COG
productos = ProductoProveedor.objects.filter(
    cog=detalle.cog,
    is_active=True
)

# 2. Scoring textual (palabra clave coincidencia)
score = contar_palabras_coincidentes(
    detalle.concepto + detalle.descripcion,
    producto.nombre + producto.descripcion
)

# 3. Bonus por unidad exacta
if producto.unidad == detalle.unidad:
    score += 2

# 4. Fallback
if not mejor_producto:
    return productos.first()  # Cualquiera del COG
```

---

## 🐛 Consideraciones de Edge Cases

| Caso | Comportamiento |
|------|----------------|
| Proveedor sin productos | No se crea cotización (cobertura 0%) |
| Proveedor sin ese COG | Se busca otro producto (fallback) |
| Cotización ya existe | No se crea duplicado |
| Estado solicitud inválido | Error 400 (debe ser en_cotización/cotizado) |
| CSV con errores de formato | Toast muestra fila + error |
| Precio unitario = 0 | Validación rechaza (precio > 0) |

---

## 📈 Métricas de Éxito

- ✅ Tiempo de cotización: de días → minutos
- ✅ Proveedores participantes: visibilidad automática
- ✅ Tasa de conversión: mejor vista comparativa
- ✅ Satisfacción usuario: menos emails, más automatización

---

## 🚀 Próximos Pasos (Futurados)

- [ ] Webhooks para sincronización de catálogos en tiempo real
- [ ] Historial de cambios de precios en catálogos
- [ ] Alertas cuando proveedor baja su precio
- [ ] Análisis predictivo para mejores cotizaciones
- [ ] Integración con portales de E-Commerce de proveedores

---

## 📝 Notas para Desarrolladores

1. **Orden de creación:** Primero backend (models, migrations), luego services, luego frontend
2. **Testing:** Prioritario testear matching algorithm con COGs similares
3. **Performance:** Usar `prefetch_related()` para quey de comparativa
4. **Localización:** Asegurar que CSV soporta caracteres acentuados (UTF-8)
5. **Security:** Admin/tesorería ven todos catálogos, proveedor solo los suyos

---

**Autor:** GitHub Copilot  
**Revisión:** Pendiente  
**Última actualización:** March 2, 2026
