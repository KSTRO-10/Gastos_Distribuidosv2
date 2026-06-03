# 🗺️ Roadmap - Gastos Distribuidos v2

Este documento describe el plan de desarrollo del sistema, organizado en fases.

## 📊 Estado General

| Estado | Descripción |
|--------|-------------|
| ✅ Completado | Fase terminada y en producción |
| 🔄 En Progreso | Actualmente en desarrollo |
| ⏳ Pendiente | Planificado para futuras versiones |
| 💡 Idea | En evaluación |

---

## Fase 1: Autenticación y Base ✅

**Objetivo**: Establecer la infraestructura base del proyecto.

### Backend
- [x] Configuración Django + DRF
- [x] Modelo de usuario personalizado con email
- [x] Sistema de roles (6 roles)
- [x] Autenticación JWT
- [x] Configuración multi-settings (dev/prod)

### Frontend
- [x] Setup React + TypeScript + Vite
- [x] Configuración TailwindCSS
- [x] Store de autenticación (Zustand)
- [x] Página de login
- [x] Layout principal con sidebar

---

## Fase 2: Gestión de Usuarios ✅

**Objetivo**: CRUD completo de usuarios del sistema.

### Backend
- [x] ViewSet de usuarios
- [x] Serializers con validación
- [x] Permisos por rol

### Frontend
- [x] Página de listado de usuarios
- [x] Modal de crear/editar usuario
- [x] Activar/desactivar usuarios
- [x] Filtros y búsqueda

---

## Fase 3: Áreas y Proveedores ✅

**Objetivo**: Gestión de departamentos y proveedores.

### Backend
- [x] App `areas` con modelo Area
- [x] App `companies` con modelo Proveedor
- [x] Relación proveedor-usuario

### Frontend
- [x] Página de gestión de áreas
- [x] Página de gestión de proveedores
- [x] Presupuesto anual por área

---

## Fase 4: Solicitudes de Material ✅

**Objetivo**: Flujo completo de solicitudes de compra.

### Backend
- [x] Modelo COG (Catálogo de productos)
- [x] Modelo SolicitudMaterial
- [x] Modelo DetalleMaterial
- [x] Estados: borrador → enviado → en_cotización → cotizado → autorizado → ordenado

### Frontend
- [x] Lista de solicitudes con filtros
- [x] Formulario de solicitud con líneas de detalle
- [x] Selección de productos del catálogo
- [x] Vista de detalle de solicitud
- [x] Acciones por estado

---

## Fase 5: Cotizaciones ✅

**Objetivo**: Registro y comparación de cotizaciones.

### Backend
- [x] Modelo CotizacionMaterial
- [x] Modelo DetalleCotizacion
- [x] Acción de seleccionar cotización ganadora
- [x] Estados: pendiente → recibida → seleccionada/rechazada

### Frontend
- [x] Lista de cotizaciones
- [x] Formulario de cotización
- [x] Comparativo de cotizaciones
- [x] Selección de ganador

---

## Fase 6: Órdenes de Compra ✅

**Objetivo**: Generación y seguimiento de órdenes.

### Backend
- [x] Modelo SolicitudAutorizacion
- [x] Modelo AutorizacionPresupuestal
- [x] Modelo OrdenCompra con detalles
- [x] Estados: borrador → enviada → confirmada → parcial → entregada

### Frontend
- [x] Lista de órdenes con filtros
- [x] Formulario de orden
- [x] Acciones: enviar, confirmar, cancelar
- [x] Vista de detalle

---

## Fase 7: Inventario ✅

**Objetivo**: Control de recepción y salidas de almacén.

### Backend
- [x] Modelo EntregaMaterial (recepción)
- [x] Modelo SalidaMaterial (entregas a áreas)
- [x] Control de cantidades

### Frontend
- [x] Página de entregas (recepción)
- [x] Formulario de entrega
- [x] Página de salidas
- [x] Formulario de salida

---

## Fase 8: Facturas y Distribución ✅

**Objetivo**: Gestión de facturas CFDI y distribución contable.

### Backend
- [x] Modelo Factura con campos CFDI
- [x] Modelo DistribucionGasto
- [x] Carga de XML/PDF
- [x] Distribución por área

### Frontend
- [x] Lista de facturas
- [x] Subida de facturas
- [x] Vista de detalle
- [x] Pantalla de distribución de gastos

---

## Fase 9: Portal de Proveedores ✅

**Objetivo**: Acceso exclusivo para proveedores externos.

### Backend
- [x] Dashboard del proveedor
- [x] Listado de solicitudes para cotizar
- [x] Filtrado automático por proveedor

### Frontend
- [x] Dashboard exclusivo con estadísticas
- [x] Ver solicitudes abiertas
- [x] Enviar cotizaciones
- [x] Ver órdenes asignadas
- [x] Confirmar órdenes
- [x] Ver estado de facturas
- [x] Navegación diferenciada

---

## Fase 9.5: Personalización de Perfil de Usuario ✅

**Objetivo**: Permitir a los usuarios gestionar su información personal y apariencia.

### Backend
- [x] Campo `logo` en modelo Company
- [x] Campo `logo` en modelo Proveedor
- [x] Migración para campos de imagen
- [x] Serializers actualizados con campos de imagen
- [x] Inclusión de `avatar` en respuesta JWT
- [x] Configuración de MEDIA_URL y servicio de archivos

