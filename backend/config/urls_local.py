"""
URL configuration for local development (without multi-tenancy).
"""

from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


def api_root(request):
    """Vista raíz de la API."""
    return JsonResponse(
        {
            "message": "Gastos Distribuidos API",
            "version": "1.0.0",
            "status": "running",
            "endpoints": {
                "admin": "/admin/",
                "api": "/api/",
                "docs": "/api/docs/",
                "login": "/api/auth/login/",
            },
        }
    )


urlpatterns = [
    path("", api_root, name="api-root"),
    path("admin/", admin.site.urls),
    # API v1
    path(
        "api/",
        include(
            [
                # Auth
                path("auth/", include("apps.accounts.urls")),
                # Tenants (for compatibility)
                path("tenants/", include("apps.tenants.urls")),
                # Core apps
                path("companies/", include("apps.companies.urls")),
                path("areas/", include("apps.areas.urls")),
                path("procurement/", include("apps.procurement.urls")),
                path("quotations/", include("apps.quotations.urls")),
                path("orders/", include("apps.orders.urls")),
                path("inventory/", include("apps.inventory.urls")),
                path("invoices/", include("apps.invoices.urls")),
                path("documents/", include("apps.documents.urls")),
                path("notifications/", include("apps.notifications.urls")),
                path("reports/", include("apps.reports.urls")),
                path("budget/", include("apps.budget.urls")),
                path("treasury/", include("apps.treasury.urls")),
                # API Documentation
                path("schema/", SpectacularAPIView.as_view(), name="schema"),
                path(
                    "docs/",
                    SpectacularSwaggerView.as_view(url_name="schema"),
                    name="swagger-ui",
                ),
                path(
                    "redoc/",
                    SpectacularRedocView.as_view(url_name="schema"),
                    name="redoc",
                ),
            ]
        ),
    ),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
