from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Company, Proveedor, ProductoProveedor, FirmanteDocumento
from .serializers import (
    CompanySerializer,
    ProveedorSerializer,
    ProveedorSignupSerializer,
    ProductoProveedorSerializer,
    ProductoProveedorCreateSerializer,
    FirmanteDocumentoSerializer,
)
from apps.accounts.permissions import IsAdmin, IsAdquisiciones, IsProveedor
from apps.accounts.models import User, Role


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action == 'signup':
            return [AllowAny()]
        if self.action in ['approve', 'suspend']:
            return [IsAuthenticated(), IsAdquisiciones()]
        return super().get_permissions()
    
    def get_queryset(self):
        user = self.request.user
        if user.is_proveedor and hasattr(user, 'proveedor_profile'):
            return Proveedor.objects.filter(id=user.proveedor_profile.id)
        return super().get_queryset()
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def signup(self, request):
        """Provider self-registration."""
        serializer = ProveedorSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get or create provider role
        role, _ = Role.objects.get_or_create(
            name=Role.RoleType.PROVEEDOR,
            defaults={
                'description': 'Rol para proveedores externos',
                'permissions': Role.get_default_permissions(Role.RoleType.PROVEEDOR)
            }
        )
        
        # Create user account
        user = User.objects.create_user(
            username=serializer.validated_data['rfc'].lower(),
            email=serializer.validated_data['contacto_email'],
            password=serializer.validated_data.pop('password'),
            full_name=serializer.validated_data['contacto_nombre'],
            role=role
        )
        
        # Create provider profile
        proveedor = Proveedor.objects.create(
            user=user,
            **serializer.validated_data
        )
        
        return Response(
            ProveedorSerializer(proveedor).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a pending provider."""
        proveedor = self.get_object()
        proveedor.estado = Proveedor.EstadoChoices.ACTIVO
        proveedor.save()
        return Response(ProveedorSerializer(proveedor).data)
    
    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """Suspend a provider."""
        proveedor = self.get_object()
        proveedor.estado = Proveedor.EstadoChoices.SUSPENDIDO
        proveedor.save()
        return Response(ProveedorSerializer(proveedor).data)


class ProductoProveedorViewSet(viewsets.ModelViewSet):
    """ViewSet para el catálogo de productos de proveedores."""
    queryset = ProductoProveedor.objects.select_related('proveedor', 'cog')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductoProveedorCreateSerializer
        return ProductoProveedorSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        # Proveedores solo ven su propio catálogo
        if user.is_proveedor and hasattr(user, 'proveedor_profile'):
            queryset = queryset.filter(proveedor=user.proveedor_profile)

        # Filtro por proveedor (para admin/adquisiciones)
        proveedor_id = self.request.query_params.get('proveedor')
        if proveedor_id:
            queryset = queryset.filter(proveedor_id=proveedor_id)

        # Filtro por COG
        cog_id = self.request.query_params.get('cog')
        if cog_id:
            queryset = queryset.filter(cog_id=cog_id)

        # Búsqueda por texto
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(nombre__icontains=search) |
                Q(descripcion__icontains=search) |
                Q(marca__icontains=search) |
                Q(cog__descripcion__icontains=search)
            )

        # Solo activos por defecto
        if self.request.query_params.get('active_only', 'true').lower() == 'true':
            queryset = queryset.filter(is_active=True)

        return queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'upload_csv']:
            return [IsAuthenticated(), IsProveedor()]
        return super().get_permissions()

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_proveedor and hasattr(user, 'proveedor_profile'):
            serializer.save(proveedor=user.proveedor_profile)
        else:
            # Admin puede crear para cualquier proveedor
            proveedor_id = self.request.data.get('proveedor')
            if proveedor_id:
                proveedor = Proveedor.objects.get(id=proveedor_id)
                serializer.save(proveedor=proveedor)
            else:
                raise ValueError('Se requiere el campo proveedor.')

    @action(detail=False, methods=['post'])
    def upload_csv(self, request):
        """
        Carga masiva de productos desde CSV.
        Columnas esperadas: cog_codigo, nombre, descripcion, unidad, precio_unitario, marca, modelo
        """
        import csv
        import io

        file = request.FILES.get('archivo')
        if not file:
            return Response(
                {'error': 'Se requiere un archivo CSV.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not file.name.endswith('.csv'):
            return Response(
                {'error': 'El archivo debe ser CSV.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        if not (user.is_proveedor and hasattr(user, 'proveedor_profile')):
            return Response(
                {'error': 'Solo proveedores pueden cargar catálogos.'},
                status=status.HTTP_403_FORBIDDEN
            )

        proveedor = user.proveedor_profile

        try:
            decoded = file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(decoded))

            required_cols = {'cog_codigo', 'nombre', 'unidad', 'precio_unitario'}
            if not required_cols.issubset(set(reader.fieldnames or [])):
                return Response(
                    {'error': f'Columnas requeridas: {required_cols}. Encontradas: {set(reader.fieldnames or [])}.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            from apps.procurement.models import Cog
            created = 0
            updated = 0
            errors = []

            for i, row in enumerate(reader, start=2):
                try:
                    cog_codigo = row['cog_codigo'].strip()
                    nombre = row['nombre'].strip()
                    unidad = row['unidad'].strip()
                    precio = row['precio_unitario'].strip().replace(',', '')

                    if not all([cog_codigo, nombre, unidad, precio]):
                        errors.append(f'Fila {i}: campos obligatorios vacíos.')
                        continue

                    try:
                        cog = Cog.objects.get(codigo=cog_codigo)
                    except Cog.DoesNotExist:
                        errors.append(f'Fila {i}: COG "{cog_codigo}" no encontrado.')
                        continue

                    from decimal import Decimal, InvalidOperation
                    try:
                        precio_decimal = Decimal(precio)
                        if precio_decimal <= 0:
                            errors.append(f'Fila {i}: precio debe ser mayor a 0.')
                            continue
                    except InvalidOperation:
                        errors.append(f'Fila {i}: precio inválido "{precio}".')
                        continue

                    obj, was_created = ProductoProveedor.objects.update_or_create(
                        proveedor=proveedor,
                        nombre=nombre,
                        unidad=unidad,
                        defaults={
                            'cog': cog,
                            'descripcion': row.get('descripcion', '').strip(),
                            'precio_unitario': precio_decimal,
                            'marca': row.get('marca', '').strip(),
                            'modelo': row.get('modelo', '').strip(),
                            'is_active': True,
                        }
                    )
                    if was_created:
                        created += 1
                    else:
                        updated += 1

                except Exception as e:
                    errors.append(f'Fila {i}: {str(e)}')

            return Response({
                'creados': created,
                'actualizados': updated,
                'errores': errors,
                'total_procesados': created + updated,
            })

        except UnicodeDecodeError:
            return Response(
                {'error': 'No se pudo decodificar el archivo. Asegúrese de que sea UTF-8.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class FirmanteDocumentoViewSet(viewsets.ModelViewSet):
    """CRUD de firmantes de documentos por empresa (tenant)."""
    queryset = FirmanteDocumento.objects.select_related('company', 'user').all()
    serializer_class = FirmanteDocumentoSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        company_id = self.request.query_params.get('company')
        if company_id:
            qs = qs.filter(company_id=company_id)
        return qs

    def perform_create(self, serializer):
        # Default to first company if not specified (single-company tenant scenario)
        if not serializer.validated_data.get('company'):
            company = Company.objects.first()
            serializer.save(company=company)
        else:
            serializer.save()


