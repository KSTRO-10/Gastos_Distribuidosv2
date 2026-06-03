# AGENTS.md — Gastos Distribuidos v2

Multi-tenant procurement & expense distribution system. Django 4.2 + React 18/TypeScript.

## Quick Start (Windows)

From repo root:
```powershell
# Backend + Frontend in separate windows
.\run_all.bat

# Or individually
backend\run_server.bat      # Django on :8000, uses config.settings.local
frontend\run_frontend.bat   # Vite dev server
```

Backend virtual env must exist at `backend\venv\` and requirements installed (`backend\requirements\local.txt` or `development.txt`).

## Backend — Critical Context

### Settings modules (do not guess)
| File | Settings module | DB | Tenants |
|------|-----------------|----|----|
| `run_server.bat` | `config.settings.local` | SQLite | **Disabled** |
| README example | `config.settings.development` | SQLite | **Disabled** |
| Production | `config.settings.base` / `production` | PostgreSQL | Enabled (django-tenants) |

**Local dev never uses django-tenants.** Both `local.py` and `development.py` define their own `INSTALLED_APPS` and omit the tenant middleware/router.

### URL routing
- Local dev: `config.urls_local` — flat include of all app routers under `/api/`
- Production: `config.urls` (tenant) + `config.urls_public` (public schema)

### Add a new CRUD endpoint
1. `ModelViewSet` in `apps/{app}/views.py`
2. Dual serializers: Read (with `*_name` / `*_display`) + Create (nested writable `detalles`)
3. `get_queryset()` filters by role; `perform_create()` sets `created_by`
4. Register in `apps/{app}/urls.py`, then include in `config/urls_local.py`
5. Permissions from `apps/accounts/permissions.py`; **admin is implicitly allowed in all except `IsProveedor`**

### Celery
- Dev: `CELERY_TASK_ALWAYS_EAGER = True` (synchronous)
- Prod: Redis broker; tasks use `@shared_task(bind=True, max_retries=3)` with exponential retry
- Views fallback: `try: task.delay() except: task()`

### Models
- Header-detail: details use `related_name='detalles'` + `on_delete=CASCADE`
- Auto-numbered in `save()`: format `PREFIX-{year}-{00001}` (e.g. `SOL-2026-00042`)
- Create serializers do **delete-all + recreate** for child lines (not upsert)

### Testing
- Only one test file exists: `apps/areas/tests.py`
- `pytest` + `pytest-django` listed in `requirements/development.txt` but no `pytest.ini` or config found

## Frontend — Critical Context

### Ports (easy to confuse)
- `vite.config.ts` sets `server.port: 3000`
- `run_frontend.bat` prints `http://localhost:5173`
- Vite proxy forwards `/api` and `/media` to `localhost:8000`

### Path alias
- `@/` maps to `src/`

### Conventions
- **State**: single Zustand store `useAuthStore` in `stores/authStore.ts`
- **Services**: object literal exports in `services/xxxService.ts` with inline interfaces; use `extractData<T>` for DRF paginated responses
- **UI imports**: barrel `components/ui` (Button, Table, Modal, etc.)
- **Icons**: only `@heroicons/react/24/outline`
- **Styling**: `clsx` composition; no CSS modules
- **Forms**: `react-hook-form` with `useForm<T>()`
- **Toasts**: `react-hot-toast` (`toast.success` / `toast.error`)
- **Currency**: `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`
- **Errors**: `error.response?.data?.detail || 'Mensaje fallback'`

## Architecture

### Apps (backend)
`accounts`, `areas`, `budget`, `companies`, `documents`, `inventory`, `invoices`, `notifications`, `orders`, `procurement`, `quotations`, `reports`, `tenants`, `treasury`

### Roles (6 fixed)
`admin`, `tesoreria`, `adquisiciones`, `almacen`, `area`, `proveedor` — defined in `accounts` models.

### Business state machines
```
SolicitudMaterial: BORRADOR → ENVIADO → EN_COTIZACION → COTIZADO → EN_AUTORIZACION → AUTORIZADO → EN_ORDEN → PARCIAL → ENTREGADO | CANCELADO
CotizacionMaterial: PENDIENTE → RECIBIDA → SELECCIONADA | RECHAZADA
OrdenCompra: BORRADOR → ENVIADA → CONFIRMADA → PARCIAL → ENTREGADA | CANCELADA
Factura: PENDIENTE → PROCESANDO → PROCESADA → DISTRIBUIDA | ERROR
```
Transitions are `@action(detail=True, methods=['post'])` on ViewSets.

## References
- Detailed patterns: `.github/copilot-instructions.md`
- API docs (local): `http://localhost:8000/api/docs/` (Swagger via drf-spectacular)
