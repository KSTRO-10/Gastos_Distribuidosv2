"""
Public URL configuration for Gastos Distribuidos project.
These URLs are for the public schema (tenant management).
"""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Public API
    path('api/', include([
        # Auth (login works on public schema too)
        path('auth/', include('apps.accounts.urls')),
        
        # Tenant management
        path('tenants/', include('apps.tenants.urls')),
        
        # API Documentation
        path('schema/', SpectacularAPIView.as_view(), name='schema'),
        path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    ])),
]

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