### Frontend
- [x] Página `/perfil` con tabs (Información Personal, Contraseña, Preferencias)
- [x] Componente `AvatarUpload` reutilizable
  - [x] Drag & drop de imágenes
  - [x] Validación de formato y tamaño (JPG/PNG/WebP, máx 2MB)
  - [x] Preview en tiempo real
- [x] Integración de avatares reales en:
  - [x] Sidebar y top bar
  - [x] Tabla de usuarios (/usuarios)
  - [x] Portal de proveedores
- [x] Método `updateMyProfile()` con soporte FormData
- [x] Método `changePassword()` seguro
- [x] Configuración de proxy `/media` en Vite

### UX
- [x] Links clickeables a perfil desde layout
- [x] Visualización de logos de empresa/proveedor
- [x] Actualización reactiva del store al cambiar perfil

---

## Fase 10: Notificaciones en Tiempo Real ⏳

**Objetivo**: Sistema de alertas y notificaciones.

### Backend
- [ ] Modelo Notification
- [ ] Django Channels para WebSockets
- [ ] Triggers de notificación por evento
- [ ] Notificaciones por email

### Frontend
- [ ] Icono de campana con contador
- [ ] Dropdown de notificaciones
- [ ] Página de historial de notificaciones
- [ ] Configuración de preferencias

### Eventos a Notificar
- Nueva solicitud creada
- Cotización recibida
- Orden enviada
- Factura subida
- Autorización aprobada/rechazada

---

## Fase 11: Autorizaciones y Firmas Digitales ⏳

**Objetivo**: Flujo de aprobación con múltiples niveles.

### Backend
- [ ] Modelo FlujoAutorizacion
- [ ] Modelo PasoAutorizacion
- [ ] Modelo FirmaDigital
- [ ] Validación de montos por nivel
- [ ] Historial de autorizaciones

### Frontend
- [ ] Configuración de flujos por tipo
- [ ] Bandeja de pendientes por aprobar
- [ ] Firma electrónica
- [ ] Visualización de historial de aprobaciones

---

## Fase 12: Documentos y Adjuntos ⏳

**Objetivo**: Gestión centralizada de documentos.

### Backend
- [ ] Modelo Documento genérico
- [ ] Almacenamiento en S3/MinIO
- [ ] Generación de PDFs (WeasyPrint)
- [ ] Versionado de documentos

### Frontend
- [ ] Visor de documentos integrado
- [ ] Galería de adjuntos por entidad
- [ ] Generación de reportes PDF
- [ ] Preview de facturas XML

---

## Fase 13: Configuración del Sistema ⏳

**Objetivo**: Parámetros configurables por tenant.

### Backend
- [ ] Modelo ConfiguracionSistema
- [ ] Numeración automática personalizable
- [ ] Parámetros de IVA
- [ ] Límites de autorización

### Frontend
- [ ] Página de configuración
- [ ] Gestión de secuencias
- [ ] Personalización de empresa (logo, colores)
- [ ] Configuración de correos

---

## Fase 14: Multi-tenancy Completo 💡

**Objetivo**: Soporte completo para múltiples organizaciones.

### Backend
- [ ] Activación de django-tenants
- [ ] Migración de esquemas
- [ ] Aislamiento de datos
- [ ] Subdominios por tenant

### Frontend
- [ ] Selector de organización
- [ ] Branding por tenant
- [ ] URLs por subdominio

---

## Fase 15: Reportes Avanzados 💡

**Objetivo**: Business Intelligence y exportación.

### Backend
- [ ] Endpoints de reportes complejos
- [ ] Exportación a Excel
- [ ] Exportación a PDF

### Frontend
- [ ] Dashboard de BI
- [ ] Filtros avanzados
- [ ] Gráficos interactivos
- [ ] Programación de reportes

---

## Fase 16: Integraciones 💡

**Objetivo**: Conexión con sistemas externos.

- [ ] API pública documentada
- [ ] Webhooks de eventos
- [ ] Integración SAT (CFDI)
- [ ] Integración contable (CONTPAQi, SAP)
- [ ] Single Sign-On (SSO)

---

## Fase 17: Mobile 💡

**Objetivo**: Aplicación móvil.

- [ ] React Native o PWA
- [ ] Notificaciones push
- [ ] Escaneo de facturas
- [ ] Aprobaciones offline

---

## Prioridades de Desarrollo

### Corto Plazo (Q1 2026)
1. ~~Fase 9: Portal de Proveedores~~ ✅
2. ~~Fase 9.5: Personalización de Perfil~~ ✅
3. Fase 10: Notificaciones
4. Fase 11: Autorizaciones

### Mediano Plazo (Q2 2026)
5. Fase 12: Documentos
6. Fase 13: Configuración
7. Fase 14: Multi-tenancy

### Largo Plazo (Q3-Q4 2026)
7. Fase 15: Reportes Avanzados
8. Fase 16: Integraciones
9. Fase 17: Mobile

---

## Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Tiempo de ciclo de compra | Reducir 40% |
| Errores en órdenes | < 2% |
| Tiempo de aprobación | < 24 horas |
| Satisfacción de usuarios | > 4.5/5 |
| Uptime | 99.9% |

---

## Contribuir al Roadmap

¿Tienes sugerencias para nuevas características? Abre un issue con el label `enhancement` describiendo:

1. Problema que resuelve
2. Solución propuesta
3. Impacto esperado
4. Prioridad sugerida

---

*Última actualización: 24 de enero de 2026*
