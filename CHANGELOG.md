# 📋 Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🪪 Verificación de INE para Solicitudes de Material

#### Backend - Modelos
- **Agregado** 4 campos al modelo `User` en `apps/accounts/models.py`:
  - `ine_foto` — `ImageField(upload_to='ine/', blank=True, null=True)`: Foto de la INE del usuario
  - `ine_verificada` — `BooleanField(default=False)`: Si la INE fue aprobada por un administrador
  - `ine_rechazada` — `BooleanField(default=False)`: Si la INE fue rechazada
  - `ine_rechazo_motivo` — `TextField(blank=True)`: Motivo del rechazo
- **Agregado** 2 nuevos estados a `SolicitudMaterial.EstadoChoices` en `apps/procurement/models.py`:
  - `PENDIENTE_VERIFICACION = 'pendiente_verificacion'`: Solicitud en espera de validación de INE
  - `INE_RECHAZADA = 'ine_rechazada'`: INE rechazada, solicitud bloqueada
- **Modificado** `max_length` del campo `estado` de 20 → 30 para acomodar `pendiente_verificacion`
- **Migraciones** aplicadas: `accounts/0002_user_ine_foto_user_ine_rechazada_and_more`, `procurement/0004_alter_solicitudmaterial_estado`

#### Backend - Serializers
- **Modificado** `UserSerializer` (`apps/accounts/serializers.py`): expone `ine_foto` (URL), `ine_verificada`, `ine_rechazada`, `ine_rechazo_motivo`
- **Modificado** `CustomTokenObtainPairSerializer.validate()`: incluye los 4 campos INE en la respuesta del login
- **Modificado** `SolicitudMaterialSerializer`: agrega `ine_foto` (URL del creador) e `ine_rechazo_motivo` del usuario creador via `SerializerMethodField`

#### Backend - ViewSets & API
- **Modificado** `SolicitudMaterialViewSet.create()` (`apps/procurement/views.py`):
  - Parsers ampliados a `MultiPartParser, FormParser, JSONParser` para soportar multipart/form-data
  - Si `user.ine_foto` es nulo, requiere que se suba la INE junto con la solicitud
  - Establece `estado=PENDIENTE_VERIFICACION` cuando el usuario no tiene INE registrada
  - Parsea el JSON del cuerpo desde el campo `data` en payloads multipart
- **Agregado** `@action verificar_ine` en `SolicitudMaterialViewSet`:
  - `POST /procurement/solicitudes/{id}/verificar_ine/`
  - Solo admin — aprueba o rechaza la INE del creador
  - Si aprueba: `ine_verificada=True`, estado pasa a `borrador`
  - Si rechaza: `ine_rechazada=True`, `ine_rechazo_motivo` guardado, estado pasa a `ine_rechazada`
- **Agregado** `@action resubir_ine` en `SolicitudMaterialViewSet`:
  - `POST /procurement/solicitudes/{id}/resubir_ine/`
  - Usuario puede re-subir su INE tras rechazo; estado regresa a `pendiente_verificacion`
- **Agregado** `@action upload_ine` en `UserViewSet` (`apps/accounts/views.py`):
  - `POST /auth/users/upload_ine/`
  - Endpoint independiente para subir/actualizar foto de INE sin necesidad de crear una solicitud
  - Resetea `ine_rechazada`, `ine_rechazo_motivo` y marca `ine_verificada=False` para nueva verificación

#### Frontend - Tipos e Interfaces
- **Modificado** `stores/authStore.ts`: interfaz `User` extendida con `ine_foto`, `ine_verificada`, `ine_rechazada`, `ine_rechazo_motivo`
- **Modificado** `services/procurementService.ts`: interfaz `SolicitudMaterial` extendida con `ine_foto` e `ine_rechazo_motivo`

#### Frontend - Servicios
- **Modificado** `services/procurementService.ts`:
  - `createSolicitud()` acepta `ineFoto?: File` opcional; envía `multipart/form-data` cuando se incluye foto
  - `verificarIne(id, data)` — POST `/procurement/solicitudes/{id}/verificar_ine/`
  - `resubirIne(id, ineFoto)` — POST `/procurement/solicitudes/{id}/resubir_ine/` (multipart)
