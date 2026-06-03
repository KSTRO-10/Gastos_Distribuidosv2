# 🚀 Guía de Despliegue

Esta guía describe el proceso de despliegue de Gastos Distribuidos v2 en diferentes entornos.

## Tabla de Contenidos

- [Requisitos](#requisitos)
- [Despliegue con Docker](#despliegue-con-docker)
- [Despliegue Manual](#despliegue-manual)
- [Configuración de Producción](#configuración-de-producción)
- [Variables de Entorno](#variables-de-entorno)
- [Base de Datos](#base-de-datos)
- [Archivos Estáticos](#archivos-estáticos)
- [SSL/TLS](#ssltls)
- [Monitoreo](#monitoreo)
- [Backups](#backups)

---

## Requisitos

### Hardware Mínimo
- CPU: 2 cores
- RAM: 4 GB
- Disco: 20 GB SSD

### Hardware Recomendado
- CPU: 4+ cores
- RAM: 8+ GB
- Disco: 100 GB SSD

### Software
- Ubuntu 22.04 LTS (o similar)
- Docker 24+ y Docker Compose v2
- PostgreSQL 15+
- Nginx 1.24+
- Redis 7+
- Node.js 22+ (para build)
- Python 3.13+

---

## Despliegue con Docker

### 1. Preparar el Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose-plugin
```

### 2. Clonar y Configurar

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/Gastos_Distribuidosv2.git
cd Gastos_Distribuidosv2

# Crear archivo de entorno
cp .env.example .env
nano .env
```

### 3. Configurar Variables

Editar `.env` con valores de producción:
```env
# Django
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=tu-clave-secreta-muy-larga-y-segura
DEBUG=False
ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com

# Base de datos
DATABASE_URL=postgres://user:password@db:5432/gastos_db
POSTGRES_USER=gastos_user
POSTGRES_PASSWORD=password-seguro
POSTGRES_DB=gastos_db

# Redis
REDIS_URL=redis://redis:6379/0

# Email
EMAIL_HOST=smtp.tuservidor.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu-email@dominio.com
EMAIL_HOST_PASSWORD=tu-password

# Frontend
VITE_API_URL=https://api.tu-dominio.com
```

### 4. Docker Compose para Producción

Crear `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    restart: always

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: always

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    volumes:
      - static_volume:/app/static
      - media_volume:/app/media
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      - db
      - redis
    restart: always

  celery:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    command: celery -A config worker -l info
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - db
      - redis
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        - VITE_API_URL=${VITE_API_URL}
    volumes:
      - frontend_dist:/app/dist
    restart: always

  nginx:
    image: nginx:1.24-alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - static_volume:/var/www/static:ro
      - media_volume:/var/www/media:ro
      - frontend_dist:/var/www/html:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - frontend
    restart: always

volumes:
  postgres_data:
  redis_data:
  static_volume:
  media_volume:
  frontend_dist:
```

### 5. Iniciar Servicios

```bash
# Construir imágenes
docker compose -f docker-compose.prod.yml build

# Iniciar servicios
docker compose -f docker-compose.prod.yml up -d

# Ejecutar migraciones
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Crear superusuario
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Recolectar estáticos
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Ver logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## Despliegue Manual

### 1. Backend

```bash
# Crear usuario de sistema
sudo useradd -m -s /bin/bash gastos
sudo su - gastos

# Clonar y configurar
git clone https://github.com/tu-usuario/Gastos_Distribuidosv2.git
cd Gastos_Distribuidosv2/backend

# Entorno virtual
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configurar entorno
cp .env.example .env
nano .env  # Editar variables

# Migraciones
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic
```

### 2. Gunicorn

Crear `/etc/systemd/system/gastos.service`:

```ini
[Unit]
Description=Gastos Distribuidos Backend
After=network.target

[Service]
User=gastos
Group=www-data
WorkingDirectory=/home/gastos/Gastos_Distribuidosv2/backend
Environment="DJANGO_SETTINGS_MODULE=config.settings.production"
ExecStart=/home/gastos/Gastos_Distribuidosv2/backend/venv/bin/gunicorn \
    --workers 4 \
    --bind unix:/run/gunicorn/gastos.sock \
    --access-logfile /var/log/gastos/access.log \
    --error-logfile /var/log/gastos/error.log \
    config.wsgi:application

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable gastos
sudo systemctl start gastos
```

### 3. Frontend

```bash
cd frontend
npm ci
npm run build

# Copiar a directorio web
sudo cp -r dist/* /var/www/gastos/
```

### 4. Nginx

Crear `/etc/nginx/sites-available/gastos`:

```nginx
upstream backend {
    server unix:/run/gunicorn/gastos.sock fail_timeout=0;
}

server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 50M;

    # Frontend
    location / {
        root /var/www/gastos;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin Django
    location /admin/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Archivos estáticos
    location /static/ {
        alias /home/gastos/Gastos_Distribuidosv2/backend/staticfiles/;
    }

    # Media
    location /media/ {
        alias /home/gastos/Gastos_Distribuidosv2/backend/media/;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/gastos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Variables de Entorno

### Backend (Producción)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SECRET_KEY` | Clave secreta Django | Genera con `django.core.management.utils.get_random_secret_key()` |
| `DEBUG` | Modo debug | `False` |
| `ALLOWED_HOSTS` | Hosts permitidos | `dominio.com,www.dominio.com` |
| `DATABASE_URL` | Conexión PostgreSQL | `postgres://user:pass@host:5432/db` |
| `REDIS_URL` | Conexión Redis | `redis://localhost:6379/0` |
| `EMAIL_HOST` | Servidor SMTP | `smtp.gmail.com` |
| `EMAIL_PORT` | Puerto SMTP | `587` |
| `EMAIL_USE_TLS` | Usar TLS | `True` |
| `EMAIL_HOST_USER` | Usuario email | `app@dominio.com` |
| `EMAIL_HOST_PASSWORD` | Password email | `app-password` |
| `CORS_ALLOWED_ORIGINS` | Orígenes CORS | `https://dominio.com` |

### Frontend

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL del backend | `https://api.dominio.com` |

---

## SSL/TLS con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Renovación automática
sudo certbot renew --dry-run
```

---

## Monitoreo

### Logs

```bash
# Backend logs
tail -f /var/log/gastos/error.log
tail -f /var/log/gastos/access.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Docker logs
docker compose logs -f backend
```

### Healthcheck

```bash
# Verificar backend
curl -f http://localhost:8000/api/health/

# Verificar frontend
curl -f http://localhost/
```

---

## Backups

### Base de Datos

```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups/postgres
FILENAME=gastos_${DATE}.sql.gz

# Docker
docker compose exec -T db pg_dump -U gastos_user gastos_db | gzip > ${BACKUP_DIR}/${FILENAME}

# Manual
pg_dump -h localhost -U gastos_user gastos_db | gzip > ${BACKUP_DIR}/${FILENAME}

# Eliminar backups > 30 días
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +30 -delete
```

### Media Files

```bash
#!/bin/bash
# backup-media.sh

DATE=$(date +%Y%m%d_%H%M%S)
MEDIA_DIR=/home/gastos/Gastos_Distribuidosv2/backend/media
BACKUP_DIR=/backups/media

tar -czf ${BACKUP_DIR}/media_${DATE}.tar.gz -C ${MEDIA_DIR} .
```

### Crontab

```bash
# Backup diario a las 2 AM
0 2 * * * /opt/scripts/backup-db.sh
0 3 * * * /opt/scripts/backup-media.sh
```

---

## Actualización

```bash
# 1. Hacer backup
./backup-db.sh
./backup-media.sh

# 2. Obtener cambios
cd /home/gastos/Gastos_Distribuidosv2
git fetch origin
git pull origin main

# 3. Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart gastos

# 4. Frontend
cd ../frontend
npm ci
npm run build
sudo cp -r dist/* /var/www/gastos/

# 5. Verificar
curl -f http://localhost:8000/api/health/
```

---

## Troubleshooting

### Error 502 Bad Gateway
```bash
# Verificar que gunicorn esté corriendo
sudo systemctl status gastos
# Revisar logs
tail -f /var/log/gastos/error.log
```

### Error de conexión a base de datos
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql
# Probar conexión
psql -h localhost -U gastos_user -d gastos_db
```

### Problemas de permisos
```bash
# Verificar permisos de archivos
sudo chown -R gastos:www-data /home/gastos/Gastos_Distribuidosv2
chmod 750 /home/gastos/Gastos_Distribuidosv2
```

---

*Última actualización: 24 de enero de 2026*
