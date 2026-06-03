# ==========================================
#   Gastos Distribuidos - VS Code Launcher
# ==========================================
# Ejecuta Backend y Frontend en la misma terminal integrada de VS Code.
# Uso: .\run_all_vscode.ps1

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Gastos Distribuidos - VS Code Launcher" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# --- Matar procesos previos en puertos 8000 y 5173 ---
foreach ($port in 8000, 5173) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 1

# --- Variables de entorno para el backend ---
$env:PYTHONUNBUFFERED = "1"
$env:DJANGO_SETTINGS_MODULE = "config.settings.local"

$backendDir = Join-Path $PSScriptRoot "backend"
$frontendDir = Join-Path $PSScriptRoot "frontend"
$pythonExe = Join-Path $backendDir "venv\Scripts\python.exe"

# --- Iniciar Backend como Job ---
Write-Host "[BACKEND] Iniciando Django en http://127.0.0.1:8000 ..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    param($python, $dir)
    $env:PYTHONUNBUFFERED = "1"
    $env:DJANGO_SETTINGS_MODULE = "config.settings.local"
    Set-Location $dir
    & $python -u manage.py runserver 8000 2>&1
} -ArgumentList $pythonExe, $backendDir

# --- Iniciar Frontend como Job ---
Write-Host "[FRONTEND] Iniciando Vite en http://localhost:5173 ..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev 2>&1
} -ArgumentList $frontendDir

Write-Host ""
Write-Host "  Backend:   http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor Yellow
Write-Host "  Credenciales: admin@gastos.local / admin123" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Presiona Ctrl+C para detener ambos servidores." -ForegroundColor DarkGray
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# --- Mostrar output de ambos jobs en tiempo real ---
try {
    while ($true) {
        # Recibir output del backend
        $backendOutput = Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
        if ($backendOutput) {
            foreach ($line in $backendOutput) {
                Write-Host "[BACKEND]  $line" -ForegroundColor Green
            }
        }

        # Recibir output del frontend
        $frontendOutput = Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
        if ($frontendOutput) {
            foreach ($line in $frontendOutput) {
                Write-Host "[FRONTEND] $line" -ForegroundColor Yellow
            }
        }

        # Verificar si algún job terminó inesperadamente
        if ($backendJob.State -eq 'Failed') {
            Write-Host "[BACKEND] ERROR: El servidor se detuvo." -ForegroundColor Red
            Receive-Job -Job $backendJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        }
        if ($frontendJob.State -eq 'Failed') {
            Write-Host "[FRONTEND] ERROR: El servidor se detuvo." -ForegroundColor Red
            Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        }

        Start-Sleep -Milliseconds 500
    }
}
finally {
    # Limpiar al salir con Ctrl+C
    Write-Host ""
    Write-Host "Deteniendo servidores..." -ForegroundColor Red
    Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job -Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob -Force -ErrorAction SilentlyContinue
    Remove-Job -Job $frontendJob -Force -ErrorAction SilentlyContinue

    # Matar procesos restantes en los puertos
    foreach ($port in 8000, 5173) {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        foreach ($c in $conns) {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "Servidores detenidos." -ForegroundColor Red
}
