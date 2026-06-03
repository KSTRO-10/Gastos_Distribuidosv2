from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from django.conf import settings
from .models import PDFDocument, Media
from .serializers import PDFDocumentSerializer, MediaSerializer, GenerateDocumentSerializer
from .tasks import generate_document_pdf


class PDFDocumentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PDFDocument.objects.select_related('generated_by')
    serializer_class = PDFDocumentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download PDF file."""
        document = self.get_object()
        
        return FileResponse(
            document.pdf_file.open('rb'),
            as_attachment=True,
            filename=document.nombre
        )
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate a new PDF document."""
        serializer = GenerateDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Call directly in development (no broker), async in production
        kwargs = {
            'document_type': serializer.validated_data['document_type'],
            'object_id': serializer.validated_data['object_id'],
            'user_id': request.user.id,
        }
        if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
            result = generate_document_pdf(**kwargs)
            return Response({
                'message': 'Documento generado.',
                'document_id': result['document_id'],
            }, status=status.HTTP_201_CREATED)
        else:
            generate_document_pdf.delay(**kwargs)
            return Response({
                'message': 'La generación del documento se realizará en segundo plano.'
            }, status=status.HTTP_202_ACCEPTED)


class MediaViewSet(viewsets.ModelViewSet):
    queryset = Media.objects.all()
    serializer_class = MediaSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def perform_create(self, serializer):
        file = self.request.FILES.get('file')
        serializer.save(
            owner=self.request.user,
            original_name=file.name if file else '',
            content_type=file.content_type if file else '',
            size=file.size if file else 0
        )


class SolicitudGastoPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from apps.treasury.models import SolicitudGasto
        from .services.pdf_generator import generate_solicitud_gasto_pdf

        solicitud = get_object_or_404(SolicitudGasto, pk=pk)
        try:
            pdf_bytes = generate_solicitud_gasto_pdf(solicitud.id, solicitud.tenant)
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="solicitud_gasto_{solicitud.numero}.pdf"'
            return response
        except Exception as e:
            return Response(
                {'error': f'Error generando PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SolicitudPagoPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from apps.treasury.models import SolicitudPago
        from .services.pdf_generator import generate_solicitud_pago_pdf

        solicitud = get_object_or_404(SolicitudPago, pk=pk)
        try:
            pdf_bytes = generate_solicitud_pago_pdf(solicitud.id, solicitud.tenant)
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="solicitud_pago_{solicitud.numero}.pdf"'
            return response
        except Exception as e:
            return Response(
                {'error': f'Error generando PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
