# 🏢 Gastos Distribuidos v2

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.13+-blue?logo=python" alt="Python">
  <img src="https://img.shields.io/badge/Django-4.2-green?logo=django" alt="Django">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss" alt="TailwindCSS">
</p>

Sistema multi-tenant para gestión de adquisiciones, compras y distribución de gastos empresariales. Permite a organizaciones gestionar todo el ciclo de compras desde la solicitud de materiales hasta la distribución contable de facturas.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Stack Tecnológico](#-stack-tecnológico)
- [Requisitos](#-requisitos)
- [Instalación](#-instalación)
- [Desarrollo Local](#-desarrollo-local)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Roles y Permisos](#-roles-y-permisos)
- [API Endpoints](#-api-endpoints)
- [Documentación](#-documentación)

## ✨ Características

### Gestión de Compras
- **Solicitudes de Material**: Creación y seguimiento de requerimientos por área
- **Catálogo de Productos (COGs)**: Base de datos centralizada de productos y servicios
- **Cotizaciones**: Solicitud y comparación de cotizaciones de proveedores
- **Órdenes de Compra**: Generación y seguimiento de órdenes

### Control Financiero
- **Autorización Presupuestal**: Flujo de aprobación con límites por área
- **Facturas CFDI**: Carga y validación de comprobantes fiscales
- **Distribución de Gastos**: Asignación de costos a centros de costo/áreas

### Inventario
- **Recepción de Materiales**: Control de entregas de proveedores
- **Salidas de Almacén**: Registro de entregas a áreas solicitantes

### Personalización de Usuario
- **Perfiles Personalizables**: Edición de información personal y foto de perfil
- **Avatares**: Subida de fotos de perfil (JPG/PNG/WebP, máx 2MB) con drag & drop
- **Logos Empresariales**: Proveedores y empresas pueden subir sus logos
- **Cambio de Contraseña**: Gestión segura de credenciales
- **Verificación de INE**: Usuarios que crean solicitudes deben registrar y verificar su INE con un administrador
- **Preferencias**: Configuración de notificaciones y tema (próximamente)

### Portal de Proveedores
- **Dashboard Exclusivo**: Panel con estadísticas y acciones rápidas
- **Cotizaciones en Línea**: Respuesta a solicitudes de cotización
- **Confirmación de Órdenes**: Aceptación de órdenes de compra
- **Seguimiento de Facturas**: Estado de pagos y documentos
- **Perfil Empresarial**: Logo y datos de contacto personalizables

### Reportes y Analytics
- **Dashboard Ejecutivo**: KPIs y métricas en tiempo real
- **Gastos por Área**: Análisis de consumo por centro de costo
- **Tendencias Mensuales**: Gráficos comparativos

## 🛠 Stack Tecnológico

### Backend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| Python | 3.13+ | Runtime |
| Django | 4.2.x | Framework web |
| Django REST Framework | 3.15+ | API REST |
| PostgreSQL | 15+ | Base de datos (producción) |
| SQLite | 3 | Base de datos (desarrollo) |
| django-tenants | 3.6+ | Multi-tenancy |
| SimpleJWT | 5.3+ | Autenticación JWT |

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.x | UI Library |
| TypeScript | 5.x | Tipado estático |
| Vite | 5.4+ | Build tool |
| TailwindCSS | 3.4+ | Estilos |
| Zustand | 4.x | State management |
| React Router | 6.x | Routing |
| Recharts | 2.x | Gráficos |
| React Hot Toast | 2.x | Notificaciones |

## 📦 Requisitos

### Desarrollo Local
- Python 3.13+
- Node.js 22+
- npm 10+
- Git

### Producción
- Docker & Docker Compose
- PostgreSQL 15+
- Redis (para Celery)
- Nginx (reverse proxy)

## 🚀 Instalación

### Clonar Repositorio
```bash
git clone https://github.com/tu-usuario/Gastos_Distribuidosv2.git
cd Gastos_Distribuidosv2
```

### Backend
```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno (Windows)
.\venv\Scripts\Activate.ps1

# Activar entorno (Linux/Mac)
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Migraciones (modo desarrollo)
$env:DJANGO_SETTINGS_MODULE="config.settings.development"
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Iniciar servidor
python manage.py runserver 8000
```

### Frontend
```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## 💻 Desarrollo Local

### Configuración Rápida (Windows)
```powershell
# Desde la raíz del proyecto
.\run_all.bat
```

### Configuración Manual

**Terminal 1 - Backend:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
$env:DJANGO_SETTINGS_MODULE="config.settings.development"
python manage.py runserver 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### URLs de Desarrollo
| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api/ |
| Admin Django | http://localhost:8000/admin/ |

### Credenciales por Defecto
```
Email: admin@gastos.local
Password: admin123
```

## 📁 Estructura del Proyecto

```
Gastos_Distribuidosv2/
├── backend/
│   ├── apps/
│   │   ├── accounts/        # Usuarios y autenticación
│   │   ├── areas/           # Áreas/departamentos
│   │   ├── companies/       # Empresas y proveedores
│   │   ├── documents/       # Gestión documental
│   │   ├── inventory/       # Entregas y salidas
│   │   ├── invoices/        # Facturas y distribución
│   │   ├── notifications/   # Sistema de notificaciones
│   │   ├── orders/          # Órdenes de compra
│   │   ├── procurement/     # Solicitudes de material
│   │   ├── quotations/      # Cotizaciones
│   │   ├── reports/         # Reportes y dashboard
│   │   └── tenants/         # Multi-tenancy
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   └── urls.py
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   │   ├── ui/          # Componentes base (Button, Card, etc.)
│   │   │   └── charts/      # Componentes de gráficos
│   │   ├── layouts/         # Layouts de página
│   │   ├── pages/           # Páginas de la aplicación
│   │   │   ├── admin/       # Gestión (usuarios, áreas, proveedores)
│   │   │   ├── auth/        # Login
│   │   │   ├── dashboard/   # Dashboard principal
│   │   │   ├── inventory/   # Entregas y salidas
│   │   │   ├── invoices/    # Facturas
│   │   │   ├── orders/      # Órdenes de compra
│   │   │   ├── procurement/ # Solicitudes
│   │   │   ├── proveedor/   # Portal del proveedor
│   │   │   ├── quotations/  # Cotizaciones
│   │   │   └── reportes/    # Reportes
│   │   ├── services/        # Servicios API
│   │   ├── stores/          # Zustand stores
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                    # Documentación
├── .env                     # Variables de entorno
└── README.md
```

## 👥 Roles y Permisos

| Rol | Descripción | Permisos Principales |
|-----|-------------|---------------------|
| **admin** | Administrador del sistema | Acceso total, gestión de usuarios |
| **tesoreria** | Tesorería/Finanzas | Autorización presupuestal, distribución de gastos |
| **adquisiciones** | Área de compras | Gestión de cotizaciones y órdenes |
| **almacen** | Almacén/Inventario | Recepción y entrega de materiales |
| **area** | Jefe de área | Crear solicitudes, ver su área |
| **proveedor** | Proveedor externo | Portal exclusivo, cotizar, confirmar órdenes |

### Filtrado de Datos por Rol

El sistema filtra automáticamente la información visible según el rol:
- **Admin/Tesorería**: Acceso completo a todos los datos
- **Área**: Solo ve solicitudes de su área
- **Almacén**: Ve órdenes confirmadas para recepción
- **Proveedor**: Solo ve sus propias cotizaciones y órdenes

## 🔌 API Endpoints

### Autenticación
```
POST   /api/auth/token/           # Obtener tokens JWT
POST   /api/auth/token/refresh/   # Refrescar token
POST   /api/auth/register/        # Registro de usuario
```

### Recursos Principales
```
# Usuarios y Áreas
GET    /api/accounts/users/
GET    /api/areas/

# Proveedores
GET    /api/companies/proveedores/

# Catálogo de Productos
GET    /api/procurement/cogs/

# Solicitudes de Material
GET    /api/procurement/solicitudes/
POST   /api/procurement/solicitudes/

# Cotizaciones
GET    /api/quotations/cotizaciones/
POST   /api/quotations/cotizaciones/{id}/select/

# Órdenes de Compra
GET    /api/orders/
POST   /api/orders/{id}/send/
POST   /api/orders/{id}/confirm/

# Facturas
GET    /api/invoices/facturas/
POST   /api/invoices/facturas/{id}/distribute/

# Dashboard y Reportes
GET    /api/reports/dashboard/stats/
GET    /api/reports/proveedor/dashboard/
```

## 📚 Documentación

- [CHANGELOG.md](./CHANGELOG.md) - Historial de cambios
- [ROADMAP.md](./ROADMAP.md) - Plan de desarrollo
- [API.md](./docs/API.md) - Documentación de la API
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Guía de despliegue

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es software propietario. Todos los derechos reservados.

---

<p align="center">
  Desarrollado con ❤️ para la gestión eficiente de adquisiciones
</p>
