#!/bin/bash
echo "Iniciando limpieza de terminales colgadas..."
echo "Buscando y forzando el cierre de procesos zsh y bash..."

# Usar SIGKILL para asegurar que los procesos zombi o colgados terminen
pkill -9 zsh
pkill -9 bash

echo "Procesos limpiados. La terminal integrada debería mostrar un mensaje de que el proceso ha terminado y permitirte reiniciar una nueva sesión."
