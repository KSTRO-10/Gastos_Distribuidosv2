"""
URL configuration for Gastos Distribuidos project.
These URLs are tenant-specific (non-public schema).
"""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API v1
    path('api/', include([
        # Auth
        path('auth/', include('apps.accounts.urls')),
        
        # Core apps
        path('companies/', include('apps.companies.urls')),
        path('areas/', include('apps.areas.urls')),
        path('procurement/', include('apps.procurement.urls')),
        path('quotations/', include('apps.quotations.urls')),
        path('orders/', include('apps.orders.urls')),
        path('inventory/', include('apps.inventory.urls')),
        path('invoices/', include('apps.invoices.urls')),
        path('documents/', include('apps.documents.urls')),
        path('notifications/', include('apps.notifications.urls')),
        path('reports/', include('apps.reports.urls')),
        path('budget/', include('apps.budget.urls')),
        path('treasury/', include('apps.treasury.urls')),
        path('tenants/', include('apps.tenants.urls')),
        
        # API Documentation
        path('schema/', SpectacularAPIView.as_view(), name='schema'),
        path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
        path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    ])),
]

# Serve media files (needed for development and lightweight deployments like Render free tier)
from django.conf.urls.static import static
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Debug toolbar URLs (only in DEBUG mode)
if settings.DEBUG:
    try:
        import debug_toolbar  # type: ignore
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        # debug_toolbar not installed, skip
        pass
