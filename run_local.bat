@echo off
title Gastos Distribuidos - Desktop (Local)
echo ============================================
echo   Gastos Distribuidos - Modo Escritorio
echo ============================================
echo.
echo Iniciando backend + frontend en modo desktop...
echo.

cd /d "%~dp0backend"

if not exist "..\frontend\dist\index.html" (
    echo [!] Frontend build no encontrado. Compilando...
    cd /d "%~dp0frontend"
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Fallo la compilacion del frontend.
        pause
        exit /b 1
    )
    cd /d "%~dp0backend"
)

if not exist "venv\Scripts\python.exe" (
    echo [!] Entorno virtual no encontrado en backend\venv
    echo     Instala las dependencias primero: cd backend ^&^& pip install -r requirements\desktop.txt
    pause
    exit /b 1
)

echo [OK] Iniciando aplicacion...
echo.
echo Credenciales por defecto:
echo   Email: admin@gastos.local
echo   Password: admin123
echo.

set DJANGO_SETTINGS_MODULE=config.settings.desktop
call venv\Scripts\activate.bat

where pywebview >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [!] pywebview no encontrado. Instalando...
    pip install pywebview
)

python desktop_entry.py

echo.
echo [OK] Aplicacion cerrada.
pause
