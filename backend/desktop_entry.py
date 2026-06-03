"""
Desktop entry point for Gastos Distribuidos.
Packaged with PyInstaller as a standalone Windows executable.

Flow:
1. Check for updates from GitHub Releases
2. Initialize Django (migrations, superuser)
3. Start Django development server (threaded)
4. Open pywebview window with the React frontend
"""

import os
import sys
import time
import threading
from pathlib import Path


APP_PORT = 8000
APP_HOST = '127.0.0.1'
APP_URL = f'http://{APP_HOST}:{APP_PORT}'
APP_TITLE = 'Gastos Distribuidos'
SUPERUSER_EMAIL = 'admin@gastos.local'
SUPERUSER_PASSWORD = 'admin123'


def get_app_dir():
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent


def ensure_data_directories():
    app_dir = get_app_dir()
    data_dir = app_dir / 'data'
    media_dir = data_dir / 'media'
    data_dir.mkdir(exist_ok=True)
    media_dir.mkdir(exist_ok=True)
    os.environ['DESKTOP_DATA_DIR'] = str(data_dir)


def setup_django_and_migrate():
    os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.desktop'

    import django
    django.setup()

    from django.core.management import call_command

    print('[APP] Ejecutando migraciones...')
    call_command('migrate', '--run-syncdb', interactive=False, verbosity=0)
    print('[APP] Migraciones completadas.')

    from django.contrib.auth import get_user_model
    User = get_user_model()
    if not User.objects.filter(is_superuser=True).exists():
        User.objects.create_superuser(
            username='admin',
            email=SUPERUSER_EMAIL,
            password=SUPERUSER_PASSWORD,
        )
        print(f'[APP] Superusuario creado: {SUPERUSER_EMAIL}')
    else:
        print('[APP] Superusuario ya existe.')


def run_django_server():
    from django.core.management import call_command

    try:
        call_command(
            'runserver',
            f'{APP_HOST}:{APP_PORT}',
            '--noreload',
            verbosity=0,
        )
    except SystemExit:
        pass


def wait_for_server(timeout=30):
    import urllib.request
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(f'{APP_URL}/api/auth/login/', method='GET')
            urllib.request.urlopen(req, timeout=2)
            return True
        except Exception:
            time.sleep(0.5)
    return False


def open_pywebview():
    try:
        import webview
    except ImportError:
        print('[APP] pywebview no instalado. Abriendo en navegador...')
        import webbrowser
        webbrowser.open(APP_URL)
        print(f'[APP] Navegador abierto en {APP_URL}')
        print('[APP] Presiona Ctrl+C para salir.')
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print('[APP] Cerrando...')
        return

    class Api:
        def get_app_url(self):
            return APP_URL

        def quit_app(self):
            os._exit(0)

    print(f'[APP] Abriendo ventana de la aplicacion...')
    window = webview.create_window(
        title=APP_TITLE,
        url=APP_URL,
        width=1280,
        height=800,
        min_size=(900, 600),
        js_api=Api(),
    )
    webview.start(debug=False)


def main():
    print('=' * 50)
    print(f'  {APP_TITLE}')
    print('=' * 50)

    ensure_data_directories()

    try:
        from updater import check_and_update
        update_applied = check_and_update()
        if update_applied:
            print('[APP] Actualizacion en progreso. La app se cerrara para completar la instalacion.')
            sys.exit(0)
    except Exception as e:
        print(f'[APP] Error verificando actualizaciones: {e}')

    setup_django_and_migrate()

    server_thread = threading.Thread(target=run_django_server, daemon=True)
    server_thread.start()

    print('[APP] Esperando a que el servidor este listo...')
    if not wait_for_server():
        print('[APP] ERROR: El servidor no pudo iniciar.')
        sys.exit(1)

    print(f'[APP] Aplicacion lista en {APP_URL}')
    print(f'[APP] Credenciales: {SUPERUSER_EMAIL} / {SUPERUSER_PASSWORD}')
    open_pywebview()


if __name__ == '__main__':
    main()
