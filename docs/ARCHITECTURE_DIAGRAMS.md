# Arquitectura del Sistema — Diagramas

Documento con diagramas de la arquitectura cliente-servidor de Gastos Distribuidos v2.

---

## Tabla de Contenidos

1. [Diagrama C4 Container (Vista de Alto Nivel)](#1-diagrama-c4-container-vista-de-alto-nivel)
2. [Diagrama de Secuencia: Request JWT Autenticado](#2-diagrama-de-secuencia-request-jwt-autenticado)
3. [Diagrama de Flujo: Proceso de Autenticación](#3-diagrama-de-flujo-proceso-de-autenticación)

---

## 1. Diagrama C4 Container (Vista de Alto Nivel)

Vista de contenedores del sistema. Muestra las aplicaciones principales, las bases de datos y los servicios externos.

```mermaid
C4Container
    title Diagrama de Contenedores — Gastos Distribuidos v2

    Person(usuario, "Usuario", "Admin / Tesorería / Adquisiciones / Almacén / Área / Proveedor")

    Container_Boundary(navegador, "🌐 Navegador Web") {
        Container(spa, "Frontend SPA", "React 18 + TypeScript + Vite", "Interfaz de usuario.\nTailwindCSS, Zustand, Axios, React Router")
    }

    Container_Boundary(servidor, "⚙️ Servidor Backend") {
        Container(api, "API REST", "Django 4.2 + DRF + Gunicorn", "Lógica de negocio, autenticación JWT,\nmulti-tenancy, serializadores, ViewSets")

        Container(worker, "Celery Worker", "Python + Celery", "Tareas asíncronas:\n• Generación de PDFs (WeasyPrint)\n• Parseo de CFDI XML 4.0\n• Envío de notificaciones por email")
    }

    ContainerDb(postgres, "PostgreSQL 15+", "django-tenants", "Base de datos multi-tenant.\nEsquema public (tenants, usuarios)\n+ esquema por tenant (datos de negocio)")

    ContainerDb(redis, "Redis", "Broker + Cache", "Cola de tareas Celery\nCaché de sesiones\nResultados de tareas")

    Container(s3, "S3 Storage", "django-storages + boto3", "Archivos estáticos, media,\nXML CFDI, PDFs generados,\navatares, logos, evidencias fotográficas")

    System_Ext(sat, "SAT", "Validación CFDI 4.0", "Verificación de UUID\nde comprobantes fiscales")

    System_Ext(smtp, "Servidor SMTP", "Email transaccional", "Notificaciones,\nalertas de sistema")

    System_Ext(cloudflare, "Cloudflare / CDN", "WAF + CDN + SSL", "Protección DDoS,\ncaché estático,\ncertificados SSL")

    Rel(usuario, spa, "HTTPS", "Navegador web")
    Rel(spa, api, "REST/JSON + JWT", "Endpoints /api/v1/\nBearer <token>")
    Rel(api, postgres, "SQL", "django-tenants routing\npor hostname/schema")
    Rel(api, redis, "Cache + Sesiones", "TTL, datos temporales")
    Rel(api, worker, "Tasks", "vía Redis broker\n.delay() / apply_async()")
    Rel(worker, s3, "Upload/Download", "PDFs, XMLs, imágenes")
    Rel(worker, sat, "SOAP/HTTPS", "Validación UUID CFDI")
    Rel(worker, smtp, "SMTP", "Emails transaccionales")
    Rel(api, s3, "Read/Write", "Archivos subidos por usuarios")
    Rel(cloudflare, spa, "HTTPS", "CDN de assets estáticos")
    Rel(cloudflare, api, "HTTPS", "Proxy inverso a Gunicorn")

    UpdateElementStyle(spa, $bgColor="#e3f2fd", $fontColor="#1565c0")
    UpdateElementStyle(api, $bgColor="#fff3e0", $fontColor="#e65100")
    UpdateElementStyle(worker, $bgColor="#f3e5f5", $fontColor="#7b1fa2")
    UpdateElementStyle(postgres, $bgColor="#e8f5e9", $fontColor="#2e7d32")
    UpdateElementStyle(redis, $bgColor="#fce4ec", $fontColor="#c2185b")
    UpdateElementStyle(s3, $bgColor="#e0f7fa", $fontColor="#00838f")
```

### Descripción de Contenedores

| Contenedor | Tecnología | Propósito |
|-----------|-----------|-----------|
| **Frontend SPA** | React 18 + TypeScript + Vite | Interfaz de usuario. Single Page Application con TailwindCSS para estilos, Zustand para estado global, Axios para HTTP, React Router para navegación. |
| **API REST** | Django 4.2 + DRF + Gunicorn | Backend monolítico modular. 13 apps Django. Maneja autenticación JWT, multi-tenancy (schema-per-tenant), serialización, validación y ORM. |
| **Celery Worker** | Python + Celery + Redis | Procesamiento asíncrono. Genera PDFs con WeasyPrint, parsea XML CFDI 4.0 con lxml, envía emails, crea notificaciones. |
| **PostgreSQL** | 15+ con django-tenants | Base de datos relacional. Esquema `public` (tenants, dominios, usuarios, roles) + un esquema aislado por cada tenant (todas las tablas de negocio). |
| **Redis** | 7.x | Broker de tareas para Celery, caché de sesiones y resultados de tareas. |
| **S3 Storage** | django-storages + boto3 | Almacenamiento de archivos: XML CFDI, PDFs, avatares, logos, membretes, evidencias fotográficas, documentos de proveedor. |

### Servicios Externos

| Servicio | Protocolo | Uso |
|----------|-----------|-----|
| **SAT** | SOAP/HTTPS | Validación de UUID de comprobantes fiscales digitales (CFDI 4.0). |
| **SMTP** | SMTP | Envío de notificaciones transaccionales: nuevas solicitudes, cotizaciones recibidas, órdenes confirmadas, facturas procesadas. |
| **Cloudflare / CDN** | HTTPS | WAF (protección DDoS), CDN de assets estáticos, terminación SSL/TLS. |

---

## 2. Diagrama de Secuencia: Request JWT Autenticado

Flujo completo de una petición autenticada desde el navegador hasta la base de datos y de vuelta.

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Navegador
    participant React
    participant Axios
    participant Nginx
    participant Gunicorn
    participant Django
    participant TenantMiddleware
    participant JWTAuth
    participant ViewSet
    participant ORM
    participant PostgreSQL

    Usuario->>Navegador: Clic en "Ver Órdenes de Compra"
    Navegador->>React: Evento de navegación
    React->>Axios: axios.get('/api/v1/ordenes/')

    Note over Axios: Header: Authorization: Bearer eyJhbG...

    Axios->>Nginx: GET /api/v1/ordenes/ (HTTPS)
    Nginx->>Gunicorn: Proxy HTTP a Unix socket
    Gunicorn->>Django: WSGI request

    Django->>TenantMiddleware: Procesar request
    TenantMiddleware->>TenantMiddleware: Extraer hostname del request
    TenantMiddleware->>PostgreSQL: SELECT schema_name FROM tenants_domain WHERE domain = ?
    PostgreSQL-->>TenantMiddleware: schema_name = 'tenant_001'
    TenantMiddleware->>Django: Activar esquema 'tenant_001'

    Django->>JWTAuth: Autenticar token
    JWTAuth->>JWTAuth: Decodificar JWT (firma + expiración)
    JWTAuth->>PostgreSQL: SELECT user FROM tenant_001.accounts_user WHERE id = payload.sub
    PostgreSQL-->>JWTAuth: User(id=42, role='adquisiciones', area_id=5)
    JWTAuth->>Django: request.user = User(id=42)

    Django->>ViewSet: OrdenCompraViewSet.list(request)
    ViewSet->>ViewSet: get_queryset() → filtrar por permisos de rol
    ViewSet->>ORM: OrdenCompra.objects.filter(estado__in=['enviada', 'confirmada'])
    ORM->>PostgreSQL: SELECT * FROM tenant_001.orders_ordencompra WHERE estado IN (...)
    PostgreSQL-->>ORM: Lista de 15 órdenes
    ORM-->>ViewSet: QuerySet[15]
    ViewSet->>ViewSet: Serializar con OrdenCompraSerializer
    ViewSet-->>Django: Response 200 OK (JSON)
    Django-->>Gunicorn: HTTP 200 + JSON body
    Gunicorn-->>Nginx: HTTP 200
    Nginx-->>Axios: HTTP 200 + JSON

    Note over Axios: Respuesta: { count: 15, results: [...] }

    Axios-->>React: Promise resolved con datos
    React->>React: Actualizar estado Zustand
    React->>Navegador: Re-renderizar tabla de órdenes
    Navegador-->>Usuario: Muestra lista de 15 órdenes de compra
```

### Pasos Clave del Flujo

| Paso | Componente | Acción |
|------|-----------|--------|
| 1-3 | **Cliente** | Usuario interactúa con la SPA. React usa Axios para hacer la petición HTTP. |
| 4-5 | **Proxy** | Nginx recibe HTTPS y proxya a Gunicorn (WSGI). |
| 6-9 | **Multi-tenancy** | `TenantMiddleware` identifica el tenant por hostname, consulta el esquema en PostgreSQL (tabla `public.tenants_domain`), y activa el schema correcto antes de procesar la petición. |
| 10-13 | **Autenticación JWT** | `JWTAuthentication` decodifica el Bearer token, valida firma y expiración, consulta el usuario en el schema del tenant, y lo asigna a `request.user`. |
| 14-18 | **Lógica de Negocio** | El `ViewSet` aplica filtros según el rol del usuario (object-level permissions), consulta el ORM, serializa los resultados y devuelve JSON paginado. |
| 19-23 | **Respuesta** | El JSON viaja de vuelta por la misma cadena: Django → Gunicorn → Nginx → Axios → React → DOM. |

---

## 3. Diagrama de Flujo: Proceso de Autenticación

Flujo completo desde el login del usuario hasta el acceso al dashboard, incluyendo verificación de INE y redirección por rol.

```mermaid
flowchart TD
    Start([👤 Usuario abre app]) --> Login[📝 Pantalla de Login]
    Login -->|Ingresa email + password| Submit{🔐 POST /api/token/}

    Submit -->|Credenciales inválidas| ErrorCred[❌ Error: Credenciales incorrectas]
    ErrorCred --> Login

    Submit -->|Credenciales válidas| Tokens[✅ Generar tokens JWT]
    Tokens --> AccessToken[🔑 Access Token<br/>30-60 minutos]
    Tokens --> RefreshToken[🔄 Refresh Token<br/>7 días]
    Tokens --> Guardar[💾 Guardar tokens en localStorage]
    Guardar --> Decodificar[🔍 Decodificar payload del Access Token]

    Decodificar --> INE{¿INE verificada?}
    INE -->|No| VerifINE[📄 Pantalla: Verificación de INE]
    VerifINE -->|Sube foto INE| SubirINE[📤 POST /api/ine/]
    SubirINE --> EstadoPendiente[⏳ Estado: pendiente_verificacion]
    EstadoPendiente --> Espera[🕐 Esperar aprobación de admin]
    Espera -->|Admin aprueba| INE
    Espera -->|Admin rechaza| INERechazada[❌ INE Rechazada]
    INERechazada -->|Motivo de rechazo| VerifINE

    INE -->|Sí| Rol{¿Rol del usuario?}

    Rol -->|admin| DashAdmin[🏛️ Dashboard Administrador]
    Rol -->|tesoreria| DashTeso[💰 Dashboard Tesorería]
    Rol -->|adquisiciones| DashAdq[📦 Dashboard Adquisiciones]
    Rol -->|almacen| DashAlm[📦 Dashboard Almacén]
    Rol -->|area| DashArea[📋 Dashboard Área Solicitante]
    Rol -->|proveedor| DashProv[🏭 Dashboard Proveedor]

    DashAdmin --> Acceso[🔓 Acceso completo al sistema]
    DashTeso --> Acceso
    DashAdq --> Acceso
    DashAlm --> Acceso
    DashArea --> Acceso
    DashProv --> Acceso

    Acceso --> TokenExp{¿Access Token expirado?}
    TokenExp -->|Sí| Refresh[🔄 POST /api/token/refresh/]
    Refresh -->|Refresh token válido| NuevoAccess[🔑 Nuevo Access Token]
    NuevoAccess --> Acceso
    Refresh -->|Refresh token inválido| Logout[🔒 Cerrar sesión]
    Logout --> Login
    TokenExp -->|No| Acceso

    style Login fill:#e3f2fd,stroke:#1565c0,color:#000
    style Submit fill:#fff3e0,stroke:#e65100,color:#000
    style Tokens fill:#e8f5e9,stroke:#2e7d32,color:#000
    style INE fill:#fce4ec,stroke:#c2185b,color:#000
    style VerifINE fill:#fce4ec,stroke:#c2185b,color:#000
    style Rol fill:#f3e5f5,stroke:#7b1fa2,color:#000
    style DashAdmin fill:#e0f7fa,stroke:#00838f,color:#000
    style DashTeso fill:#e0f7fa,stroke:#00838f,color:#000
    style DashAdq fill:#e0f7fa,stroke:#00838f,color:#000
    style DashAlm fill:#e0f7fa,stroke:#00838f,color:#000
    style DashArea fill:#e0f7fa,stroke:#00838f,color:#000
    style DashProv fill:#e0f7fa,stroke:#00838f,color:#000
    style Acceso fill:#e8f5e9,stroke:#2e7d32,color:#000
    style Logout fill:#ffebee,stroke:#c62828,color:#000
```

### Estados del Flujo de Autenticación

| Estado | Descripción |
|--------|-------------|
| **Login** | Pantalla inicial. Solicita email y contraseña. |
| **Token Generation** | Django valida credenciales contra `User` (email como username). Genera par de tokens: access (corto) + refresh (largo). |
| **INE Verification** | Nuevos usuarios deben subir foto de INE. El admin la aprueba/rechaza. Hasta entonces, el estado de la primera solicitud es `pendiente_verificacion`. |
| **Role-Based Redirect** | Según el rol del usuario (`admin`, `tesoreria`, `adquisiciones`, `almacen`, `area`, `proveedor`), se redirige a un dashboard diferente con permisos y vistas específicas. |
| **Token Refresh** | Cuando el access token expira, el frontend usa el refresh token para obtener uno nuevo sin pedir credenciales de nuevo. Si el refresh token también expira, se cierra sesión. |

### Matriz de Roles y Dashboards

| Rol | Dashboard Principal | Funciones Destacadas |
|-----|---------------------|----------------------|
| **admin** | Panel de administración | Gestión de tenants, usuarios, configuraciones globales, aprobación de INEs. |
| **tesoreria** | Finanzas y pagos | Autorización presupuestal, procesamiento de facturas CFDI, solicitudes de pago, reportes financieros. |
| **adquisiciones** | Compras | Solicitudes de material, cotizaciones, órdenes de compra, autorizaciones. |
| **almacen** | Inventario | Recepción de bienes, salidas de almacén, evidencias fotográficas, control de stock. |
| **area** | Solicitante | Crear solicitudes de material, dar seguimiento a estados, confirmar recepciones. |
| **proveedor** | Portal de proveedor | Recibir invitaciones a cotizar, enviar cotizaciones, confirmar órdenes de compra. |

---

*Documento generado con los skills mermaid-diagrams y diagramming-code. Última actualización: mayo 2026.*
