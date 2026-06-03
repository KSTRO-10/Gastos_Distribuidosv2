# 🤝 Guía de Contribución

¡Gracias por tu interés en contribuir a Gastos Distribuidos v2! Este documento proporciona las pautas y el proceso para contribuir al proyecto.

## Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Configuración del Entorno](#configuración-del-entorno)
- [Estándares de Código](#estándares-de-código)
- [Proceso de Pull Request](#proceso-de-pull-request)
- [Reportar Bugs](#reportar-bugs)
- [Proponer Nuevas Características](#proponer-nuevas-características)

---

## Código de Conducta

### Nuestro Compromiso

Nos comprometemos a hacer que la participación en este proyecto sea una experiencia libre de acoso para todos, independientemente de la edad, tamaño corporal, discapacidad, etnia, identidad de género, nivel de experiencia, nacionalidad, apariencia personal, raza, religión u orientación sexual.

### Comportamiento Esperado

- Usar un lenguaje acogedor e inclusivo
- Respetar diferentes puntos de vista y experiencias
- Aceptar con gracia las críticas constructivas
- Enfocarse en lo que es mejor para la comunidad
- Mostrar empatía hacia otros miembros

### Comportamiento Inaceptable

- Uso de lenguaje o imágenes sexualizadas
- Trolling, comentarios insultantes o despectivos
- Acoso público o privado
- Publicar información privada de otros sin permiso
- Cualquier conducta que no sea profesional

---

## Cómo Contribuir

### Tipos de Contribución

1. **🐛 Reportar bugs** - Encontrar y documentar errores
2. **✨ Nuevas características** - Proponer e implementar funcionalidades
3. **📝 Documentación** - Mejorar o traducir documentación
4. **🧪 Tests** - Añadir o mejorar pruebas
5. **🔧 Refactoring** - Mejorar código existente
6. **🎨 UI/UX** - Mejorar la interfaz de usuario

### Primeros Pasos

1. **Fork** el repositorio
2. **Clona** tu fork localmente
3. **Crea una rama** para tu contribución
4. **Desarrolla** tu cambio
5. **Prueba** tu código
6. **Envía** un Pull Request

---

## Configuración del Entorno

### Requisitos Previos

- Python 3.13+
- Node.js 22+
- Git

### Backend

```bash
# Clonar
git clone https://github.com/TU_USUARIO/Gastos_Distribuidosv2.git
cd Gastos_Distribuidosv2/backend

# Entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\Activate.ps1  # Windows PowerShell

# Dependencias
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Dependencias de desarrollo

# Variables de entorno
cp .env.example .env

# Migraciones
python manage.py migrate
python manage.py createsuperuser

# Servidor
python manage.py runserver
```

### Frontend

```bash
cd frontend

# Dependencias
npm install

# Variables de entorno
cp .env.example .env.local

# Servidor de desarrollo
npm run dev
```

### Herramientas de Desarrollo

```bash
# Backend
pip install black isort flake8 mypy pytest pytest-django

# Frontend
npm install -D eslint prettier typescript-eslint
```

---

## Estándares de Código

### Python (Backend)

#### Formato
- Usar **Black** para formateo automático
- Usar **isort** para ordenar imports
- Líneas máximo 88 caracteres

```bash
# Formatear código
black .
isort .

# Verificar estilo
flake8
mypy .
```

#### Convenciones
- Variables y funciones: `snake_case`
- Clases: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`
- Docstrings: Google style

```python
def calcular_total(items: list[Item], descuento: Decimal = Decimal("0")) -> Decimal:
    """
    Calcula el total de una lista de items aplicando descuento.

    Args:
        items: Lista de items a sumar.
        descuento: Porcentaje de descuento (0-100).

    Returns:
        Total calculado con descuento aplicado.

    Raises:
        ValueError: Si el descuento es negativo o mayor a 100.
    """
    if not 0 <= descuento <= 100:
        raise ValueError("Descuento debe estar entre 0 y 100")
    
    subtotal = sum(item.precio * item.cantidad for item in items)
    return subtotal * (1 - descuento / 100)
```

### TypeScript (Frontend)

#### Formato
- Usar **Prettier** para formateo
- Usar **ESLint** para linting
- Tabs: 2 espacios

```bash
# Formatear código
npm run format

# Verificar estilo
npm run lint
```

#### Convenciones
- Variables y funciones: `camelCase`
- Componentes React: `PascalCase`
- Interfaces/Types: `PascalCase`
- Constantes: `UPPER_SNAKE_CASE`
- Archivos de componentes: `PascalCase.tsx`

```typescript
// ✅ Correcto
interface SolicitudItem {
  id: number;
  descripcion: string;
  cantidad: number;
}

const calcularTotal = (items: SolicitudItem[]): number => {
  return items.reduce((acc, item) => acc + item.cantidad, 0);
};

// Componente
const SolicitudCard: React.FC<{ solicitud: Solicitud }> = ({ solicitud }) => {
  return <div>{solicitud.numero}</div>;
};
```

### Commits

Usar **Conventional Commits**:

```
<tipo>(<alcance>): <descripción>

[cuerpo opcional]

[pie opcional]
```

#### Tipos

| Tipo | Descripción |
|------|-------------|
| `feat` | Nueva característica |
| `fix` | Corrección de bug |
| `docs` | Cambios en documentación |
| `style` | Formateo (sin cambios de lógica) |
| `refactor` | Refactoring de código |
| `test` | Añadir o modificar tests |
| `chore` | Tareas de mantenimiento |
| `perf` | Mejoras de rendimiento |

#### Ejemplos

```bash
feat(auth): añadir autenticación con refresh token

fix(solicitudes): corregir cálculo de totales con decimales

docs(api): actualizar documentación de endpoints

refactor(proveedores): extraer lógica de validación a servicio

test(ordenes): añadir tests de integración para flujo de compra
```

### Ramas

```
main            # Producción estable
develop         # Desarrollo activo
feature/*       # Nuevas características
bugfix/*        # Correcciones de bugs
hotfix/*        # Correcciones urgentes en producción
release/*       # Preparación de releases
```

#### Nombrado

```bash
feature/portal-proveedores
feature/GD-123-notificaciones-email
bugfix/calculo-iva-incorrecto
hotfix/auth-token-expired
```

---

## Proceso de Pull Request

### 1. Crear Rama

```bash
git checkout develop
git pull origin develop
git checkout -b feature/mi-caracteristica
```

### 2. Desarrollar

- Escribe código siguiendo los estándares
- Añade tests para tu código
- Actualiza documentación si es necesario

### 3. Verificar

```bash
# Backend
cd backend
black --check .
isort --check .
flake8
python manage.py test

# Frontend
cd frontend
npm run lint
npm run type-check
npm run test
```

### 4. Commit y Push

```bash
git add .
git commit -m "feat(modulo): descripción del cambio"
git push origin feature/mi-caracteristica
```

### 5. Crear Pull Request

En GitHub:

1. Ve a "Pull Requests" → "New Pull Request"
2. Base: `develop` ← Compare: `feature/mi-caracteristica`
3. Completa la plantilla del PR:

```markdown
## Descripción
[Describe los cambios realizados]

## Tipo de cambio
- [ ] Bug fix
- [ ] Nueva característica
- [ ] Breaking change
- [ ] Documentación

## ¿Cómo se ha probado?
[Describe las pruebas realizadas]

## Checklist
- [ ] Mi código sigue los estándares del proyecto
- [ ] He realizado una auto-revisión
- [ ] He comentado el código en áreas complejas
- [ ] He actualizado la documentación
- [ ] Mis cambios no generan nuevos warnings
- [ ] He añadido tests que prueban mi fix/feature
- [ ] Los tests existentes pasan localmente
```

### 6. Revisión

- Responde a los comentarios de los revisores
- Realiza los cambios solicitados
- Marca las conversaciones como resueltas

### 7. Merge

Una vez aprobado, un mantenedor realizará el merge.

---

## Reportar Bugs

### Antes de Reportar

1. Busca si ya existe un issue similar
2. Verifica que estás usando la última versión
3. Confirma que puedes reproducir el bug

### Crear Issue

Usa la plantilla de bug report:

```markdown
**Describe el bug**
Descripción clara y concisa del bug.

**Pasos para reproducir**
1. Ir a '...'
2. Click en '...'
3. Scroll hasta '...'
4. Ver error

**Comportamiento esperado**
Qué debería ocurrir.

**Comportamiento actual**
Qué ocurre realmente.

**Screenshots**
Si aplica, añade capturas de pantalla.

**Entorno:**
- OS: [e.g. Windows 11]
- Browser: [e.g. Chrome 120]
- Versión: [e.g. 0.9.0]

**Contexto adicional**
Cualquier información adicional.
```

---

## Proponer Nuevas Características

### Antes de Proponer

1. Revisa el [ROADMAP](../ROADMAP.md) para ver si ya está planeado
2. Busca si ya existe un issue similar
3. Considera si encaja con la visión del proyecto

### Crear Proposal

Usa la plantilla de feature request:

```markdown
**¿Tu propuesta está relacionada con un problema?**
Descripción clara del problema. Ej: Siempre me frustra cuando...

**Describe la solución que te gustaría**
Descripción clara de lo que quieres que ocurra.

**Describe alternativas consideradas**
Otras soluciones que has considerado.

**Mockups/Diseños**
Si tienes, añade mockups o wireframes.

**Contexto adicional**
Cualquier información adicional.
```

---

## Tests

### Backend

```bash
# Ejecutar todos los tests
python manage.py test

# Tests específicos
python manage.py test apps.compras.tests

# Con cobertura
coverage run manage.py test
coverage report
coverage html
```

### Frontend

```bash
# Ejecutar tests
npm run test

# Con cobertura
npm run test:coverage

# Watch mode
npm run test:watch
```

### Escribir Tests

```python
# Backend - tests/test_solicitudes.py
from django.test import TestCase
from apps.compras.models import Solicitud

class SolicitudTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='test@example.com',
            password='testpass123'
        )
    
    def test_crear_solicitud(self):
        """Test que verifica la creación de una solicitud."""
        solicitud = Solicitud.objects.create(
            solicitante=self.user,
            concepto='Test',
        )
        self.assertEqual(solicitud.estado, 'borrador')
```

```typescript
// Frontend - SolicitudCard.test.tsx
import { render, screen } from '@testing-library/react';
import { SolicitudCard } from './SolicitudCard';

describe('SolicitudCard', () => {
  it('renders solicitud number', () => {
    const solicitud = {
      id: 1,
      numero: 'SOL-2026-0001',
      concepto: 'Test',
    };
    
    render(<SolicitudCard solicitud={solicitud} />);
    
    expect(screen.getByText('SOL-2026-0001')).toBeInTheDocument();
  });
});
```

---

## Recursos

- [Documentación de Django](https://docs.djangoproject.com/)
- [Documentación de React](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

## ¿Preguntas?

Si tienes dudas, puedes:
- Abrir un issue con la etiqueta `question`
- Contactar a los mantenedores

¡Gracias por contribuir! 🙏
