@echo off
title Gastos Distribuidos - Backend Server
echo ========================================
echo   Gastos Distribuidos - Backend API
echo ========================================
echo.

cd /d "%~dp0"

set DJANGO_SETTINGS_MODULE=config.settings.local
set PYTHONUNBUFFERED=1

echo [INFO] Configuracion: %DJANGO_SETTINGS_MODULE%
echo [INFO] Iniciando servidor en http://127.0.0.1:8000
echo [INFO] Presiona Ctrl+C para detener
echo.

call venv\Scripts\python.exe manage.py runserver 8000

pause
