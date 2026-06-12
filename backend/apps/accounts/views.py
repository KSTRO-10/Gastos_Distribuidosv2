from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User, Role
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    RoleSerializer,
    CustomTokenObtainPairSerializer,
)
from .permissions import IsAdmin


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom login view with additional user info."""
    serializer_class = CustomTokenObtainPairSerializer


class RoleViewSet(viewsets.ModelViewSet):
    """ViewSet for managing roles."""
    
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    @action(detail=False, methods=['get'])
    def list_types(self, request):
        """List all available role types."""
        return Response([
            {'value': choice[0], 'label': choice[1]}
            for choice in Role.RoleType.choices
        ])


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for managing users."""
    
    queryset = User.objects.select_related('role').all()
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Deshabilitar paginación para obtener todos los usuarios
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete user if possible, otherwise deactivate them.
        This handles cases where the user has related records (solicitudes, etc.)
        """
        user = self.get_object()
        
        # Prevent deleting yourself
        if user.id == request.user.id:
            return Response(
                {'detail': 'No puede eliminar su propia cuenta.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Try to delete, if ProtectedError occurs, deactivate instead
        from django.db.models import ProtectedError
        try:
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError:
            # User has related records, deactivate instead
            if user.is_active:
                user.is_active = False
                user.save()
                return Response(
                    {'detail': 'El usuario tiene registros asociados y no puede ser eliminado. Ha sido desactivado en su lugar.'},
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {'detail': 'El usuario tiene registros asociados y no puede ser eliminado. Ya está desactivado.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Non-admin users can only see themselves
        if not user.is_admin:
            queryset = queryset.filter(id=user.id)
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current authenticated user."""
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['put'])
    def update_me(self, request):
        """Update current authenticated user."""
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user, context={'request': request}).data)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change password for current user."""
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': 'Contraseña actual incorrecta.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({'message': 'Contraseña actualizada correctamente.'})
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def toggle_active(self, request, pk=None):
        """Toggle user active status."""
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response({'is_active': user.is_active})
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_ine(self, request):
        """Upload or update INE document for the current user."""
        ine_documento = request.FILES.get('ine_documento')
        if not ine_documento:
            return Response(
                {'detail': 'Debes adjuntar el documento de tu INE.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        
        if user.ine_verificada and getattr(user.role, 'name', '') != 'admin':
            return Response(
                {'detail': 'Tu INE ya está verificada. No puedes subir una nueva a menos que un administrador lo autorice.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        user.ine_documento = ine_documento
        user.ine_rechazada = False
        user.ine_rechazo_motivo = ''
        # Reset verification so admin re-verifies the new upload
        user.ine_verificada = False
        user.save(update_fields=['ine_documento', 'ine_rechazada', 'ine_rechazo_motivo', 'ine_verificada'])
        
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['delete'])
    def delete_ine(self, request):
        """Delete INE document for the current user."""
        user = request.user
        
        if user.ine_verificada and getattr(user.role, 'name', '') != 'admin':
            return Response(
                {'detail': 'Tu INE ya está verificada. No puedes eliminarla.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if user.ine_documento:
            user.ine_documento.delete(save=False)
            user.ine_documento = None
            user.ine_rechazada = False
            user.ine_rechazo_motivo = ''
            user.save(update_fields=['ine_documento', 'ine_rechazada', 'ine_rechazo_motivo'])
            
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)
        
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def approve_ine(self, request, pk=None):
        """Approve a user's INE."""
        user = self.get_object()
        user.ine_verificada = True
        user.ine_rechazada = False
        user.ine_rechazo_motivo = ''
        user.save(update_fields=['ine_verificada', 'ine_rechazada', 'ine_rechazo_motivo'])
        return Response({'status': 'INE aprobada'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def reject_ine(self, request, pk=None):
        """Reject a user's INE."""
        user = self.get_object()
        motivo = request.data.get('motivo', 'El documento no cumple con los requisitos.')
        user.ine_verificada = False
        user.ine_rechazada = True
        user.ine_rechazo_motivo = motivo
        user.save(update_fields=['ine_verificada', 'ine_rechazada', 'ine_rechazo_motivo'])
        return Response({'status': 'INE rechazada', 'motivo': motivo})
