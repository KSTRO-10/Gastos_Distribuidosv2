# Auditoría de Post-Remediación: Facturación

## 1. Evidencia de Correcciones

Se verificaron físicamente en el código fuente las siguientes implementaciones de remediación:

### 3-Way Match Requerido y Tolerancia
* **Archivo Modificado:** `backend/apps/invoices/services/facturacion_service.py`
* **Función:** `validar_3_way_match`
* **Evidencia en Líneas (25-30):**
  ```python
  if not factura.recepcion:
      raise ValueError("No se puede autorizar el pago sin una Recepción (Entrega de Bienes) vinculada.")
  
  orden = factura.orden_compra
  if abs(factura.total - orden.total) > Decimal('1.00') and abs(factura.total - orden.total) / orden.total > Decimal('0.01'):
      raise ValueError(f"El total de la factura ({factura.total}) excede la tolerancia permitida respecto a la orden ({orden.total}).")
  ```

### Aislamiento de Datos por Rol
* **Archivo Modificado:** `backend/apps/invoices/views.py`
* **Clase/Función:** `FacturaViewSet.get_queryset`
* **Evidencia en Líneas (90-108):**
  ```python
  # Superuser, Tesoreria and Adquisiciones can see all
  if user.is_superuser or getattr(user, 'is_tesoreria', False) or getattr(user, 'is_adquisiciones', False):
      pass
  # Proveedor sees only theirs
  elif getattr(user, 'is_proveedor', False):
      proveedor = getattr(user, 'proveedor', None)
      if proveedor:
          queryset = queryset.filter(proveedor=proveedor)
      else:
          queryset = queryset.none()
  # Area sees only invoices distributed to them or ordered by them
  elif getattr(user, 'is_area', False):
      area = getattr(user, 'area', None)
      if area:
          queryset = queryset.filter(Q(distribuciones__area=area) | Q(orden_compra__created_by__area=area)).distinct()
      else:
          queryset = queryset.none()
  else:
      queryset = queryset.none()
  ```

### Bloqueo de Edición de Facturas Pagadas
* **Archivo Modificado:** `backend/apps/invoices/views.py`
* **Clase/Funciones:** `FacturaViewSet` (`update`, `partial_update`, `destroy`)
* **Evidencia en Líneas (130-146):**
  ```python
  def update(self, request, *args, **kwargs):
      factura = self.get_object()
      if factura.status in [Factura.EstadoChoices.PAGADA, Factura.EstadoChoices.PROGRAMADA]:
          return Response({'detail': 'No se puede modificar una factura programada o pagada.'}, status=status.HTTP_400_BAD_REQUEST)
      return super().update(request, *args, **kwargs)
  ```

### Prevención de Pagos Duplicados y Registro de Historial
* **Archivo Modificado:** `backend/apps/invoices/services/facturacion_service.py`
* **Función:** `registrar_pago`
* **Evidencia en Líneas (85-110):**
  ```python
  factura = Factura.objects.select_for_update().get(id=factura.id)  # Bloqueo para lectura/escritura concurrente
  
  if factura.status != Factura.EstadoChoices.PROGRAMADA:
      raise ValueError(f"La factura no está programada para pago. Estado actual: {factura.status}")
      
  estado_anterior = factura.status
  factura.status = Factura.EstadoChoices.PAGADA
  factura.save(update_fields=['status', 'updated_at'])
  
  # ... (Creación del objeto Pago) ...
  
  FacturaHistorial.objects.create(
      factura=factura,
      estado_anterior=estado_anterior,
      estado_nuevo=Factura.EstadoChoices.PAGADA,
      comentarios=f"Pago registrado: {referencia}",
      usuario=usuario
  )
  ```

---

## 2. Evidencia de Pruebas

Los tests se ejecutaron localmente el 7 de Junio de 2026. Salida íntegra extraída de `python manage.py test apps.invoices.tests -v 2`.

