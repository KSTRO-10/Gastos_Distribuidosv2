# 📖 Manual de Usuario - Gastos Distribuidos v2

## ¿Qué es Gastos Distribuidos?

**Gastos Distribuidos v2** es un sistema web que permite a las empresas gestionar todo el proceso de compras, desde que un área solicita materiales hasta que se paga al proveedor y se distribuyen los gastos contablemente.

> [!TIP]
> Piensa en este sistema como el "cerebro digital" de tu departamento de compras: organiza, rastrea y documenta cada paso del proceso.

---

## 🎯 ¿Para Quién es Este Sistema?

El sistema está diseñado para diferentes tipos de usuarios dentro de una organización:

| Rol | ¿Qué hace? |
|-----|------------|
| **Administrador** | Configura el sistema, gestiona usuarios y tiene acceso total |
| **Jefe de Área** | Solicita materiales para su departamento |
| **Adquisiciones** | Gestiona cotizaciones y órdenes de compra |
| **Almacén** | Recibe materiales y controla el inventario |
| **Tesorería** | Procesa facturas, aprueba presupuestos y gestiona pagos |
| **Proveedor** | Envía cotizaciones y confirma órdenes (acceso externo) |

---

## 🔄 ¿Cómo Funciona el Proceso de Compra?

### El Flujo Completo (Paso a Paso)

```
1️⃣ SOLICITUD      2️⃣ COTIZACIÓN      3️⃣ AUTORIZACIÓN      4️⃣ ORDEN
   Un área            Se pide            Tesorería           Se envía
   necesita           precio a           aprueba el          la orden
   material           proveedores        presupuesto         al proveedor

        ⬇                   ⬇                  ⬇                  ⬇

5️⃣ CONFIRMACIÓN   6️⃣ ENTREGA        7️⃣ FACTURACIÓN     8️⃣ DISTRIBUCIÓN
   El proveedor       Almacén            El proveedor        Se asignan
   confirma           recibe los         envía su            los gastos
   la orden           materiales         factura             por área
```

### Descripción de Cada Etapa:

#### 1️⃣ Solicitud de Material
Un jefe de área identifica una necesidad y crea una solicitud en el sistema, especificando:
- Qué necesita (productos/servicios)
- Cantidad requerida
- Justificación de la compra
- Fecha límite (si es urgente)

#### 2️⃣ Cotización
El área de Adquisiciones solicita cotizaciones a uno o más proveedores. Cada proveedor puede enviar su propuesta con precios, tiempos de entrega y condiciones de pago.

#### 3️⃣ Autorización Presupuestal
Antes de generar una orden de compra, Tesorería verifica que exista presupuesto disponible y autoriza la compra.

#### 4️⃣ Orden de Compra
Con la cotización seleccionada y el presupuesto autorizado, se genera una orden de compra formal que se envía al proveedor.

#### 5️⃣ Confirmación del Proveedor
El proveedor confirma que puede cumplir con la orden y los tiempos acordados.

#### 6️⃣ Entrega de Bienes
Cuando llegan los materiales, el personal de Almacén los recibe, verifica las cantidades y registra la entrega en el sistema.

#### 7️⃣ Facturación
El proveedor envía su factura electrónica (CFDI). El sistema lee automáticamente el archivo XML y extrae toda la información fiscal.

#### 8️⃣ Distribución de Gastos
Finalmente, el costo de la factura se distribuye entre las áreas correspondientes para fines contables y de control presupuestal.

---

## 📊 Dashboard y Reportes

El sistema ofrece un panel principal con información en tiempo real:

- **Solicitudes Pendientes** - Cuántas solicitudes están esperando atención
- **Presupuesto por Área** - Cuánto ha gastado cada departamento
- **Órdenes Activas** - Estado de las órdenes de compra en proceso
- **Facturas por Procesar** - Comprobantes fiscales pendientes de distribución
- **Gastos del Mes** - Comparativa de gastos vs presupuesto

---

## 🌐 Portal de Proveedores

Los proveedores tienen su propio acceso al sistema donde pueden:

