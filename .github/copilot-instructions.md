# Copilot Instructions — Gastos Distribuidos v2

Sistema de gestión de adquisiciones y gastos empresariales (Django + React/TypeScript).

## Arquitectura

- **Backend:** Django 4.2 + DRF, JWT (SimpleJWT), SQLite en dev / PostgreSQL + django-tenants en prod
- **Frontend:** React 18 + TypeScript + Vite (puerto 3000), Zustand (un solo store: `authStore`), TailwindCSS 3
- **Async:** Celery + Redis (prod); `CELERY_TASK_ALWAYS_EAGER=True` en dev
- **Settings:** `config/settings/base.py` (prod) vs `development.py` (dev con SQLite, sin tenants)
- **URLs dev:** `config/urls_local.py` unifica todas las rutas; en prod se separan `urls.py` (tenant) y `urls_public.py`

## Flujo de Negocio (máquina de estados)

```
SolicitudMaterial: BORRADOR → ENVIADO → EN_COTIZACION → COTIZADO → EN_AUTORIZACION → AUTORIZADO → EN_ORDEN → PARCIAL → ENTREGADO | CANCELADO
CotizacionMaterial: PENDIENTE → RECIBIDA → SELECCIONADA | RECHAZADA
OrdenCompra: BORRADOR → ENVIADA → CONFIRMADA → PARCIAL → ENTREGADA | CANCELADA
Factura: PENDIENTE → PROCESANDO → PROCESADA → DISTRIBUIDA | ERROR
```

Las transiciones de estado se implementan como `@action(detail=True, methods=['post'])` en los ViewSets.

## Roles (6 fijos)

`admin`, `tesoreria`, `adquisiciones`, `almacen`, `area`, `proveedor` — definidos en `Role.RoleChoices`.  
El modelo `User` tiene properties: `is_admin`, `is_tesoreria`, `is_adquisiciones`, `is_almacen`, `is_area`, `is_proveedor`.  
**Importante:** Mantener consistencia entre filtros de `get_role_filtered_querysets()` en `reports/views.py` y `get_queryset()` de cada ViewSet.

## Backend — Convenciones

### Nuevo endpoint CRUD
1. Crear `ModelViewSet` en `apps/{app}/views.py`
2. Implementar `get_serializer_class()` con patrón dual: Read serializer (con campos `*_name`, `*_display`) y Create serializer (con nested writable `detalles`)
3. `get_queryset()` filtra por rol: admin/tesoreria ven todo, area ve `created_by=user | area__manager=user`, proveedor ve solo lo suyo
4. `perform_create()` inyecta `created_by=self.request.user`
5. Registrar router en `apps/{app}/urls.py` y agregar include en `config/urls_local.py`

### Modelos header-detalle
- Detalles usan `related_name='detalles'`, `on_delete=CASCADE`
- Números auto-generados en `save()` con formato `PREFIX-{year}-{00001}` (ej: `SOL-2026-00042`)
- Los serializers de Create hacen **delete-all + recreate** para líneas hijas (no upsert)

### Permisos
- Clases en `accounts/permissions.py`: `IsAdmin`, `IsTesoreria`, `IsAdquisiciones`, `IsAlmacen`, `IsArea`, `IsProveedor`
- **Admin tiene acceso implícito en todas excepto `IsProveedor`**
- Usar `permission_classes=[...]` inline en `@action()` para control por acción

### Tareas Celery
- `@shared_task(bind=True, max_retries=3)` con retry exponencial
- En views: `try: task.delay() / except: task()` como fallback síncrono

## Frontend — Convenciones

### Nuevo servicio API
Crear en `services/xxxService.ts` como objeto literal exportado:
```typescript
export const xxxService = {
  getItems: async (): Promise<Item[]> => {
    const response = await api.get('/endpoint/')
    return extractData(response.data)
  },
}
```
Las interfaces de datos se definen en el **mismo archivo** del servicio. Usar `extractData<T>` para manejar respuestas paginadas DRF.

### Nueva página
- Data fetching: `useEffect` + `useState` + función `loadData` con try/catch/finally
- Loading: `const [loading, setLoading] = useState(true)`
- Notificaciones: `toast.success()` / `toast.error()` de `react-hot-toast`
- Errores: `error.response?.data?.detail || 'Mensaje fallback'`
- Formularios: `react-hook-form` con `useForm<T>()`
- Permisos en UI: `user?.role === 'admin'` o `['admin', 'adquisiciones'].includes(user?.role || '')`
- Moneda: `Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })`

### Componentes UI
- Importar desde barrel: `import { Button, Table, Modal } from '@/components/ui'`
- Path alias: `@/` = `src/`
- Iconos: solo `@heroicons/react/24/outline`
- Clases: composición con `clsx`, no CSS modules

## Comandos de Desarrollo

```powershell
# Backend
cd backend; python -m venv venv; .\venv\Scripts\Activate.ps1
pip install -r requirements/local.txt
python manage.py migrate
python manage.py runserver             # Puerto 8000

# Frontend
cd frontend; npm install; npm run dev  # Puerto 3000, proxy → 8000

# Ambos simultáneamente
.\run_all_vscode.ps1

# Datos iniciales
python manage.py shell < scripts/create_roles.py
python setup_initial_data.py
python create_test_data.py
```

## Archivos Clave por Patrón

| Patrón | Ejemplo de referencia |
|---|---|
| ViewSet completo | `backend/apps/procurement/views.py` |
| Serializer dual | `backend/apps/orders/serializers.py` |
| Permisos | `backend/apps/accounts/permissions.py` |
| Filtro por rol (dashboard) | `backend/apps/reports/views.py` → `get_role_filtered_querysets()` |
| Service frontend | `frontend/src/services/procurementService.ts` |
| Página lista | `frontend/src/pages/procurement/SolicitudesPage.tsx` |
| Componente UI | `frontend/src/components/ui/Table.tsx` |
| Auth store | `frontend/src/stores/authStore.ts` |
