"""
URL configuration for desktop standalone mode.
Serves the React frontend as a Single Page Application.
"""

import os
from django.contrib import admin
from django.urls import include, path, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, Http404
from django.views.static import serve as static_serve
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


def serve_index(request, path=""):
    index_path = os.path.join(str(settings.FRONTEND_DIST), "index.html")
    if not os.path.isfile(index_path):
        raise Http404("Frontend build not found. Run: cd frontend && npm run build")
    with open(index_path, "rb") as f:
        return HttpResponse(f.read(), content_type="text/html")


def serve_frontend_asset(request, path):
    return static_serve(request, path, document_root=str(settings.FRONTEND_DIST))


urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "api/",
        include(
            [
                path("auth/", include("apps.accounts.urls")),
                path("tenants/", include("apps.tenants.urls")),
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
    # Frontend static assets (e.g., /assets/index-abc.js)
    re_path(r"^(assets/.+)$", serve_frontend_asset),
    re_path(
        r"^(?P<path>(?:favicon|logo|vite)\.(?:ico|png|svg|jpg|webp))$",
        serve_frontend_asset,
    ),
    # Serve index.html at root and for all SPA routes
    path("", serve_index, name="index"),
    re_path(r"^(?P<path>.*)$", serve_index, name="spa-catchall"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