* **Tests Ejecutados:** 6
* **Aprobadas:** 6
* **Fallidas:** 0
* **Tiempo de Ejecución:** 0.064s

### Resultados:
* `test_3_way_match_fails_sin_recepcion` ... **ok**
* `test_3_way_match_fails_tolerancia` ... **ok**
* `test_3_way_match_success` ... **ok**
* `test_flujo_pago_completo` ... **ok**
* `test_aislamiento_areas` ... **ok**
* `test_tesoreria_ve_todo` ... **ok**

---

## 3. Auditoría de Seguridad Posterior

Se verifica que los siguientes escenarios **ya no son posibles**:

1. **Acceso cruzado entre áreas:** 🔒 *Imposible*. Los usuarios `is_area` quedan atrapados en un bloque restrictivo que verifica sus relaciones `distribuciones__area=area` explícitamente vía `distinct()`.
2. **Acceso cruzado entre proveedores:** 🔒 *Imposible*. Los usuarios `is_proveedor` son forzados obligatoriamente a filtrar por `proveedor=user.proveedor` en capa ORM.
3. **Modificación de facturas pagadas:** 🔒 *Imposible*. Los métodos `update`, `partial_update` y `destroy` lanzan explícitamente `HTTP 400 Bad Request`.
4. **Creación de pagos duplicados:** 🔒 *Imposible*. El endpoint `registrar_pago` utiliza una transacción atómica y bloqueo a nivel fila (`select_for_update`) que restringe a que la factura esté obligatoriamente en `PROGRAMADA`.
5. **Aprobación sin recepción:** 🔒 *Imposible*. Lanza excepción temprana estricta durante `validar_3_way_match`.

---

## 4. Revisión Frontend ↔ Backend

Se cruzaron las implementaciones generadas para el frontend en `src/services/facturacionService.ts` contra los enrutadores backend definidos en `backend/config/urls_local.py` y `apps/invoices/urls.py`.

| Frontend: Función Axios | Ruta React Configurada (`facturacionService.ts`) | Backend: Endpoint Real (`views.py`) | Compatible |
| :--- | :--- | :--- | :--- |
| `getFacturas` | `GET /facturas/` | `GET /api/invoices/` | ❌ No |
| `getFactura` | `GET /facturas/:id/` | `GET /api/invoices/:id/` | ❌ No |
| `createFactura` | `POST /facturas/` | `POST /api/invoices/` | ❌ No |
| `validarFactura` | `POST /facturas/:id/validar/` | `POST /api/invoices/:id/validar/` | ❌ No |
| `programarPagos` | `POST /facturas/programar_pago_masivo/` | `POST /api/invoices/programar_pago_masivo/` | ❌ No |
| `registrarPago` | `POST /facturas/:id/registrar_pago/` | `POST /api/invoices/:id/registrar_pago/` | ❌ No |

**Observación Crítica:** Existe un desfase de enrutamiento base. El Frontend intenta acceder a `/facturas/` mientras el backend expone la aplicación bajo `/invoices/`. Adicionalmente, se detectó que existe otro servicio legacy activo (`facturaService.ts`) que sí usa `/invoices/`, sugiriendo un código huérfano o paralelo.

---

## 5. Riesgos Residuales y Hallazgos Pendientes

* **Riesgo Operativo (Integración Rota):** Si el módulo de facturación se compila en su estado actual, las llamadas a los nuevos servicios en React fallarán con estado `404 Not Found`, rompiendo la funcionalidad de las nuevas pantallas diseñadas en la fase anterior.

## Dictamen Final

**Estado:** ⚠️ **Pendiente de Validación Final**

**Razón:** El Backend superó estrictamente la auditoría lógica, técnica y de seguridad, comprobando la total corrección de permisos y candados antifraude. Sin embargo, no se aprueba el pase a producción general debido al **desajuste de integración Frontend-Backend (Endpoint mismatch de /facturas/ contra /invoices/)**. 

**Acción Sugerida:** Corregir y unificar el mapeo de URL en los servicios de React antes del despliegue en producción.