- **Modificado** `services/userService.ts`:
  - `uploadIne(ineFoto: File)` — POST `/auth/users/upload_ine/` (multipart)

#### Frontend - Páginas
- **Modificado** `pages/procurement/SolicitudFormPage.tsx`:
  - Modal de subida de INE con preview antes de crear la solicitud
  - Intercepta `onSubmit` y `handleSendDirectly` cuando `user.ine_foto` es nulo
  - Tras upload exitoso: actualiza store de Zustand con los campos INE actualizados
- **Modificado** `pages/procurement/SolicitudDetailPage.tsx`:
  - Banner ámbar + UI de aprobación/rechazo para admin cuando estado es `pendiente_verificacion`
  - Banner rojo + botón de re-upload cuando estado es `ine_rechazada`
  - Modal de rechazo con textarea para motivo
  - Modal de re-subida con preview de imagen
- **Modificado** `pages/procurement/SolicitudesPage.tsx`:
  - Colores de estado agregados: `pendiente_verificacion` (ámbar), `ine_rechazada` (rojo)
  - Tarjeta contextual de gestión de INE (visible para roles `area` y `admin`) con 4 estados:
    - **Sin INE**: botón "Subir INE"
    - **INE rechazada**: motivo del rechazo + botón "Resubir INE"
    - **INE en verificación**: aviso informativo + botón "Actualizar INE"
    - **INE verificada**: confirmación verde + botón "Actualizar INE"
  - Modal de subida/actualización de INE con preview y vista de foto actual

---

### 🛡️ Seguridad - Validación de Facturas

#### Backend - Validaciones CFDI
- **Agregado** Bloque de validación draft para verificar coincidencia de RFC receptor (POST `/api/invoices/upload-and-process/`)
  - Extrae RFC receptor desde `cfdi:Receptor/@Rfc`
  - Compara contra empresa configurada en sistema
  - Permite validación case-insensitive
  - Nota: Validación actualmente desactivada para permitir procesamiento flexible de facturas
