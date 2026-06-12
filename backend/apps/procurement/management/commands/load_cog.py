"""
Management command para cargar/actualizar el catálogo COG desde CSV.

Uso:
    python manage.py load_cog                           # Usa backend/data/catalogo_cog.csv
    python manage.py load_cog --file ruta/al/archivo.csv  # CSV personalizado
    python manage.py load_cog --dry-run                 # Solo muestra qué haría

El CSV debe tener columnas: codigo, descripcion
Los códigos siguen la jerarquía del Clasificador por Objeto del Gasto mexicano:
    - Capítulo:  4 dígitos terminados en 000 (ej: 1000, 2000, 3000)
    - Concepto:  4 dígitos terminados en 00  (ej: 1100, 2100, 3100)
    - Partida:   3 dígitos                   (ej: 111, 211, 311)

La jerarquía (capitulo, concepto, partida_generica) se infiere automáticamente
del código, no necesita columnas adicionales en el CSV.
"""

import csv
import os

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

from apps.procurement.models import Cog


class Command(BaseCommand):
    help = 'Carga o actualiza el catálogo COG (Clasificador por Objeto del Gasto) desde un archivo CSV.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            default=None,
            help='Ruta al archivo CSV. Por defecto: backend/data/catalogo_cog.csv',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula la carga sin escribir en la base de datos.',
        )
        parser.add_argument(
            '--deactivate-missing',
            action='store_true',
            help='Marca como inactivos los COGs que no estén en el CSV.',
        )

    def get_default_csv_path(self):
        """Retorna la ruta por defecto al CSV del catálogo COG."""
        # BASE_DIR apunta a backend/
        base_dir = getattr(settings, 'BASE_DIR', None)
        if base_dir:
            return os.path.join(str(base_dir), 'data', 'catalogo_cog.csv')
        # Fallback relativo al archivo actual
        return os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            '..', '..', '..', '..', 'data', 'catalogo_cog.csv'
        )

    def classify_code(self, codigo):
        """
        Infiere la jerarquía COG a partir del código.

        Lógica:
        - Código de 4 dígitos terminado en '000' → Es un capítulo.
          capitulo = código mismo.
        - Código de 4 dígitos terminado en '00' (pero no '000') → Es un concepto.
          capitulo = primer dígito + '000', concepto = código mismo.
        - Código de 3 dígitos → Es una partida genérica.
          capitulo = primer dígito + '000', concepto = primer dígito + segundo dígito + '00',
          partida_generica = código normalizado a 4 dígitos (código + '0').
        - Código de 4 dígitos sin terminación especial → Es partida genérica o específica.
          capitulo = primer dígito + '000', concepto = primeros 2 dígitos + '00',
          partida_generica = código mismo.
        """
        codigo = codigo.strip()
        length = len(codigo)

        capitulo = ''
        concepto = ''
        partida_generica = ''

        if length == 4 and codigo.endswith('000'):
            # Es un capítulo (ej: 1000, 2000, 3000)
            capitulo = codigo
        elif length == 4 and codigo.endswith('00'):
            # Es un concepto (ej: 1100, 2100, 3300)
            capitulo = codigo[0] + '000'
            concepto = codigo
        elif length == 3:
            # Es una partida genérica en formato de 3 dígitos (ej: 111, 211, 311)
            capitulo = codigo[0] + '000'
            concepto = codigo[0] + codigo[1] + '00'
            partida_generica = codigo + '0'  # Normalizar a 4 dígitos: 111 → 1110
        elif length == 4:
            # Es una partida genérica/específica de 4 dígitos (ej: 2110, 3310)
            capitulo = codigo[0] + '000'
            concepto = codigo[:2] + '00'
            partida_generica = codigo
        else:
            # Otros formatos: intentar inferir lo que se pueda
            if length >= 1:
                capitulo = codigo[0] + '000'
            if length >= 2:
                concepto = codigo[:2] + '00'

        return capitulo, concepto, partida_generica

    def handle(self, *args, **options):
        csv_path = options['file'] or self.get_default_csv_path()
        dry_run = options['dry_run']
        deactivate_missing = options['deactivate_missing']

        # Validar que el archivo existe
        csv_path = os.path.abspath(csv_path)
        if not os.path.isfile(csv_path):
            raise CommandError(
                f'No se encontró el archivo CSV: {csv_path}\n'
                f'Coloca el archivo en backend/data/catalogo_cog.csv o usa --file para especificar la ruta.'
            )

        self.stdout.write(f'\n{"=" * 60}')
        self.stdout.write('  Carga de Catálogo COG')
        self.stdout.write(f'  Archivo: {csv_path}')
        if dry_run:
            self.stdout.write(self.style.WARNING('  MODO SIMULACIÓN (--dry-run): No se escribirá en la BD'))
        self.stdout.write(f'{"=" * 60}\n')

        # Leer CSV
        try:
            with open(csv_path, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)

                # Validar columnas
                if not reader.fieldnames:
                    raise CommandError('El archivo CSV está vacío.')

                fieldnames_lower = [fn.strip().lower() for fn in reader.fieldnames]
                if 'codigo' not in fieldnames_lower or 'descripcion' not in fieldnames_lower:
                    raise CommandError(
                        f'El CSV debe tener columnas "codigo" y "descripcion".\n'
                        f'Columnas encontradas: {reader.fieldnames}'
                    )

                rows = list(reader)
        except UnicodeDecodeError:
            # Intentar con latin-1 si UTF-8 falla
            with open(csv_path, 'r', encoding='latin-1') as f:
                reader = csv.DictReader(f)
                rows = list(reader)

        if not rows:
            raise CommandError('El archivo CSV no contiene registros.')

        self.stdout.write(f'  Registros encontrados en CSV: {len(rows)}\n')

        # Procesar registros
        created_count = 0
        updated_count = 0
        unchanged_count = 0
        errors = []
        codigos_csv = set()

        for i, row in enumerate(rows, start=2):  # start=2 porque línea 1 es el header
            codigo = row.get('codigo', '').strip()
            descripcion = row.get('descripcion', '').strip()

            if not codigo:
                errors.append(f'  Línea {i}: código vacío, se omite.')
                continue

            if not descripcion:
                errors.append(f'  Línea {i}: descripción vacía para código {codigo}, se omite.')
                continue

            codigos_csv.add(codigo)
            capitulo, concepto, partida_generica = self.classify_code(codigo)

            palabras_clave = row.get('palabras_clave', '').strip()

            defaults = {
                'descripcion': descripcion,
                'capitulo': capitulo,
                'concepto': concepto,
                'partida_generica': partida_generica,
                'palabras_clave': palabras_clave,
                'is_active': True,
            }

            if dry_run:
                exists = Cog.objects.filter(codigo=codigo).first()
                if exists:
                    # Verificar si hay cambios
                    changed = any(
                        getattr(exists, k) != v
                        for k, v in defaults.items()
                    )
                    if changed:
                        updated_count += 1
                        self.stdout.write(f'  [ACTUALIZAR] {codigo} - {descripcion}')
                    else:
                        unchanged_count += 1
                else:
                    created_count += 1
                    self.stdout.write(f'  [CREAR]      {codigo} - {descripcion}')
            else:
                obj, was_created = Cog.objects.update_or_create(
                    codigo=codigo,
                    defaults=defaults,
                )
                if was_created:
                    created_count += 1
                    self.stdout.write(f'  + {codigo} - {descripcion}')
                else:
                    # Verificar si realmente hubo cambios
                    updated_count += 1

        # Desactivar COGs que no están en el CSV (si se pidió)
        deactivated_count = 0
        if deactivate_missing and codigos_csv:
            missing_qs = Cog.objects.filter(is_active=True).exclude(codigo__in=codigos_csv)
            deactivated_count = missing_qs.count()
            if not dry_run:
                missing_qs.update(is_active=False)
            if deactivated_count > 0:
                self.stdout.write(f'\n  COGs marcados como inactivos: {deactivated_count}')
                for cog in missing_qs[:10]:
                    self.stdout.write(f'    - {cog.codigo} - {cog.descripcion}')
                if deactivated_count > 10:
                    self.stdout.write(f'    ... y {deactivated_count - 10} más')

        # Mostrar errores
        if errors:
            self.stdout.write(self.style.WARNING(f'\n  Advertencias ({len(errors)}):'))
            for err in errors:
                self.stdout.write(self.style.WARNING(err))

        # Resumen
        total_db = Cog.objects.count() if not dry_run else '(sin cambios - dry run)'
        self.stdout.write(f'\n{"=" * 60}')
        self.stdout.write(self.style.SUCCESS('  Resumen:'))
        self.stdout.write(f'    Creados:      {created_count}')
        self.stdout.write(f'    Actualizados: {updated_count}')
        self.stdout.write(f'    Sin cambios:  {unchanged_count}')
        if deactivate_missing:
            self.stdout.write(f'    Desactivados: {deactivated_count}')
        self.stdout.write(f'    Total en BD:  {total_db}')
        self.stdout.write(f'{"=" * 60}\n')

        if dry_run:
            self.stdout.write(self.style.WARNING(
                '  Ejecuta sin --dry-run para aplicar los cambios.\n'
            ))
