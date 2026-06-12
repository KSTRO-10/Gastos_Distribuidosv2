#!/bin/bash

# Gastos Distribuidos - Launcher for macOS
echo "========================================"
echo "  Gastos Distribuidos - Launcher (macOS)"
echo "========================================"
echo ""

# Get the script directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Exit handler to kill both background jobs on Ctrl+C
cleanup() {
    echo ""
    echo "[!] Deteniendo servidores..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

echo "Iniciando Backend..."
cd "$DIR/backend" || exit 1
# Activate venv if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi
export DJANGO_SETTINGS_MODULE=config.settings.development
python3 manage.py runserver 8000 &
BACKEND_PID=$!

echo "Esperando a que el backend inicie..."
sleep 2

echo "Iniciando Frontend..."
cd "$DIR/frontend" || exit 1
npm run dev &
FRONTEND_PID=$!

echo ""
echo "[OK] Servidores iniciados en segundo plano."
echo "Backend:  http://127.0.0.1:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Presiona Ctrl+C para detener ambos servidores."

# Keep the script running to catch Ctrl+C
wait
