"""Budget views — CRUD de Plantillas Presupuestales + importación de Excel."""

import logging
import os

from django.conf import settings
from django.http import FileResponse, Http404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PlantillaPresupuestal, ItemClavePres
from .serializers import (
    PlantillaPresupuestalSerializer,
    PlantillaPresupuestalListSerializer,
    ItemClavePresSerializer,
)
from apps.accounts.permissions import IsAdmin, IsTesoreria

logger = logging.getLogger(__name__)


class DescargarPlantillaView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ruta = os.path.join(
            settings.BASE_DIR,
            'apps',
            'budget',
            'static',
            'PLANTILLA_CLAVES_PRESUPUESTARIAS.xlsx',
        )

        if not os.path.exists(ruta):
            raise Http404('No se encontró la plantilla de descarga.')

        response = FileResponse(
            open(ruta, 'rb'),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = (
            'attachment; filename="PLANTILLA_CLAVES_PRESUPUESTARIAS.xlsx"'
        )
        return response


class PlantillaPresupuestalViewSet(viewsets.ModelViewSet):
    """
    CRUD de Plantillas Presupuestales.

    - list:   GET    /budget/plantillas/
    - create: POST   /budget/plantillas/
    - detail: GET    /budget/plantillas/{id}/
    - update: PUT    /budget/plantillas/{id}/
    - patch:  PATCH  /budget/plantillas/{id}/
    - delete: DELETE /budget/plantillas/{id}/
    - import: POST   /budget/plantillas/{id}/import-excel/
    """

    queryset = PlantillaPresupuestal.objects.select_related(
        'tenant', 'created_by'
    ).prefetch_related('items')
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'list':
            return PlantillaPresupuestalListSerializer
        return PlantillaPresupuestalSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'import_excel']:
            return [IsAuthenticated(), IsTesoreria()]
        return super().get_permissions()

    def get_queryset(self):
        """Filtra por tenant del usuario autenticado."""
        user = self.request.user
        queryset = super().get_queryset()

        # Filtrar por tenant — obtenemos el tenant desde la conexión o configuración
        # En modo local (SQLite) se usa el primer tenant disponible
        try:
            from django.db import connection
            if hasattr(connection, 'tenant'):
                queryset = queryset.filter(tenant=connection.tenant)
        except Exception:
            pass

        # Filtro por ejercicio fiscal
        ejercicio = self.request.query_params.get('ejercicio_fiscal')
        if ejercicio:
            queryset = queryset.filter(ejercicio_fiscal=ejercicio)

        # Búsqueda por nombre
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(nombre__icontains=search)

        return queryset

    def perform_create(self, serializer):
        """Asigna tenant y created_by automáticamente."""
        tenant = self._get_tenant()
        serializer.save(
            tenant=tenant,
            created_by=self.request.user,
        )

    def _get_tenant(self):
        """Obtiene el tenant del contexto actual."""
        from apps.tenants.models import Tenant

        # Multi-tenant: usar el tenant de la conexión
        try:
            from django.db import connection
            if hasattr(connection, 'tenant'):
                return connection.tenant
        except Exception:
            pass

        # Local/SQLite: usar el primer tenant disponible
        tenant = Tenant.objects.first()
        if not tenant:
            # Crear un tenant por defecto si no existe
            tenant = Tenant.objects.create(
                schema_name='public',
                name='Default',
            )
        return tenant

    @action(
        detail=True,
        methods=['post'],
        url_path='import-excel',
        parser_classes=[MultiPartParser, FormParser],
    )
    def import_excel(self, request, pk=None):
        """
        Importa claves presupuestarias desde un archivo .xlsx.

        El Excel debe tener:
        - Encabezados en la fila 4 (índice 4 de openpyxl, 1-indexed)
        - Datos desde la fila 5

        Columnas esperadas (en orden):
        EntidFed, ClasifAdm, NoMpioRamo, UnidadAdm, UniEjecGto,
        COG, ClasiProg, TipoGto, FFF, FteFin, ClasifEcon,
        EjercicioFisc, ActInst, ProgPptario, Accion, COG(1), COG(2),
        DESCRIPCION
        """
        plantilla = self.get_object()
        archivo = request.FILES.get('file')

        if not archivo:
            return Response(
                {'error': 'Se requiere un archivo .xlsx en el campo "file".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validar extensión
        if not archivo.name.lower().endswith('.xlsx'):
            return Response(
                {'error': 'El archivo debe ser formato .xlsx (Excel).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            import openpyxl
        except ImportError:
            return Response(
                {'error': 'La librería openpyxl no está instalada en el servidor.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            wb = openpyxl.load_workbook(archivo, read_only=True, data_only=True)
            ws = wb.active

            # Encabezados en fila 4, datos desde fila 5
            HEADER_ROW = 4
            DATA_START_ROW = 5

            # Mapeo de columnas por posición (1-indexed)
            # 1:EntidFed, 2:ClasifAdm, 3:NoMpioRamo, 4:UnidadAdm, 5:UniEjecGto,
            # 6:COG, 7:ClasiProg, 8:TipoGto, 9:FFF, 10:FteFin, 11:ClasifEcon,
            # 12:EjercicioFisc, 13:ActInst, 14:ProgPptario, 15:Accion,
            # 16:COG(1), 17:COG(2), 18:DESCRIPCION

            items_to_create = []
            rows_processed = 0
            errors = []

            for row_idx, row in enumerate(ws.iter_rows(min_row=DATA_START_ROW, values_only=True), start=DATA_START_ROW):
                # Saltar filas completamente vacías
                if not row or all(cell is None or str(cell).strip() == '' for cell in row):
                    continue

                # Necesitamos al menos 18 columnas
                # Rellenar con cadena vacía si hay menos columnas
                cells = list(row) + [''] * max(0, 18 - len(row))

                def clean(val):
                    """Convierte a string limpio."""
                    if val is None:
                        return ''
                    return str(val).strip()

                try:
                    item = ItemClavePres(
                        plantilla=plantilla,
                        unidad_ejecutora_gasto=clean(cells[4]),    # col 5: UniEjecGto
                        cog=clean(cells[5]),                       # col 6: COG
                        cog_fondo=clean(cells[15]),                # col 16: COG(1) — 4° dígito, fondo
                        cog_desagregacion=clean(cells[16]),        # col 17: COG(2) — 3° dígito, desagregación
                        clasificador_programatico=clean(cells[6]), # col 7: ClasiProg
                        tipo_gasto=clean(cells[7]),                # col 8: TipoGto
                        finalidad_funcion=clean(cells[8]),         # col 9: FFF
                        fuente_financiamiento=clean(cells[9]),     # col 10: FteFin
                        clasificador_economico=clean(cells[10]),   # col 11: ClasifEcon
                        actividad_institucional=clean(cells[12]),  # col 13: ActInst
                        programa_presupuestario=clean(cells[13]),  # col 14: ProgPptario
                        accion=clean(cells[14]),                   # col 15: Accion
                        descripcion=clean(cells[17]),              # col 18: DESCRIPCION
                    )
                    items_to_create.append(item)
                    rows_processed += 1
                except Exception as e:
                    errors.append(f"Fila {row_idx}: {str(e)}")

            wb.close()

            if not items_to_create:
                return Response(
                    {
                        'error': 'No se encontraron datos válidos en el archivo.',
                        'errors': errors,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Crear todos los items en batch
            created_items = ItemClavePres.objects.bulk_create(items_to_create)

            response_data = {
                'message': f'Se importaron {len(created_items)} claves presupuestarias correctamente.',
                'items_created': len(created_items),
                'rows_processed': rows_processed,
            }

            if errors:
                response_data['warnings'] = errors

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception('Error procesando archivo Excel de claves presupuestarias')
            return Response(
                {'error': f'Error procesando el archivo: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ItemClavePresViewSet(viewsets.ModelViewSet):
    """CRUD de Items de Clave Presupuestaria (lectura/escritura individual)."""

    queryset = ItemClavePres.objects.select_related('plantilla')
    serializer_class = ItemClavePresSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsTesoreria()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtro por plantilla
        plantilla_id = self.request.query_params.get('plantilla')
        if plantilla_id:
            queryset = queryset.filter(plantilla_id=plantilla_id)

        # Filtro por COG
        cog = self.request.query_params.get('cog')
        if cog:
            queryset = queryset.filter(cog__icontains=cog)

        return queryset
