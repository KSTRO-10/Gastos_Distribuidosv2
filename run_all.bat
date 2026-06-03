@echo off
title Gastos Distribuidos - Launcher
echo ========================================
echo   Gastos Distribuidos - Launcher
echo ========================================
echo.
echo Iniciando Backend y Frontend...
echo.

:: Iniciar Backend en nueva ventana
start "Backend - Django" cmd /k "cd /d %~dp0backend && run_server.bat"

:: Esperar 2 segundos para que el backend inicie
timeout /t 2 /nobreak > nul

:: Iniciar Frontend en nueva ventana
start "Frontend - Vite" cmd /k "cd /d %~dp0frontend && run_frontend.bat"

echo.
echo [OK] Servidores iniciados en ventanas separadas
echo.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo.
echo Credenciales: admin@gastos.local / admin123
echo.
pause