- ✅ **Gestionar su catálogo** de productos con precios
- ✅ Ver solicitudes de cotización que les enviaron
- ✅ Enviar sus propuestas de precio
- ✅ Confirmar órdenes de compra
- ✅ Subir sus facturas electrónicas
- ✅ Consultar el estado de sus pagos

### 📦 Mi Catálogo (Portal de Proveedores)

Cada proveedor puede cargar y gestionar su **catálogo de productos** con precios unitarios. Esto permite que el sistema genere automáticamente cotizaciones cuando una solicitud incluye productos que coinciden con los que tienes en el catálogo.

#### ¿Cómo usar Mi Catálogo?

**Acceder a Mi Catálogo:**
1. Inicia sesión en el portal de proveedores
2. En el menu lateral, haz clic en **"Mi Catálogo"** (ícono de caja)
3. Verás un listado de todos tus productos registrados

**Agregar un producto manualmente:**
1. Haz clic en el botón **"Agregar Producto"**
2. Completa el formulario:
   - **COG:** Selecciona la clasificación presupuestal del producto (ej: "Papelería")
   - **Nombre:** El nombre exacto del producto
   - **Descripción:** Detalles adicionales (marca, modelo, especificaciones)
   - **Unidad:** Cómo se vende (Unidad, Resma, Caja, Kg, etc.)
   - **Precio Unitario:** El precio sin IVA
   - **Marca** y **Modelo:** Información técnica (opcional)
3. Haz clic en **"Guardar"**

**Cargar múltiples productos (CSV):**
> [!TIP]
> Si tienes muchos productos, puedes cargarlos todos a la vez usando un archivo CSV.

1. Haz clic en el botón **"Cargar CSV"**
2. Descarga la **plantilla CSV** como referencia
3. Llena el archivo con tus productos (columnas: COG, nombre, descripción, unidad, precio, marca, modelo)
4. Sube el archivo
5. El sistema te mostrará cuántos se crearon/actualizaron y si hay errores

**Editar o eliminar un producto:**
- Desde la tabla de productos, usa los botones de la fila (editar o eliminar)
- También puedes hacer clic en un producto para ver todos sus detalles

#### ¿Para qué sirve mi catálogo?

Cuando alguien en la empresa solicita material, el sistema **busca automáticamente** en los catálogos de todos los proveedores para encontrar coincidencias por COG. Si tu catálogo tiene los productos que solicitan:

✅ Se **genera automáticamente una cotización** sin que tengas que hacer nada  
✅ Apareces en la **vista comparativa** de cotizaciones  
✅ Tienes **más oportunidades** de ganar la orden de compra

**Ejemplo:**
- Una empresa solicita "Papel Bond" (COG: Papelería)
- Tu catálogo tiene "Papel Bond Blanco 80gr" bajo ese mismo COG
- ¡El sistema crea automáticamente una cotización con tu precio!

> [!IMPORTANT]
> Mantén **tu catálogo actualizado** con los productos y precios correctos. Precios desactualizados pueden hacer que pierdas oportunidades.

> [!NOTE]
> Los proveedores solo ven la información relacionada con ellos, nunca tienen acceso a datos de otros proveedores o información interna de la empresa.

---

## � Gestión de Perfil de Usuario

Todos los usuarios pueden personalizar su perfil y gestionar su información personal desde el menú **Mi Perfil**.

### ¿Cómo Acceder a Mi Perfil?

Haz clic en tu **foto de perfil** o nombre en la barra superior (esquina superior derecha) o en el panel lateral. Esto te llevará a la página de perfil.

### Secciones del Perfil

#### 📸 Información Personal

Aquí puedes actualizar:

- **Foto de perfil**: Sube una imagen que te represente
  - Formatos permitidos: JPG, PNG, WebP
  - Tamaño máximo: 2 MB
  - Puedes arrastrar y soltar la imagen o hacer clic en "Subir"
  - Vista previa en tiempo real antes de guardar
- **Nombre completo**: Tu nombre como aparecerá en el sistema
- **Teléfono**: Número de contacto (opcional)
- **Correo electrónico**: Solo lectura, no se puede modificar
- **Nombre de usuario**: Solo lectura, no se puede modificar

> [!TIP]
> Tu foto de perfil aparecerá en toda la aplicación: en el menú, en la lista de usuarios (para administradores), y en notificaciones futuras.

