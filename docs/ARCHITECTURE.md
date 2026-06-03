# 🏗️ Arquitectura del Sistema — Gastos Distribuidos v2

> **Descripción:** Sistema de gestión de adquisiciones y gastos empresariales con arquitectura modular, escalable y segura

## 📋 Tabla de Contenidos

| Sección | Descripción |
|---------|-------------|
| [Visión General](#visión-general) | Principios y stack tecnológico |
| [Arquitectura de Alto Nivel](#arquitectura-de-alto-nivel) | Diagrama general del sistema |
| [Backend](#backend) | Estructura, modelos y convenciones |
| [Frontend](#frontend) | Estructura, componentes y servicios |
| [Base de Datos](#base-de-datos) | Esquema ER y relaciones |
| [Estados y Transiciones](#estados-y-transiciones) | Máquina de estados de entidades |
| [Autenticación y Autorización](#autenticación-y-autorización) | Flujo JWT y matriz de permisos |
| [Flujos de Negocio](#flujos-de-negocio) | Procesos de compra y cotización |
| [Patrones de Diseño](#patrones-de-diseño) | Patrones utilizados |
| [Seguridad](#seguridad) | Medidas de protección |
| [Decisiones Arquitectónicas](#decisiones-arquitectónicas) | ADRs (Architecture Decision Records) |

---

## Visión General

### ¿Qué es Gastos Distribuidos v2?

Sistema integral para la **gestión centralizada de compras, cotizaciones, órdenes y pagos** en empresas. Permite a múltiples áreas solicitar materiales, a proveedores cotizar, y a tesorería gestionar pagos, todo en una sola plataforma.

**Stack tecnológico de alto nivel:**
-  **Backend:** Django 4.2 + DRF (API RESTful)
-  **Frontend:** React 18 + TypeScript + TailwindCSS  
-  **BD:** PostgreSQL (prod) / SQLite (dev)
-  **Async:** Celery + Redis
-  **Auth:** JWT (tokens de corta duración)

###  Principios Arquitectónicos

| Principio | Descripción |
|:----------|:-----------|
| **Separación de Responsabilidades** | Cada módulo tiene ONE responsabilidad clara |
| **API First** | Backend expone API RESTful, frontend es cliente puro |
| **Stateless** | Autenticación vía JWT, sin sesiones en servidor |
| **Domain-Driven** | Organización por dominios de negocio (solicitudes, cotizaciones, etc.) |
| **Type Safety** | TypeScript en frontend, type hints en backend |

---

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    React + TypeScript                     │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │  │
│  │  │  Pages  │ │Components│ │ Services│ │   State Mgmt    │ │  │
│  │  │         │ │   UI    │ │  (API)  │ │    (Zustand)    │ │  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘ │  │
│  └───────┼──────────┼───────────┼────────────────┼──────────┘  │
└──────────┼──────────┼───────────┼────────────────┼─────────────┘
           │          │           │                │
           └──────────┴───────────┼────────────────┘
                                  │ HTTPS/REST
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Nginx)                        │
│              Rate Limiting · SSL · Load Balancing               │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                          BACKEND                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Django REST Framework                   │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │  │
│  │  │  Views  │ │Serializer│ │ Models │ │    Services     │ │  │
│  │  │  (API)  │ │(Validate)│ │  (ORM) │ │ (Business Logic)│ │  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘ │  │
│  └───────┼──────────┼───────────┼────────────────┼──────────┘  │
└──────────┼──────────┼───────────┼────────────────┼─────────────┘
           │          │           │                │
           └──────────┴───────────┼────────────────┘
                                  │
           ┌──────────────────────┼──────────────────────┐
           │                      │                      │
           ▼                      ▼                      ▼
    ┌────────────┐        ┌────────────┐         ┌────────────┐
    │ PostgreSQL │        │   Redis    │         │   Celery   │
    │  (Primary) │        │  (Cache)   │         │  (Tasks)   │
    └────────────┘        └────────────┘         └────────────┘
```

---

## Backend

### ⚙️ Stack Tecnológico

| Componente | Tecnología | Propósito |
|:-----------|:-----------|:-----------|
| **Framework** | Django 4.2 | Base del servidor web |
| **API** | Django REST Framework | Generación automática de API REST |
| **Auth** | Simple JWT | Tokens seguros sin sesión en servidor |
| **ORM** | Django ORM | Consultas de BD abstrayendo SQL |
| **Queue** | Celery + Redis | Procesos asíncronos (email, reportes) |
| **Cache** | Redis | Sesiones y caché de consultas |

### 📁 Estructura de Aplicaciones

La aplicación backend está organizada en **módulos temáticos** (Domain-Driven Design):

```
backend/apps/
├──  accounts/          ← Autenticación, usuarios y roles
├──  areas/             ← Áreas organizacionales y centros de costo
├──  companies/         ← Empresas/tenants
├──  documents/         ← Gestión de PDFs y documentos
├──  inventory/         ← Movimientos y recepción de materiales
├──  invoices/          ← Facturas y pagos
├──  notifications/     ← Notificaciones (email, webhooks)
├──  orders/            ← Órdenes de compra
├──  procurement/       ← Solicitudes de compra
├──  quotations/        ← Cotizaciones de proveedores
├──  reports/           ← Dashboards y reportes
└──  tenants/           ← Multi-tenancy (producción)
```

**Estructura interna de cada módulo:**
```python
app/
├── models.py          # Modelos de datos (Solicitud, Orden, etc.)
├── serializers.py     # Validación y transformación de datos
├── views.py           # ViewSets con la lógica de API
├── permissions.py     # Permisos por rol
├── urls.py            # Rutas específicas del módulo
├── services.py        # Lógica de negocio reutilizable
├── tasks.py           # Tareas Celery asíncronas
└── migrations/        # Historial de cambios de BD
```

### 🏗️ Arquitectura en Capas

```
┌──────────────────────────────────④──────────────────────────────┐
│  API Layer (Views/ViewSets) ← HTTP Requests/Responses           │
├──────────────────────────────────────────────────────────────────┤
│  Serializer Layer ← Validación, transformación, paginación      │
├──────────────────────────────────────────────────────────────────┤
│  Service Layer ← Lógica de negocio, reglas, transacciones       │
├──────────────────────────────────────────────────────────────────┤
│  Model Layer (ORM) ← Acceso a datos, queries                    │
├──────────────────────────────────────────────────────────────────┤
│  Database ← PostgreSQL (prod) / SQLite (dev)                    │
└──────────────────────────────────────────────────────────────────┘
```

>  **Flujo de request típico:**
> 1. Cliente hace POST a `/api/solicitudes/`
> 2. **ViewSet** recibe, valida permisos
> 3. **Serializer** valida datos
> 4. **Service** ejecuta lógica de negocio
> 5. **Model** guarda en BD
> 6. **Serializer** serializa respuesta

---

## Frontend

### 🎨 Stack Tecnológico

| Componente | Tecnología | Propósito | Versión |
|:-----------|:-----------|:----------|:---------|
| **Framework** | React | UI reactiva y componentes | 18+ |
| **Lenguaje** | TypeScript | Type safety en frontend | 5+ |
| **Build** | Vite | Bundler ultra-rápido | 5+ |
| **Styling** | TailwindCSS | CSS utilitario | 3+ |
| **Estado** | Zustand | Almacén global minimalista | - |
| **HTTP** | Axios | Cliente para API | - |
| **Iconos** | Heroicons | SVG icons premium | - |

### 📂 Estructura del Frontend

```
frontend/src/
├── 🧩 components/        # Componentes reutilizables
│   ├── ui/              # Componentes base (Button, Card, Input...)
│   ├── forms/           # FormulariosSolicitud, FormularioOrden...
│   ├── tables/          # TablasGenéricas con sort, filter
│   └── common/          # Navbar, Sidebar, Header
│
├── 📄 pages/            # Páginas/rutas principales
│   ├── auth/            # Login, Register
│   ├── dashboard/       # Dashboard general
│   ├── procurement/     # Solicitudes de compra
│   ├── quotations/      # Cotizaciones
│   ├── orders/          # Órdenes de compra
│   ├── invoices/        # Facturas y pagos
│   └── admin/           # Panels administrativos
│
├── 🏷️ layouts/          # Layouts principales
│   ├── AuthLayout.tsx   # Para login/registro
│   └── MainLayout.tsx   # Para app protegida
│
├── 🔌 services/         # Servicios API
│   ├── api.ts           # Cliente Axios configurado
│   ├── authService.ts   # Login, logout, refresh
│   ├── solicitudesService.ts
│   ├── ordenesService.ts
│   └── ...
│
├── 📦 stores/           # Estado global (Zustand)
│   └── authStore.ts     # Usuario actual y tokens
│
├── 📋 types/            # Interfaces TypeScript
│   ├── auth.ts          # User, LoginRequest
│   ├── solicitud.ts     # Solicitud, SolicitudItem
│   └── ...
│
├── 🪝 hooks/            # Custom hooks
│   ├── useAuth.ts       # Auth context helper
│   └── useFetch.ts      # Fetch genérico
│
└── 🛠️ utils/            # Utilidades
    ├── formatters.ts    # formatCurrency, formatDate
    ├── validators.ts    # validarEmail, validarRFC
    └── constants.ts     # URLs, valores enumerados
```

### 🧩 Jerarquía de Componentes (Ejemplo)

```
App.tsx (Router)
├── <AuthLayout>
│   ├── <LoginPage>
│   └── <RegisterPage>
│
└── <MainLayout> (Protected)
    ├── <Sidebar>
    │   └── Navigation links
    │
    ├── <Header>
    │   └── <UserMenu>
    │
    └── <ContentArea>
        ├── <SolicitudesListPage>
        │   ├── <SearchBar>
        │   ├── <FilterPanel>
        │   └── <Table>
        │       └── <TableRow>
        │
        └── <SolicitudDetailPage>
            ├── <FormularioSolicitud>
            │   ├── <TextInput>
            │   ├── <SelectArea>
            │   └── <LineItemsTable>
            │
            └── <TimelineEstados>
```

> ✨ **Patrón clave:** Todos los datos fluyen desde un **único store (authStore)**, evitando prop drilling

---

## Base de Datos

### 📊 Diagrama ER Completo

```
┌─────────────────────────────────────────────────────┐
│               ENTIDADES PRINCIPALES                 │
└─────────────────────────────────────────────────────┘

┌──────────────┐       ┌──────────────┐
│    USER      │◄─────►│   PROFILE    │
│  - email     │       │  - avatar    │
│  - password  │       │  - role      │
└──────┬───────┘       └──────────────┘
       │
       │  1:N
       ├─────────────────────────┬──────────────────────┐
       │                         │                      │
       ▼                         ▼                      ▼
   ┌────────────┐          ┌──────────┐          ┌─────────┐
   │   AREA     │          │PROVEEDOR │          │COMPAÑÍA │
   │ - nombre   │          │ - nombre │          │ - RFC   │
   └────────────┘          └──────────┘          └─────────┘
       │                         ▲
       │ 1:N                     │1:N
       │                         │
       ▼                   ┌─────┴──────────┐
   ┌─────────────────┐   │ SOLICITUD      │
   │ SOLICITUD       │   │ - número       │
   │ - número        │   │ - estado       │◄────┐
   │ - solicitante   │   │ - solicitador  │     │ 1:N
   │ - estado        │   │ - proveedor    │     │
   │ - total         │   └─────┬──────────┘ ┌────┴─────────────┐
   └────────┬────────┘         │            │                  │
            │ 1:N              │            ▼                  ▼
            │                  ▼        ┌────────────┐   ┌────────────┐
            └────────┬     ┌─────────┐  │COTIZACION  │   │SOLICITUD   │
                     │     │SOLICITUD│  │ - número   │   │DETALLES    │
                     ▼     │DETALLES │  │ - estado   │   │ - cantidad │
                ┌────────┐ └─────────┘  │ - total    │   │ - precio   │
                │ ORDEN  │              └─────┬──────┘   └────────────┘
                │ COMPRA │                    │ 1:N
                │ número │              ┌─────────────────┐
                │ estado │              │COTIZACION       │
                └───┬────┘              │DETALLES         │
                    │ 1:N               │ - cantidad      │
           ┌────────┴────────┐          │ - precio        │
           │                 │          └─────────────────┘
           ▼                 ▼
        ┌────────┐      ┌──────────┐
        │RECEPCION     │ FACTURA  │
        │ - cantidad   │ - número │
        │ - fecha      │ - monto  │
        └────────┘     │ - estado │
                       └──┬───────┘
                          │ 1:1
                          ▼
                       ┌──────────┐
                       │   PAGO   │
                       │ - monto  │
                       │ - método │
                       └──────────┘
```

### 🏷️ Estados y Transiciones

**Máquina de estados completa del sistema:**

#### Solicitud Material
```
BORRADOR
   │
   ▼
ENVIADO ──────┐
   │          │
   ▼          ▼
EN_COTIZACION ◄─────┐
   │                │
   ├──RECHAZADA     │
   │ (cancela)      │
   │                │
   ▼                │
COTIZADO           │
   │               │
   ▼               │
EN_AUTORIZACION    │
   │               │
   ├──RECHAZADA ───┘
   │ (vuelve a enviar)
   │
   ▼
AUTORIZADO
   │
   ▼
EN_ORDEN
   │
   ├──PARCIAL (recepción parcial)
   │  │
   │  ▼ (más recepciones)
   │  PARCIAL
   │  │
   │  └──────┐
   │         │
   └─────────┤
             ▼
          ENTREGADO ──────► PAGADA (final)
```

| Estado | Significado | Quién actúa |
|:-------|:-----------|:-----------|
| **BORRADOR** | Creada pero no enviada | Área |
| **ENVIADO** | Enviada a adquisiciones | Admin verifica |
| **EN_COTIZACION** | Buscando precios | Proveedores cotizan |
| **COTIZADO** | Cotizaciones recibidas | Adquisiciones elige |
| **EN_AUTORIZACION** | Esperando aprobación | Gerencia/Tesorería |
| **AUTORIZADO** | Aprobada, lista para comprar | Adquisiciones crea orden |
| **EN_ORDEN** | Orden de compra emitida | Proveedor confirma |
| **PARCIAL** | Recibido parcialmente | Almacén recibe más |
| **ENTREGADO** | Todo recibido | Tesorería paga |

---

## Autenticación y Autorización

### 🔐 Flujo JWT (JSON Web Tokens)

JWT es un estándar para **autenticación SIN sesiones en servidor**:

```
PASO 1: LOGIN
┌─────────────┐                              ┌──────────────┐
│   Cliente   │                              │   Backend    │
└──────┬──────┘                              └──────┬───────┘
       │  POST /api/auth/login/              │
       │  {email, password}                  │
       ├─────────────────────────────────────>│
       │                                      │ ✓ Valida credenciales
       │  200 OK                             │ ✓ Genera tokens
       │  {                                  │
       │    access: "eye...JV" (15 min),    │
       │    refresh: "eye...AB" (7 días),   │
       │    user: {id, name, role}          │
       │  }                                  │
       │<─────────────────────────────────────┤
       │ ✓ Guarda en LocalStorage             │
       │

PASO 2: USAR API
       │  GET /api/solicitudes/              │
       │  Headers: {                         │
       │    Authorization:Bearer eye..JV    │
       │  }                                  │
       ├─────────────────────────────────────>│
       │                                      │ ✓ Verifica firma token
       │  200 OK                             │
       │  {data: [...]}                      │
       │<─────────────────────────────────────┤
       │

PASO 3: REFRESH (token expirado)
       │  POST /api/auth/refresh/            │
       │  {refresh: eye...AB}                │
       ├─────────────────────────────────────>│
       │                                      │ ✓ Valida refresh
       │  200 OK                             │ ✓ Nuevo access
       │  {access: "eye...NEW"}              │
       │<─────────────────────────────────────┤
       │
```

> 📌 **Ventajas JWT:**
> - Sin estado en servidor (escalable)
> - Token contiene info del usuario
> - CORS-friendly
> - Mobile-friendly

### 👥 Roles y Permisos

**6 roles fijos en el sistema:**

| Rol | Descripción | Permisos Clave |
|:---:|:-----------|:--------|
| 🔑 **admin** | Administrador | Todo (crear usuarios, roles, ver todo) |
| 💰 **tesoreria** | Tesorería | Facturas, pagos, dashboards financieros |
| 🛒 **adquisiciones** | Compras | Crear/editar solicitudes y órdenes |
| 📦 **almacen** | Almacén | Recepciones, movimientos de inventario |
| 👔 **area** | Departamento | Crear solicitudes propias, ver sus órdenes |
| 🏢 **proveedor** | Proveedor | Cotizar, ver sus órdenes |

### 🗳️ Matriz de Permisos

| Recurso | admin | tesoreria | adquisiciones | almacen | area | proveedor |
|:-------:|:-----:|:---------:|:-------------:|:-------:|:----:|:---------:|
| **Usuarios** | ✅ CUD | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Áreas** | ✅ CUD | ✅ R | ✅ R | ❌ | ✅ R | ❌ |
| **Proveedores** | ✅ CUD | ✅ R | ✅ CUD | ❌ | ✅ R | ✅ R* |
| **Solicitudes** | ✅ CUD | ✅ R | ✅ CUD | ❌ | ✅ CR | ❌ |
| **Cotizaciones** | ✅ CUD | ✅ R | ✅ CUD | ❌ | ✅ R | ✅ CRU* |
| **Órdenes** | ✅ CUD | ✅ R | ✅ CUD | ❌ | ✅ R | ✅ R |
| **Recepciones** | ✅ CUD | ❌ | ✅ RU | ✅ CUD | ✅ R | ❌ |
| **Facturas** | ✅ CUD | ✅ CUD | ✅ R | ❌ | ✅ R | ✅ CR |
| **Pagos** | ✅ CUD | ✅ CUD | ✅ R | ❌ | ❌ | ❌ |

**Leyenda:** ✅ = Permitido | ❌ = Denegado | C = Crear | R = Leer | U = Actualizar | D = Borrar | * = Solo sus datos

---

## Flujos de Negocio

### 📊 Flujo Completo de Compra (Tradicional)

```
ACTOR: ÁREA                    ACTOR: ADQUISICIONES           ACTOR: PROVEEDOR
   │                                  │                             │
   │ 1. Crear Solicitud               │                             │
   ├─────────────────────────────────>│                             │
   │ (descripción, cantidad, etc)     │                             │
   │                                  │                             │
   │                                  │ 2. Enviar a cotizar         │
   │                                  ├─────────────────────────────>│
   │                                  │ (por email/plataforma)      │
   │                                  │                             │
   │                                  │ 3. Respuesta con precio     │
   │                                  │<─────────────────────────────┤
   │                                  │                             │
   │                                  │ 4. Comparar cotizaciones    │
   │                                  │ 5. Seleccionar ganador      │
   │                                  │ 6. Crear Orden de Compra    │
   │                                  ├─────────────────────────────>│
   │                                  │ (confirmación)              │
   │                                  │                             │
   │ ◄ Actualización: En Orden        │                             │
   │                                  │ 7. Enviar mercancía         │
   │                                  │<─────────────────────────────┤
   │                                  │                             │
   │ 8. Recibir mercancía             │                             │
   │ (Almacén verifica)               │                             │
   │                                  │                             │
   │ 9. Crear Factura                 │                             │
   │ 10. Procesar Pago                │                             │
   │                                  │                             │
   │ 11. COMPLETADO ✓                 │                             │
   │
```

### ⚡ Flujo Rápido: Auto-Cotización (NUEVO)

**Ventaja:** Sin enviar emails, cotizaciones automáticas desde catálogos de proveedores.

```
ACTOR: ÁREA              ACTOR: ADQUISICIONES         ACTOR: SISTEMA
   │                            │                          │
   │ 1. Crear Solicitud         │                          │
   ├───────────────────────────>│                          │
   │                            │                          │
   │                            │ 2. Click: "Buscar en     │
   │                            │    Catálogos"           │
   │                            ├─────────────────────────>│
   │                            │                          │ 3. Buscar en BD:
   │                            │                          │ • COG.csv
   │                            │                          │ • Catálogos proveedores
   │                            │                          │ • Matching automático
   │                            │                          │
   │                            │ 4. CREAR COTIZACIONES   │
   │                            │    AUTOMÁTICAS          │
   │                            │<─────────────────────────┤
   │                            │ (lado a lado)            │
   │                            │                          │
   │                            │ 5. Comparar precios      │
   │                            │ 6. Seleccionar ganador   │
   │                            │ 7. Crear Orden           │
   │                            │                          │
   │◄ Estado: EN ORDEN         │                          │
   │                            │                          │
   └─────────MISMO FLUJO DESDE AQUÍ───────────────────┘
```

**Beneficios:**
- ✅ Más rápido: No esperar respuestas por email
- ✅ Mejor complejidad: Todos los precios en un lugar
- ✅ Vista comparativa: Elegir mejor opción fácilmente
- ✅ Automatizado: Menos intervención manual

---

## Patrones de Diseño

### 🔙 Backend — Patrones

| Patrón | Propósito | Ejemplo |
|:------:|:---------|:--------|
| **MVC** | Estructura de capas | Views → Serializers → Models |
| **Repository** | Abstracción de datos | Django ORM como repositorio |
| **Service Layer** | Lógica de negocio | `SolicitudService.crear_solicitud()` |
| **DTO/Serializer** | Transformación datos | Validar y convertir JSON ↔ modelos |
| **Permission Classes** | Permisos granulares | `IsAdmin`, `IsTesoreria`, etc. |

**Código de ejemplo — Service Layer:**
```python
class SolicitudService:
    @staticmethod
    def crear_solicitud(user, data):
        """Validación + Lógica de negocio"""
        
        # ✓ Validaciones de negocio
        if not user.area:
            raise ValidationError("Usuario sin área")
        
        # ✓ Crear modelo
        solicitud = Solicitud.objects.create(
            solicitante=user,
            area=user.area,
            **data
        )
        
        # ✓ Efectos secundarios
        NotificationService.notify_adquisiciones(solicitud)
        AuditLog.create(user, f"Creó solicitud {solicitud.numero}")
        
        return solicitud
```

### 🎨 Frontend — Patrones

| Patrón | Propósito | Ejemplo |
|:------:|:---------|:--------|
| **Container/Smart** | Lógica de datos | `SolicitudesListContainer` |
| **Presenter/Dumb** | Solo UI | `SolicitudListItem` |
| **Custom Hooks** | Lógica reutilizable | `useSolicitudes`, `useAuth` |
| **Compound Components** | Composición flexible | `<Modal.Header>`, `<Modal.Body>` |
| **State Management** | Estado global | Zustand `authStore` |

**Código de ejemplo — Custom Hook:**
```typescript
export const useSolicitudes = (filters: Filters) => {
  const [data, setData] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      try {
        const result = await solicitudesService.list(filters);
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    cargar();
  }, [filters]);

  return { data, loading, error };
};
```

---

## Seguridad

### 🔐 Medidas Implementadas

#### 1️⃣ Autenticación
- ✅ JWT con tokens de **corta duración** (15 min access, 7 días refresh)
- ✅ Password hasheada con **PBKDF2** (Django default)
- ✅ Logout invalida tokens en cliente
- ✅ 2FA opcional (extensible)

#### 2️⃣ Autorización
- ✅ **RBAC** (Role-Based Access Control): 6 roles fijos
- ✅ **ABAC** (Attribute-Based): Verificación por usuario/área
- ✅ ViewSet `get_queryset()` filtra por rol automáticamente
- ✅ Permission classes en cada acción

**Ejemplo:**
```python
class SolicitudViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        
        if user.is_admin:
            return Solicitud.objects.all()
        elif user.is_area:
            # Solo solicitudes propias
            return Solicitud.objects.filter(
                Q(solicitante=user) | Q(area__manager=user)
            )
        else:
            return Solicitud.objects.none()
```

#### 3️⃣ Protección de API
- ✅ **Rate Limiting** (Nginx: 100 req/min por IP)
- ✅ **CORS**: Solo `http://localhost:3000` (dev)
- ✅ **CSRF**: Protección en Django admin
- ✅ **Input Validation**: Serializers validan todo

#### 4️⃣ Seguridad en Tránsito
- ✅ **HTTPS obligatorio** (prod)
- ✅ **TLS 1.3+** en certificados
- ✅ Headers de seguridad:
  ```
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Content-Security-Policy: default-src 'self'
  ```

#### 5️⃣ Logs y Auditoría
- ✅ Registro de todas las operaciones CRUD
- ✅ Rastro de quién cambió qué y cuándo
- ✅ Logs estructurados en JSON (prod)
- ✅ Alertas para operaciones sensibles

> ⚠️ **Checklist de seguridad en desarrollo:**
> - [ ] Nunca commitear secretos (tokens, API keys)
> - [ ] Usar `.env` para variables sensibles
> - [ ] Validar ALL inputs (frontend + backend)
> - [ ] Testar permisos en cada endpoint
> - [ ] Usar HTTPS siempre en producción

---

## Decisiones Arquitectónicas (ADRs)

> **ADR** = Architecture Decision Record: decisiones importantes documentadas con contexto y razones.

### ADR-001: Monolito Modular vs Microservicios

| Aspecto | Decisión |
|:-------:|:--------|
| **Opción elegida** | 🏠 Monolito Modular |
| **Razón** | Equipo pequeño, desarrollo rápido, operación simple |
| **Implicación** | Todo en un repo, pero desacoplado por módulos |
| **Revisión cuando** | Si escala a 100+ usuarios simultáneos |

### ADR-002: REST vs GraphQL

| Aspecto | Decisión |
|:-------:|:--------|
| **Opción elegida** | REST |
| **Razón** | Suficiente para casos de uso, mejor caching, simpler |
| **Implicación** | API previsible con verbos HTTP estándar |
| **Nota** | GraphQL viable si hay múltiples clientes muy diferentes |

### ADR-003: SPA (React) vs SSR

| Aspecto | Decisión |
|:-------:|:--------|
| **Opción elegida** | SPA React (Client-side rendering) |
| **Razón** | Mejor UX, offline capability, separación clara |
| **Implicación** | Backend = API pura, Frontend = app independiente |
| **Trade-off** | SEO no es crítico (app no pública) |

### ADR-004: Zustand vs Redux vs Context API

| Aspecto | Decisión |
|:-------:|:--------|
| **Opción elegida** | Zustand |
| **Razón** | Simple, menos boilerplate, TypeScript-first |
| **Implicación** | Store único centralizado: `authStore` |
| **Arquitectura** | Props para datos locales, Zustand solo para global |

### ADR-005: PostgreSQL vs NoSQL

| Aspecto | Decisión |
|:-------:|:--------|
| **Opción elegida** | PostgreSQL (RDBMS) |
| **Razón** | Datos altamente relacionales, ACID importa en finanzas |
| **Implicación** | Esquema versionado en migraciones |
| **Nota** | SQLite en dev para facilitar setup |

### ADR-006: Multi-tenancy (Tenants)

| Aspecto | Decisión |
|:-------:|:--------|
| **Opción elegida** | Soportado pero NO obligatorio |
| **Razón** | Futuro escalable sin refactor mayor |
| **En dev** | Desactivado (sqlite + settings/development.py) |
| **En prod** | Habilitado (PostgreSQL + django-tenants) |

> 💡 **Cómo leer una ADR:**
> Si necesitas cambiar algo arquitectónico (migrar a GraphQL, cambiar BD, etc.),
> documenta tu decisión como un ADR. Esto ayuda a futuros miembros del equipo.

---

## 🚀 Quick Reference — Cheat Sheet

### Crear un Nuevo Endpoint CRUD

**Backend (Django):**
1. Modelo en `apps/module/models.py`
2. Serializer en `apps/module/serializers.py`
3. ViewSet en `apps/module/views.py`
4. Router en `apps/module/urls.py`
5. Include en `config/urls_local.py`

**Frontend (React):**
1. Service en `src/services/moduleService.ts`
2. Página en `src/pages/module/ModuleListPage.tsx`
3. Componente en `src/components/forms/ModuleForm.tsx`
4. Ruta en `App.tsx`

### Estructura de Request/Response

```typescript
// REQUEST a /api/solicitudes/
POST /api/solicitudes/
{
  "descripcion": "Papelería",
  "cantidad": 100,
  "area_id": 1,
  "detalles": [
    {"item": "Papel A4", "cantidad": 10, "precio_unitario": 50}
  ]
}

// RESPONSE (201 Created)
{
  "id": 42,
  "numero": "SOL-2026-00042",
  "descripcion": "Papelería",
  "estado": "BORRADOR",
  "solicitante": { "id": 1, "nombre": "Juan" },
  "created_at": "2026-04-13T10:30:00Z",
  ...
}
```

### Flujo Típico de Error

```
API Request
    ↓
❌ ValidationError (serializer)
    ↓
400 Bad Request
{
  "field_name": ["Mensaje de error"]
}
    ↓
Frontend captura
    ↓
toast.error("Mensaje de error")
```

### Filtros Comunes

```
# Backend: filtrar por rol
GET /api/solicitudes/ (admin ve todo)
GET /api/solicitudes/ (area ve las suyas)

# Frontend: filtro por query params
GET /api/solicitudes/?area=1&estado=ENVIADO&page=1
```

### Ciclo de Desarrollo

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
python manage.py runserver

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Celery (si necesitas async)
cd backend
celery -A config worker -l info
```

---

## 📚 Recursos y Referencias

| Recurso | URL/Ubicación | Propósito |
|:-------:|:-------------|:---------|
| **Docs de proyecto** | `/docs/` | Documentación local |
| **API Docs (Swagger)** | `http://localhost:8000/api/schema/` | Explorar endpoints |
| **Convenciones** | `copilot-instructions.md` | Reglas de código |
| **Django DRF** | https://www.django-rest-framework.org/ | Referencia oficial |
| **React Docs** | https://react.dev | JavaScript moderno |
| **Tailwind CSS** | https://tailwindcss.com | Estilos utilitarios |
| **TypeScript** | https://www.typescriptlang.org | Type safety |

---

## 🎯 Resumen Visual

```
                    USUARIOS (6 roles fijos)
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
          Frontend      Backend      Base de Datos
        (React 18)    (Django 4.2)   (PostgreSQL)
           │                │             │
        Zustand         ViewSets       ORM Models
          Auth             API         Relations
      + Services       + Serializers   + Migrations
                       + Services

                    FLUJO DE DATOS
    Usuario login → JWT Token → API Requests
                 → Store (Zustand) → Componentes
                 → Renderizado (React)

             MÁQUINA DE ESTADOS
    Solicitud: BORRADOR → ENVIADO → ... → PAGADA
    (Estado gestionado por backend, solo backend puede cambiar)
```

---

*Última actualización: 13 de abril de 2026*  
