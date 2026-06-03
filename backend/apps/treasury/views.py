import io

from django.http import FileResponse, HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.documents.services.pdf_generator import (
    generate_distribucion_gasto_pdf,
    generate_expediente_gasto_pdf,
    generate_expediente_completo_pdf,
    generate_solicitud_gasto_pdf,
    generate_solicitud_pago_pdf,
)

from .models import SolicitudGasto, SolicitudPago
from .serializers import SolicitudGastoSerializer, SolicitudPagoSerializer


def _get_current_tenant():
    """
    Return the active tenant.
    In production (django-tenants) this comes from the DB connection set by
    TenantMainMiddleware.  In local development (SQLite, no middleware) we fall
    back to the first Tenant row so the code still works.
    """
    try:
        from django.db import connection
        return connection.tenant  # set by django-tenants middleware
    except AttributeError:
        from apps.tenants.models import Tenant
        return Tenant.objects.first()


class SolicitudGastoViewSet(viewsets.ModelViewSet):
    queryset = (
        SolicitudGasto.objects
        .select_related('factura__proveedor', 'solicitante')
        .prefetch_related('items__area')
    )
    serializer_class = SolicitudGastoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # In production, django-tenants schema isolation already scopes the
        # queryset to the current tenant.  The explicit tenant filter below is
        # kept as an extra safety net for the denormalised FK but is optional.
        qs = super().get_queryset()
        tenant = _get_current_tenant()
        if tenant is not None:
            qs = qs.filter(tenant=tenant)
        return qs

    def perform_create(self, serializer):
        serializer.save(
            tenant=_get_current_tenant(),
            solicitante=self.request.user,
        )

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        instance = self.get_object()
        try:
            pdf_bytes = generate_solicitud_gasto_pdf(instance.id, _get_current_tenant())
        except Exception as e:
            return Response(
                {'error': f'Error generando PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return FileResponse(
            io.BytesIO(pdf_bytes),
            as_attachment=True,
            filename=f'solicitud_gasto_{instance.numero}.pdf',
            content_type='application/pdf',
        )

    @action(detail=True, methods=['get'], url_path='expediente')
    def expediente_pdf(self, request, pk=None):
        instance = self.get_object()
        try:
            pdf_bytes = generate_expediente_gasto_pdf(
                instance.id, _get_current_tenant()
            )
        except Exception as e:
            return Response(
                {'error': f'Error generando expediente: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return FileResponse(
            io.BytesIO(pdf_bytes),
            as_attachment=True,
            filename=f'expediente_{instance.numero}.pdf',
            content_type='application/pdf',
        )

    @action(detail=True, methods=['get'], url_path='expediente-completo')
    def expediente_completo(self, request, pk=None):
        instance = self.get_object()
        try:
            pdf_bytes = generate_expediente_completo_pdf(
                instance.id, _get_current_tenant()
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {'error': f'Error generando expediente completo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        filename = f'expediente_completo_{instance.numero}.pdf'
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['get'], url_path='distribucion')
    def distribucion_pdf(self, request, pk=None):
        instance = self.get_object()
        try:
            pdf_bytes = generate_distribucion_gasto_pdf(
                instance.factura_id, _get_current_tenant()
            )
        except Exception as e:
            return Response(
                {'error': f'Error generando distribucion: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return FileResponse(
            io.BytesIO(pdf_bytes),
            as_attachment=True,
            filename=f'distribucion_{instance.numero}.pdf',
            content_type='application/pdf',
        )


class SolicitudPagoViewSet(viewsets.ModelViewSet):
    queryset = (
        SolicitudPago.objects
        .select_related('solicitud_gasto__factura__proveedor')
        .prefetch_related('items__area')
    )
    serializer_class = SolicitudPagoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Schema isolation handles tenant scoping in production.
        # Filter by tenant FK as an extra safety net.
        qs = super().get_queryset()
        tenant = _get_current_tenant()
        if tenant is not None:
            qs = qs.filter(solicitud_gasto__tenant=tenant)
        return qs

    def perform_create(self, serializer):
        # Derive tenant from the linked solicitud_gasto (already tenant-scoped)
        solicitud_gasto = serializer.validated_data['solicitud_gasto']
        serializer.save(tenant=solicitud_gasto.tenant)

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        instance = self.get_object()
        try:
            pdf_bytes = generate_solicitud_pago_pdf(instance.id, _get_current_tenant())
        except Exception as e:
            return Response(
                {'error': f'Error generando PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return FileResponse(
            io.BytesIO(pdf_bytes),
            as_attachment=True,
            filename=f'solicitud_pago_{instance.numero}.pdf',
            content_type='application/pdf',
        )