#### 🔐 Contraseña

Para cambiar tu contraseña de forma segura:

1. Ingresa tu **contraseña actual** para verificar tu identidad
2. Escribe tu **nueva contraseña** (mínimo 8 caracteres)
3. **Confirma** la nueva contraseña escribiéndola de nuevo
4. Haz clic en **"Cambiar contraseña"**

> [!WARNING]
> Por seguridad, serás desconectado después de cambiar tu contraseña. Tendrás que volver a iniciar sesión con la nueva credencial.

#### ⚙️ Preferencias

Próximamente podrás configurar:
- Notificaciones por email
- Notificaciones en el sistema
- Tema de la interfaz (claro/oscuro)
- Formato de moneda y fechas

### Logos de Empresa (Solo para Proveedores)

Si eres un **proveedor**, desde tu perfil también podrás:

- Subir el **logo de tu empresa** que aparecerá en tu portal
- Actualizar tus **datos de contacto** comercial
- Ver tu RFC y razón social

El logo de tu empresa aparecerá en:
- Tu dashboard del portal de proveedores
- Documentos generados (cotizaciones, órdenes)
- Comunicaciones oficiales

### ¿Por Qué Personalizar mi Perfil?

1. **Identificación fácil**: Otros usuarios te reconocerán rápidamente
2. **Profesionalismo**: Una foto de perfil hace más confiable la comunicación
3. **Seguridad**: Mantener tus datos actualizados ayuda en caso de necesitar recuperar acceso
4. **Experiencia personalizada**: El sistema se adapta mejor a tus necesidades

---

## �📄 Facturas Electrónicas (CFDI)

El sistema procesa automáticamente facturas electrónicas del SAT en formato CFDI 4.0:

### ¿Cómo funciona?
1. Se carga el archivo **XML** de la factura
2. El sistema extrae automáticamente:
   - UUID (folio fiscal)
   - RFC del emisor y receptor
   - Conceptos y montos
   - Impuestos (IVA, ISR retenido, etc.)
   - Tipo de comprobante
3. Se vincula con la orden de compra correspondiente
4. Se distribuye el gasto entre las áreas

### Información que Procesa:
- Folio y serie
- Fechas de emisión
- Subtotal, IVA, total
- Forma y método de pago
- Uso del CFDI

---

## 🔒 Seguridad del Sistema

### ¿Cómo se Protege la Información?

| Aspecto | Medida de Protección |
|---------|---------------------|
| **Acceso** | Usuario y contraseña obligatorios |
| **Sesiones** | Tokens seguros que expiran automáticamente |
| **Contraseñas** | Almacenadas de forma encriptada |
| **Comunicación** | Conexión cifrada (HTTPS) |
| **Permisos** | Cada rol solo ve lo que necesita |
| **Auditoría** | Se registra quién hizo qué y cuándo |

### Buenas Prácticas para Usuarios:

1. **No compartas tu contraseña** con nadie
2. **Cierra sesión** cuando termines de usar el sistema
3. **No uses la misma contraseña** que usas en otros sitios
4. **Reporta** cualquier actividad sospechosa al administrador

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si olvido mi contraseña?
Contacta al administrador del sistema para que la restablezca.

### ¿Puedo ver solicitudes de otras áreas?
Solo los roles administrativos y de adquisiciones pueden ver todas las solicitudes. Los jefes de área solo ven las de su propio departamento.

### ¿Se puede cancelar una orden de compra?
Sí, pero depende del estado. Si ya está confirmada por el proveedor, se requiere coordinación adicional.

### ¿El sistema funciona en celular?
Sí, la interfaz es responsiva y se adapta a diferentes tamaños de pantalla.

### ¿Cada cuánto se realizan respaldos?
El sistema realiza respaldos automáticos diarios de la base de datos.

---

## 📞 Soporte

Si tienes dudas o problemas con el sistema, contacta a:

- **Administrador del Sistema**: Para problemas técnicos o de acceso
- **Área de Adquisiciones**: Para dudas sobre el proceso de compras
- **Tesorería**: Para temas de facturación y pagos

---

*Versión del documento: 2.1 | Última actualización: Febrero 2026*
