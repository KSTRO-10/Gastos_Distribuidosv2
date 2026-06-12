"""
Auto-updater module for Gastos Distribuidos desktop app.
Checks GitHub Releases for new versions and handles the update process.
"""

import os
import sys
import json
import zipfile
import urllib.request
import urllib.error
import subprocess
from pathlib import Path

GITHUB_OWNER = 'AsahioO'
GITHUB_REPO = 'Gastos_Distribuidosv2'
GITHUB_API_URL = (
    f'https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/latest'
)
CURRENT_VERSION = '0.0.0'


def get_app_root_dir():
    """Directory containing the exe (persists across updates)."""
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent
    return Path(__file__).resolve().parent


def get_bundle_dir():
    """Internal directory with bundled files."""
    if getattr(sys, 'frozen', False):
        return Path(getattr(sys, '_MEIPASS'))
    return Path(__file__).resolve().parent


def get_current_version():
    version_path = get_bundle_dir() / 'version.txt'
    if version_path.exists():
        return version_path.read_text().strip().lstrip('v')
    return CURRENT_VERSION


def get_latest_release():
    try:
        req = urllib.request.Request(
            GITHUB_API_URL,
            headers={
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'GastosDistribuidos-Updater/1.0',
            },
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode())
            return data
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print('[UPDATER] GitHub API rate limit reached. Skipping update check.')
        else:
            print(f'[UPDATER] HTTP error checking updates: {e.code}')
    except Exception as e:
        print(f'[UPDATER] Could not check for updates: {e}')
    return None


def compare_versions(current_str, latest_str):
    def parse(v):
        return tuple(int(x) for x in v.lstrip('v').split('.'))
    try:
        return parse(latest_str) > parse(current_str)
    except (ValueError, IndexError):
        return False


def download_file(url, dest_path):
    print('[UPDATER] Descargando actualizacion...')
    req = urllib.request.Request(
        url, headers={'User-Agent': 'GastosDistribuidos-Updater/1.0'}
    )
    total_size = 0
    with urllib.request.urlopen(req, timeout=300) as response:
        with open(dest_path, 'wb') as f:
            while True:
                chunk = response.read(8192)
                if not chunk:
                    break
                f.write(chunk)
                total_size += len(chunk)
    print(f'[UPDATER] Descarga completada ({total_size / 1024 / 1024:.1f} MB)')


def extract_zip(zip_path, extract_to):
    os.makedirs(extract_to, exist_ok=True)
    with zipfile.ZipFile(zip_path, 'r') as zf:
        zf.extractall(extract_to)


def apply_update(app_dir, update_dir):
    update_bat_path = app_dir / '_update.bat'
    exe_name = 'GastosDistribuidos.exe'

    bat_content = (
        '@echo off\r\n'
        'echo ============================================\r\n'
        'echo   Gastos Distribuidos - Actualizando...\r\n'
        'echo ============================================\r\n'
        'echo.\r\n'
        'echo Esperando a que se cierre la aplicacion...\r\n'
        'timeout /t 3 /nobreak >nul\r\n'
        'echo.\r\n'
        'echo Copiando archivos nuevos...\r\n'
        f'xcopy /E /I /Y "{update_dir}\\*" "{app_dir}"\r\n'
        'echo.\r\n'
        f'rmdir /S /Q "{update_dir}"\r\n'
        'echo Actualizacion completada. Reiniciando...\r\n'
        f'start "" /D "{app_dir}" "{exe_name}"\r\n'
        'del "%~f0"\r\n'
    )

    update_bat_path.write_text(bat_content, encoding='ascii')
    print('[UPDATER] Actualizacion preparada. Instalando...')

    creationflags = 0
    if sys.platform == 'win32':
        creation_new_console = getattr(subprocess, 'CREATE_NEW_CONSOLE', 0x00000010)
        detached_process = getattr(subprocess, 'DETACHED_PROCESS', 0x00000008)
        creationflags = creation_new_console | detached_process

    subprocess.Popen(
        str(update_bat_path),
        creationflags=creationflags,
        close_fds=True,
    )


def check_and_update():
    current = get_current_version()
    print(f'[UPDATER] Version actual: v{current}')

    release = get_latest_release()
    if not release:
        return False

    latest_tag = release.get('tag_name', '')
    print(f'[UPDATER] Ultima version en GitHub: {latest_tag}')

    if not compare_versions(current, latest_tag):
        print('[UPDATER] Ya tienes la ultima version.')
        return False

    print(f'[UPDATER] Nueva version disponible: {latest_tag}')

    assets = release.get('assets', [])
    zip_asset = None
    for asset in assets:
        name = asset.get('name', '').lower()
        if name.endswith('.zip') and 'windows' in name:
            zip_asset = asset
            break

    if not zip_asset:
        for asset in assets:
            name = asset.get('name', '').lower()
            if name.endswith('.zip'):
                zip_asset = asset
                break

    if not zip_asset:
        print('[UPDATER] No se encontro un asset .zip para descargar.')
        return False

    download_url = zip_asset.get('browser_download_url')
    if not download_url:
        print('[UPDATER] No se encontro URL de descarga.')
        return False

    app_dir = get_app_root_dir()
    updates_dir = app_dir / 'updates'

    try:
        zip_path = app_dir / 'update.zip'
        download_file(download_url, zip_path)

        if updates_dir.exists():
            import shutil
            shutil.rmtree(str(updates_dir), ignore_errors=True)

        extract_zip(zip_path, updates_dir)
        os.remove(zip_path)

        apply_update(app_dir, updates_dir)
        return True

    except Exception as e:
        print(f'[UPDATER] Error durante la actualizacion: {e}')
        return False


if __name__ == '__main__':
    if check_and_update():
        print('Actualizacion iniciada. La aplicacion se cerrara.')
        sys.exit(0)
    else:
        print('No se requiere actualizacion.')
