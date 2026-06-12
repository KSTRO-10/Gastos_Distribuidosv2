# Validación de Integración Frontend ↔ Backend (Facturación)

## Matriz de Compatibilidad Corregida

Se revisaron los servicios consumidos por las 6 pantallas de React reportadas y se consolidó el enrutamiento para asegurar la paridad con el backend (`config/urls_local.py` → `apps/invoices/urls.py`).

| Frontend Ruta/Acción (`facturacionService.ts`) | Endpoint Backend (`FacturaViewSet`) | Estado | Corrección Aplicada |
| :--- | :--- | :--- | :--- |
| `getFacturas` | `GET /api/invoices/` | ✅ Ok | Cambiado `/facturas/` → `/invoices/`. Se detectó y corrigió además el uso de `estado` por `status` en el payload GET de `ProgramacionPago.page.tsx`. |
| `getFactura` | `GET /api/invoices/:id/` | ✅ Ok | Cambiado `/facturas/:id/` → `/invoices/:id/`. |
| `createFactura` | `POST /api/invoices/` | ✅ Ok | Cambiado `/facturas/` → `/invoices/`. |
| `validarFactura` | `POST /api/invoices/:id/validar/` | ✅ Ok | Cambiado `/facturas/:id/validar/` → `/invoices/:id/validar/`. Endpoint coincide. |
| `programarPagos` | `POST /api/invoices/programar_pago_masivo/` | ✅ Ok | Cambiado `/facturas/` → `/invoices/`. Coincide con `url_path='programar_pago_masivo'`. |
| `registrarPago` | `POST /api/invoices/:id/registrar_pago/` | ✅ Ok | Cambiado `/facturas/` → `/invoices/`. Coincide. |

## Hallazgos Resueltos en la Interfaz

1. **Paths de Axios:** Se refactorizó `frontend/src/services/facturacionService.ts` para utilizar el prefijo correcto de Django Rest Framework `/invoices/` en lugar de `/facturas/`.
2. **Parámetros de Filtrado:** El componente `ProgramacionPago.page.tsx` realizaba una solicitud `GET` utilizando un query parameter `estado=autorizada`. Django Rest Framework espera la clave `status` en el ORM filtering de `FacturaViewSet.get_queryset()`. Se corrigió el nombre de la propiedad a `status`.

## Declaración de Cierre

* No existen rutas rotas ni errores de prefijo entre el frontend y el backend.
* El enrutador `FacturaViewSet` expone los métodos que el frontend invoca en forma de ViewSet `@action`.
* Se ha resuelto la incompatibilidad de payload en el parámetro de filtrado.

Por lo tanto, la evidencia confirma consistencia plena en la integración, y se actualiza el dictamen final a:

**✅ Apto para Producción**
