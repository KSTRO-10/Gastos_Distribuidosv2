from django.urls import path
from .views import (
    DashboardStatsView,
    GastosPorAreaView,
    GastosMensualesView,
    SolicitudesRecientesView,
    ActividadRecienteView,
    ProveedorDashboardView,
    SolicitudesParaCotizarView,
)

urlpatterns = [
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/gastos-por-area/', GastosPorAreaView.as_view(), name='gastos-por-area'),
    path('dashboard/gastos-mensuales/', GastosMensualesView.as_view(), name='gastos-mensuales'),
    path('dashboard/solicitudes-recientes/', SolicitudesRecientesView.as_view(), name='solicitudes-recientes'),
    path('dashboard/actividad-reciente/', ActividadRecienteView.as_view(), name='actividad-reciente'),
    # Portal del Proveedor - Fase 9
    path('proveedor/dashboard/', ProveedorDashboardView.as_view(), name='proveedor-dashboard'),
    path('proveedor/solicitudes-para-cotizar/', SolicitudesParaCotizarView.as_view(), name='solicitudes-para-cotizar'),
]
