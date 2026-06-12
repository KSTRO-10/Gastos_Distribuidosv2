# Reporte de Remediación: Módulo de Facturación

## 1. 3-Way Match

Se modificó el servicio `FacturacionService.validar_3_way_match` en `backend/apps/invoices/services/facturacion_service.py` para:
- Bloquear la autorización si la factura no cuenta con una recepción (Entrega de Bienes) vinculada.
- Implementar validación de tolerancia (Diferencia máxima de $1.00 o 1% entre el total de la factura y el total de la orden de compra).
- Asegurar que la validación se realice con bloqueo transaccional concurrente (`select_for_update`).

## 2. Aislamiento de Datos

Se refactorizó el método `get_queryset` de `FacturaViewSet` en `backend/apps/invoices/views.py`:
- Los proveedores ahora solo pueden ver las facturas donde `proveedor=user.proveedor`.
- Los usuarios de áreas (`is_area`) solo pueden ver las facturas distribuidas a su área o donde la orden de compra original haya sido creada por un usuario de su área.
- Tesorería, Adquisiciones y Administradores tienen visibilidad global para procesamiento.
- Cualquier otro rol o usuario sin permisos tiene acceso restringido explícito (`queryset.none()`).

## 3. Ruteo Frontend-Backend

- Se actualizó el endpoint `@action(url_path='programar_pago_masivo')` en `FacturaViewSet` para alinear el backend con las llamadas realizadas por el frontend y solucionar el error `404 Not Found`.

## 4. Endpoint Registrar Pago y Bloqueos de Modificación

- Se implementó el método estático `registrar_pago` en `FacturacionService` que realiza la inserción de un registro en la entidad `Pago`, cambia el estado de la factura a `PAGADA`, y guarda el comprobante de forma transaccional.
- Se implementó el endpoint `@action(detail=True, methods=['post'], url_path='registrar_pago')` para consumir el servicio.
- Se bloqueó sobrescribiendo los métodos `update`, `partial_update` y `destroy` del `FacturaViewSet` para impedir modificaciones en las facturas cuando se encuentran en estados terminales o pre-terminales (`PROGRAMADA` o `PAGADA`).
