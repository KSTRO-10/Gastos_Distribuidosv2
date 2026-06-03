# 🔒 Política de Seguridad

## Versiones Soportadas

| Versión | Soportada          |
| ------- | ------------------ |
| 0.9.x   | ✅ Sí              |
| 0.8.x   | ✅ Sí              |
| < 0.8   | ❌ No              |

## Reportar una Vulnerabilidad

Si descubres una vulnerabilidad de seguridad en Gastos Distribuidos v2, te pedimos que nos lo reportes de manera responsable.

### Cómo Reportar

1. **No** abras un issue público en GitHub
2. Envía un email a: **security@gastos-distribuidos.com**
3. Incluye la siguiente información:
   - Descripción detallada de la vulnerabilidad
   - Pasos para reproducirla
   - Impacto potencial
   - Sugerencia de solución (opcional)

### Qué Esperar

- **Acuse de recibo**: Dentro de 48 horas
- **Evaluación inicial**: Dentro de 7 días
- **Actualización de estado**: Cada 7 días hasta la resolución
- **Resolución**: Dependiendo de la severidad (1-30 días)

### Proceso de Divulgación

1. Confirmamos la vulnerabilidad
2. Desarrollamos un parche
3. Preparamos un advisory de seguridad
4. Liberamos la actualización
5. Publicamos el advisory (después de 30 días o cuando sea seguro)

### Reconocimiento

Agradecemos a quienes reportan vulnerabilidades de manera responsable. Con tu permiso, te mencionaremos en nuestro archivo SECURITY-THANKS.md.

## Mejores Prácticas de Seguridad

### Para Administradores

1. **Mantén actualizado** el sistema a la última versión
2. **Usa HTTPS** en producción
3. **Configura correctamente** las variables de entorno
4. **No expongas** el admin de Django públicamente
5. **Implementa** rate limiting en producción
6. **Realiza** backups regulares
7. **Monitorea** logs de acceso

### Para Desarrolladores

1. **No commits** de secretos o credenciales
2. **Valida** siempre la entrada del usuario
3. **Usa** los decoradores de permisos de Django
4. **No confíes** en datos del cliente
5. **Sanitiza** HTML cuando sea necesario
6. **Usa** consultas parametrizadas (Django ORM lo hace automático)

## Configuración Segura

### Variables de Entorno Críticas

```bash
# NUNCA uses valores por defecto en producción
SECRET_KEY=<genera-una-clave-unica-y-segura>
DEBUG=False
ALLOWED_HOSTS=tu-dominio.com

# Base de datos
DATABASE_URL=postgres://user:password@host:5432/db

# CORS
CORS_ALLOWED_ORIGINS=https://tu-dominio.com
```

### Headers de Seguridad (Nginx)

```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self';" always;
```

---

*Última actualización: 24 de enero de 2026*
