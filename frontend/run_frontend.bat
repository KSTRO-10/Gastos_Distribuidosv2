@echo off
title Gastos Distribuidos - Frontend Dev Server
echo ========================================
echo   Gastos Distribuidos - Frontend
echo ========================================
echo.

cd /d "%~dp0"

echo [INFO] Iniciando servidor de desarrollo...
echo [INFO] La aplicacion estara en http://localhost:5173
echo [INFO] Presiona Ctrl+C para detener
echo.

call npm run dev

pause
