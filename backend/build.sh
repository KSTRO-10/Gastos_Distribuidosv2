#!/usr/bin/env bash
# Build script for Render

set -o errexit

pip install -r requirements/production.txt

python manage.py collectstatic --noinput

# django-tenants: migrate shared apps on public schema first
python manage.py migrate_schemas --shared