- **Mejora Documentada** En [docs/SECURITY_ANALYSIS.md](docs/SECURITY_ANALYSIS.md#inv-receptor-rfc) se registra la vulnerabilidad y el parche implementado

#### Workflow de Implementación
- Validación implementada en [backend/apps/invoices/tasks.py](backend/apps/invoices/tasks.py) línea ~62
- Imports: `Company` model y `ValidationError` desde DRF
- Excepción separada para `ValidationError` en bloque except
- Desactivada mediante comentario para evaluación posterior

### 📦 Catálogo de Productos y Auto-Cotización

#### Backend - Modelos
- **Agregado** Nuevo modelo `ProductoProveedor` en `apps/companies/models.py`
  - FK a `Proveedor` (CASCADE) y `Cog` (PROTECT)
  - Campos: nombre, descripción, unidad, precio_unitario, marca, modelo, is_active
  - Restricción única: (proveedor, nombre, unidad)
- **Migración** `0003_productoproveedor_and_more` aplicada exitosamente

#### Backend - Servicios
- **Agregado** Módulo `apps/quotations/services.py` con auto-cotización:
  - `buscar_producto_para_detalle(detalle, proveedor)` - Matching inteligente por COG + scoring textual
  - `generar_cotizaciones_automaticas(solicitud)` - Crea cotizaciones para proveedores con cobertura 100%
- **Agregado** Acción `buscar_cotizaciones_catalogo` en `SolicitudMaterialViewSet`
  - POST `/api/procurement/solicitudes/{id}/buscar_cotizaciones_catalogo/`
  - Requiere: admin/adquisiciones, solicitud en en_cotización/cotizado
- **Agregado** Acción `comparar` en `CotizacionMaterialViewSet`
  - GET `/api/quotations/cotizaciones/comparar/{solicitud_id}/`
  - Retorna matriz de comparación items × proveedores con mejores precios

#### Backend - ViewSets & API
- **Agregado** `ProductoProveedorViewSet` en `apps/companies/views.py`
  - CRUD completo: GET, POST, PATCH, DELETE
  - Acción `upload_csv` para carga masiva de productos
  - Filtros: search, cog, proveedor (admin), active_only
  - Serializers duales: read (con nombres) y write (nested)
- **Agregado** Rutas en `apps/companies/urls.py`: `catalogo-productos`
- **Agregado** Admin `ProductoProveedorAdmin` en `apps/companies/admin.py`

#### Frontend - Services
- **Agregado** `services/catalogoProveedorService.ts` - CRUD + CSV upload
  - Métodos: getProductos, getProducto, createProducto, updateProducto, deleteProducto, uploadCsv
  - Soporta paginación y filtros (search, cog, proveedor)
- **Mejorado** `services/procurementService.ts`
  - Nuevo método: `buscarCotizacionesCatalogo(id)`
- **Mejorado** `services/quotationService.ts`
  - Nuevas interfaces: `ComparativaData`, `ComparativaCelda`, `ComparativaItem`, `ComparativaProveedor`
  - Nuevo método: `getComparativa(solicitudId)`

#### Frontend - Páginas
- **Agregado** `pages/proveedor/CatalogoProveedorPage.tsx` - Portal catálogo de proveedores
  - Tabla con búsqueda, edición y eliminación
  - Modal para agregar/editar productos con CogCombobox
  - Modal para carga CSV con descarga de plantilla
  - Modal de confirmación para eliminación
  - Validación de precios > 0
  - Acceso: `/portal/catalogo` (solo proveedores)
- **Agregado** `pages/quotations/ComparativaCotizacionesPage.tsx` - Vista comparativa
  - Tarjetas resumen de proveedores (nombre, total, estado, acción)
  - Tabla comparativa items × proveedores con scroll horizontal
  - Precios resaltados en verde (mejores) por ítem
  - Botón "Seleccionar" para elegir cotización ganadora
  - Links a detalle de cotización
  - Acceso: `/cotizaciones/comparar/:solicitudId` (admin/adquisiciones/tesorería)

#### Frontend - Componentes & UI
- **Mejorado** `pages/procurement/SolicitudDetailPage.tsx`
  - Nuevo botón "Buscar en Catálogos" (MagnifyingGlassIcon, variant secondary)
  - Nuevo botón "Ver Comparativa" (TableCellsIcon)
  - Ambos visibles cuando: estado en_cotización/cotizado, rol admin/adquisiciones
  - Manejo de loading y errores con toast
- **Mejorado** `layouts/MainLayout.tsx`
  - Nuevo item en sidebar proveedor: "Mi Catálogo" (ArchiveBoxIcon)
  - Link a `/portal/catalogo`

#### Frontend - Routing
- **Mejorado** `App.tsx`
  - Nueva ruta: `/portal/catalogo` → `CatalogoProveedorPage` (ProtectedRoute: proveedor)
  - Nueva ruta: `/cotizaciones/comparar/:solicitudId` → `ComparativaCotizacionesPage` (ProtectedRoute: admin/adquisiciones/tesorería)

#### Documentación
- **Agregado** Sección 11 en `DOCUMENTACION_TECNICA.md` - Detalles técnicos del catálogo
- **Agregado** Subsección "Mi Catálogo" en `MANUAL_USUARIO.md` - Guía para proveedores
- **Agregado** Sección "Catálogo de Productos de Proveedor" en `API.md` - Endpoints y ejemplos
- **Agregado** Flujo "Auto-Cotización" en `ARCHITECTURE.md` - Diagramas de flujo comparativo
- **Agregado** `FEATURE_CATALOGO_PROVEEDORES.md` - Resumen ejecutivo y guía de testing

#### Testing
- Proveedores pueden cargar productos manual o vía CSV
- Sistema busca automáticamente en catálogos basado en COG + matching textual
- Vista comparativa muestra todos los proveedores con cobertura 100%
- Precios resaltados correctamente (verde = mejor)
- Selección de ganador funciona correctamente

### Por Implementar
- Fase 10: Notificaciones en tiempo real
- Fase 11: Autorizaciones y firmas digitales
- Fase 12: Documentos adjuntos
- Fase 13: Configuración del sistema
- Sistema de plantillas personalizables para generación de PDFs
- Webhooks para sincronización de catálogos en tiempo real
- Historial de cambios de precios en catálogos
- Alertas cuando proveedor baja su precio

---

## [0.9.2] - 2026-02-06

### 👤 Personalización de Perfil de Usuario

#### Backend - Modelos
- **Añadido** Campo `logo` (ImageField) al modelo `Company` para logos empresariales
- **Añadido** Campo `logo` (ImageField) al modelo `Proveedor` para logos de proveedores
- **Migración** `0002_company_logo_proveedor_logo` aplicada exitosamente

#### Backend - Serializers & API
- **Mejorado** `CompanySerializer` - Incluye campo `logo` en la respuesta
- **Mejorado** `ProveedorSerializer` - Incluye campo `logo` en la respuesta
- **Mejorado** `CustomTokenObtainPairSerializer` - Incluye `avatar` y `phone` en respuesta de login JWT
- **Corregido** Configuración de MEDIA proxy faltante para servir avatares en desarrollo

#### Frontend - Sistema de Perfil
- **Añadido** Página `/perfil` (`ProfilePage.tsx`) con 3 tabs:
  - Información Personal: Edición de nombre, teléfono y avatar
  - Contraseña: Cambio seguro de contraseña
  - Preferencias: Notificaciones y configuración (placeholder)
- **Añadido** Componente `AvatarUpload` reutilizable:
  - Drag & drop de imágenes
  - Preview en tiempo real
  - Validación: JPG/PNG/WebP, máx 2MB
  - Soporte para avatares circulares y logos cuadrados
- **Añadido** Enlace clickeable al perfil en sidebar y top bar
- **Mejorado** Avatares reales en MainLayout (sidebar y top bar)
- **Mejorado** Tabla de usuarios muestra fotos reales de perfil

#### Frontend - Portal de Proveedores
- **Añadido** Visualización de logo de proveedor en dashboard
- **Añadido** Enlace "Editar perfil" en header del portal

#### Frontend - State Management
- **Mejorado** `authStore.ts` - Añadido método `updateUser()` para actualizar perfil localmente
- **Mejorado** `userService.ts` - Nuevos métodos:
  - `updateMyProfile()` con soporte para FormData/multipart
  - `getMyProfile()` para obtener datos del usuario autenticado
  - `changePassword()` para cambio de contraseña
- **Corregido** Interface `User` con campo `avatar` opcional

#### Configuración
- **Añadido** Proxy `/media` en `vite.config.ts` para desarrollo local
- **Corregido** Target del proxy de `backend:8000` a `localhost:8000` para entorno sin Docker

#### Imágenes y Media
- **Configurado** Rutas de upload:
  - `avatars/` para fotos de perfil de usuarios
  - `company_logos/` para logos de empresas
  - `proveedor_logos/` para logos de proveedores

---

## [0.9.1] - 2026-01-27

### 🔒 Análisis de Seguridad y Mejoras de UI

#### Seguridad
- **Añadido** `docs/SECURITY_ANALYSIS.md` - Análisis completo de seguridad con vulnerabilidades y soluciones
- **Documentado** Vulnerabilidades críticas: SECRET_KEY hardcodeada, CORS permisivo en local
- **Documentado** Almacenamiento de tokens en localStorage y recomendaciones de httpOnly cookies
- **Documentado** Plan de remediación en 3 fases

#### Backend - Usuarios
- **Corregido** `UserSerializer` - Añadido campo `role_display` para mostrar nombre de rol correctamente
- **Corregido** `UserViewSet` - Deshabilitada paginación para cargar todos los usuarios
- **Mejorado** `UserCreateSerializer` - Manejo robusto de creación de proveedores con RFC único
- **Añadido** Soft delete en `UserViewSet.destroy()` - Desactiva usuarios con registros asociados

#### Backend - Dashboard
- **Añadido** Management command `populate_demo_data` en `apps/reports/management/commands/`
- **Añadido** Datos de demostración: presupuestos, facturas y distribuciones de gastos

#### Frontend - Dashboard
- **Rediseñado** `DashboardPage` header con gradiente indigo-purple premium
- **Añadido** Glassmorphism con backdrop-blur y bordes translúcidos
- **Añadido** Patrón de puntos decorativo y efectos de sombra con color
- **Rediseñado** `Card.tsx` - Nuevos gradientes premium (primary, success, warning, purple)
- **Añadido** Sombras coloreadas para cada tipo de gradiente
- **Añadido** Animaciones de hover en círculos decorativos de StatCard

#### Frontend - Usuarios
- **Mejorado** `UsersPage` - Filtros dinámicos por rol con contadores
- **Añadido** Búsqueda de usuarios por nombre, email o username
- **Añadido** Avatares con iniciales y colores por rol
- **Mejorado** Manejo de errores con mensajes descriptivos

#### Componentes UI
- **Añadido** `PageHeader` - Componente reutilizable con 3 variantes (default, gradient, minimal)

---


## [0.9.0] - 2026-01-24

### 🎉 Portal de Proveedores (Fase 9)

#### Backend
- **Añadido** `ProveedorDashboardView` - Dashboard exclusivo para proveedores con estadísticas
- **Añadido** `SolicitudesParaCotizarView` - Lista de solicitudes abiertas para cotizar
- **Añadido** Endpoints en `/api/reports/proveedor/`

#### Frontend
- **Añadido** Directorio `src/pages/proveedor/` con páginas del portal
- **Añadido** `ProveedorDashboardPage` - Dashboard con info de empresa, estadísticas, órdenes recientes
- **Añadido** `SolicitudesCotizarPage` - Lista de solicitudes disponibles para cotizar
- **Añadido** `NuevaCotizacionPage` - Formulario para enviar cotizaciones
- **Añadido** `MisCotizacionesPage` - Historial de cotizaciones con filtros por estado
- **Añadido** `MisOrdenesPage` - Órdenes asignadas con opción de confirmar
- **Añadido** `MisFacturasPage` - Estado de facturas del proveedor
- **Añadido** `proveedorPortalService.ts` - Servicio API para el portal
- **Añadido** Navegación diferenciada para rol proveedor en `MainLayout`
- **Añadido** Rutas protegidas `/portal/*` en `App.tsx`
- **Añadido** Componente `TextArea` en UI
- **Mejorado** Componente `Card` - Añadida prop `onClick`
- **Mejorado** Redirección automática de proveedores a `/portal`

---

## [0.8.0] - 2026-01-23

### 📊 Dashboard con Filtrado por Rol

#### Backend
- **Añadido** `get_role_filtered_querysets()` - Función central de filtrado por rol
- **Añadido** Filtrado automático en todas las vistas del dashboard
- **Corregido** Referencias a campos del modelo (manager vs responsable, status vs estado)

#### Frontend
- **Añadido** `dashboardService.ts` - Servicio para APIs del dashboard
- **Mejorado** Dashboard muestra datos filtrados según el rol del usuario

---

## [0.7.0] - 2026-01-22

### 📈 Reportes y Gráficos

#### Backend
- **Añadido** App `reports` con vistas de estadísticas
- **Añadido** `DashboardStatsView` - Estadísticas generales
- **Añadido** `GastosPorAreaView` - Gastos agrupados por área
- **Añadido** `GastosMensualesView` - Tendencia mensual de gastos
- **Añadido** `SolicitudesRecientesView` - Últimas solicitudes
- **Añadido** `ActividadRecienteView` - Actividad reciente del sistema

#### Frontend
- **Añadido** `ReportesPage` - Página de reportes con gráficos
- **Añadido** Componentes de gráficos con Recharts
- **Añadido** Dashboard mejorado con KPIs y visualizaciones

---

## [0.6.0] - 2026-01-21

### 🧾 Facturas y Distribución de Gastos (Fase 8)

#### Backend
- **Añadido** App `invoices` con modelos Factura, DistribucionGasto
- **Añadido** Carga de archivos XML/PDF de facturas
- **Añadido** Endpoint de distribución de gastos por área

#### Frontend
- **Añadido** `FacturasPage` - Lista de facturas con filtros
- **Añadido** `FacturaUploadPage` - Subida de facturas
- **Añadido** `FacturaDetailPage` - Detalle de factura
- **Añadido** `FacturaDistributePage` - Distribución a áreas

---

## [0.5.0] - 2026-01-20

### 📦 Inventario y Almacén (Fase 7)

#### Backend
- **Añadido** App `inventory` con modelos EntregaMaterial, SalidaMaterial
- **Añadido** Control de cantidades recibidas vs pendientes

#### Frontend
- **Añadido** `EntregasPage` - Recepción de materiales
- **Añadido** `EntregaFormPage` - Registro de entregas
- **Añadido** `SalidasPage` - Salidas de almacén
- **Añadido** `SalidaFormPage` - Registro de salidas

---

## [0.4.0] - 2026-01-19

### 🛒 Órdenes de Compra (Fase 6)

#### Backend
- **Añadido** App `orders` con modelos SolicitudAutorizacion, AutorizacionPresupuestal, OrdenCompra
- **Añadido** Flujo de autorización presupuestal
- **Añadido** Acciones: send, confirm, cancel en órdenes

#### Frontend
- **Añadido** `OrdenesPage` - Lista de órdenes de compra
- **Añadido** `OrdenFormPage` - Creación/edición de órdenes
- **Añadido** `OrdenDetailPage` - Detalle con acciones

---

## [0.3.0] - 2026-01-18

### 📝 Cotizaciones (Fase 5)

#### Backend
- **Añadido** App `quotations` con modelos CotizacionMaterial, DetalleCotizacion
- **Añadido** Acción de seleccionar cotización ganadora

#### Frontend
- **Añadido** `CotizacionesPage` - Lista de cotizaciones
- **Añadido** `CotizacionFormPage` - Creación de cotizaciones
- **Añadido** `CotizacionDetailPage` - Detalle con opción de seleccionar

---

## [0.2.0] - 2026-01-17

### 📄 Solicitudes de Material (Fase 4)

#### Backend
- **Añadido** App `procurement` con modelos COG, SolicitudMaterial, DetalleMaterial
- **Añadido** Catálogo de productos (COGs)
- **Añadido** Flujo de estados de solicitudes

#### Frontend
- **Añadido** `SolicitudesPage` - Lista con filtros y búsqueda
- **Añadido** `SolicitudFormPage` - Formulario con líneas de detalle
- **Añadido** `SolicitudDetailPage` - Vista detallada
- **Añadido** `procurementService.ts` - Servicio API

---

## [0.1.0] - 2026-01-16

### 🔐 Autenticación y Base (Fases 1-3)

#### Backend
- **Añadido** App `accounts` con modelo User personalizado
- **Añadido** Sistema de roles (admin, tesoreria, adquisiciones, almacen, area, proveedor)
- **Añadido** Autenticación JWT con SimpleJWT
- **Añadido** App `areas` para gestión de departamentos
- **Añadido** App `companies` para empresas y proveedores
- **Añadido** Configuración de desarrollo con SQLite

#### Frontend
- **Añadido** Proyecto React + TypeScript + Vite
- **Añadido** Configuración TailwindCSS
- **Añadido** Sistema de autenticación con Zustand
- **Añadido** `LoginPage` con validación
- **Añadido** `MainLayout` con navegación sidebar
- **Añadido** `DashboardPage` inicial
- **Añadido** Páginas de administración: Users, Áreas, Proveedores
- **Añadido** Componentes UI base: Button, Card, Input, Select, Modal, Table
- **Añadido** Servicios API: auth, users, areas, proveedores

---

## Tipos de Cambios

- 🎉 **Añadido** para nuevas características
- 🔄 **Cambiado** para cambios en funcionalidades existentes
- ⚠️ **Deprecado** para características que serán removidas
- 🗑️ **Removido** para características eliminadas
- 🐛 **Corregido** para corrección de bugs
- 🔒 **Seguridad** para vulnerabilidades
