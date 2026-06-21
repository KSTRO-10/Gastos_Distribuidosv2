import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import MainLayout from '@/layouts/MainLayout'
import AuthLayout from '@/layouts/AuthLayout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ReportesPage from '@/pages/reportes/ReportesPage'
import UsersPage from '@/pages/admin/UsersPage'
import AreasPage from '@/pages/admin/AreasPage'
import ProveedoresPage from '@/pages/admin/ProveedoresPage'
import SolicitudesPage from '@/pages/procurement/SolicitudesPage'
import SolicitudFormPage from '@/pages/procurement/SolicitudFormPage'
import SolicitudDetailPage from '@/pages/procurement/SolicitudDetailPage'
import EmpresaConfigPage from '@/pages/admin/EmpresaConfigPage'
import CotizacionesPage from '@/pages/quotations/CotizacionesPage'
import CotizacionFormPage from '@/pages/quotations/CotizacionFormPage'
import CotizacionDetailPage from '@/pages/quotations/CotizacionDetailPage'
import ComparativaCotizacionesPage from '@/pages/quotations/ComparativaCotizacionesPage'
import { default as OrdenesPage } from './pages/orders/OrdenesPage'
import { default as OrdenDetailPage } from './pages/orders/OrdenDetailPage'
import { default as OrdenFormPage } from './pages/orders/OrdenFormPage'
import { default as AutorizacionesPage } from './pages/orders/AutorizacionesPage'
// Inventory pages
import EntregasPage from '@/pages/inventory/EntregasPage'
import EntregaFormPage from '@/pages/inventory/EntregaFormPage'
import EntregaDetailPage from '@/pages/inventory/EntregaDetailPage'
import SalidasPage from '@/pages/inventory/SalidasPage'
import SalidaFormPage from '@/pages/inventory/SalidaFormPage'
import SalidaDetailPage from '@/pages/inventory/SalidaDetailPage'
import StockPage from '@/pages/inventory/StockPage'
import ArticulosPage from '@/pages/inventory/ArticulosPage'
import AuditoriasPage from '@/pages/inventory/AuditoriasPage'
import DevolucionesList from '@/pages/inventory/DevolucionesList.page'
import DevolucionCreate from '@/pages/inventory/DevolucionCreate.page'
import DevolucionDetail from '@/pages/inventory/DevolucionDetail.page'
import AjustesList from '@/pages/inventory/AjustesList.page'
import AjusteCreate from '@/pages/inventory/AjusteCreate.page'
import AjusteDetail from '@/pages/inventory/AjusteDetail.page'
// Invoice pages (New Refactor)
import FacturacionDashboard from '@/pages/invoices/FacturacionDashboard.page'
import FacturasList from '@/pages/invoices/FacturasList.page'
import FacturaCreate from '@/pages/invoices/FacturaCreate.page'
import FacturaDetail from '@/pages/invoices/FacturaDetail.page'
import FacturaValidation from '@/pages/invoices/FacturaValidation.page'
import ProgramacionPago from '@/pages/invoices/ProgramacionPago.page'
import DistribucionRapidaPage from '@/pages/invoices/DistribucionRapidaPage'
// Budget pages
import PlantillasPage from '@/pages/budget/PlantillasPage'
import PlantillaDetailPage from '@/pages/budget/PlantillaDetailPage'
// Portal del Proveedor - Fase 9
import ProveedorDashboardPage from '@/pages/proveedor/ProveedorDashboardPage'
import SolicitudesCotizarPage from '@/pages/proveedor/SolicitudesCotizarPage'
import NuevaCotizacionPage from '@/pages/proveedor/NuevaCotizacionPage'
import MisCotizacionesPage from '@/pages/proveedor/MisCotizacionesPage'
import MisOrdenesPage from '@/pages/proveedor/MisOrdenesPage'
import MisFacturasPage from '@/pages/proveedor/MisFacturasPage'
import CatalogoProveedorPage from '@/pages/proveedor/CatalogoProveedorPage'
import LandingPage from '@/pages/landing/LandingPage'
import ProfilePage from '@/pages/profile/ProfilePage'

// Protected Route component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirigir proveedores a su portal, otros al dashboard
    const redirectTo = user.role === 'proveedor' ? '/portal' : '/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

// Componente para redirección según rol
function HomeRedirect() {
  const { user } = useAuthStore()

  if (user?.role === 'proveedor') {
    return <Navigate to="/portal" replace />
  }

  return <Navigate to="/dashboard" replace />
}

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected routes */}
      <Route
        element={
          isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />
        }
      >
        <Route path="/home" element={<HomeRedirect />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/perfil" element={<ProfilePage />} />
        <Route path="/reportes" element={<ReportesPage />} />

        {/* Portal del Proveedor - Fase 9 */}
        <Route path="/portal" element={
          <ProtectedRoute allowedRoles={['proveedor']}>
            <ProveedorDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/portal/cotizar" element={
          <ProtectedRoute allowedRoles={['proveedor']}>
            <SolicitudesCotizarPage />
          </ProtectedRoute>
        } />
        <Route path="/portal/cotizar/:solicitudId" element={
          <ProtectedRoute allowedRoles={['proveedor']}>
            <NuevaCotizacionPage />
          </ProtectedRoute>
        } />
        <Route path="/portal/cotizaciones" element={
          <ProtectedRoute allowedRoles={['proveedor']}>
            <MisCotizacionesPage />
          </ProtectedRoute>
        } />
        <Route path="/portal/ordenes" element={
          <ProtectedRoute allowedRoles={['proveedor']}>
            <MisOrdenesPage />
          </ProtectedRoute>
        } />
        <Route path="/portal/ordenes/:id" element={
          <ProtectedRoute allowedRoles={['proveedor']}>
            <OrdenDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/portal/facturas" element={
          <ProtectedRoute allowedRoles={['proveedor']}>
            <MisFacturasPage />
          </ProtectedRoute>
        } />
        <Route path="/portal/catalogo" element={
          <ProtectedRoute allowedRoles={['proveedor']}>
            <CatalogoProveedorPage />
          </ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="/usuarios" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="/areas" element={
          <ProtectedRoute allowedRoles={['admin', 'tesoreria']}>
            <AreasPage />
          </ProtectedRoute>
        } />
        <Route path="/proveedores" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones']}>
            <ProveedoresPage />
          </ProtectedRoute>
        } />
        <Route path="/config-pdf" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EmpresaConfigPage />
          </ProtectedRoute>
        } />

        {/* Procurement routes - Área crea, Adquisiciones gestiona */}
        <Route path="/solicitudes" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones', 'area']}>
            <SolicitudesPage />
          </ProtectedRoute>
        } />
        <Route path="/solicitudes/nueva" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones', 'area']}>
            <SolicitudFormPage />
          </ProtectedRoute>
        } />
        <Route path="/solicitudes/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones', 'area']}>
            <SolicitudDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/solicitudes/:id/editar" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones', 'area']}>
            <SolicitudFormPage />
          </ProtectedRoute>
        } />

        {/* Quotation routes - Adquisiciones envía, Tesorería autoriza */}
        <Route path="/cotizaciones" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones', 'tesoreria']}>
            <CotizacionesPage />
          </ProtectedRoute>
        } />
        <Route path="/cotizaciones/nueva" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones']}>
            <CotizacionFormPage />
          </ProtectedRoute>
        } />
        <Route path="/cotizaciones/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones', 'tesoreria']}>
            <CotizacionDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/cotizaciones/:id/editar" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones']}>
            <CotizacionFormPage />
          </ProtectedRoute>
        } />
        <Route path="/cotizaciones/comparar/:solicitudId" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones', 'tesoreria']}>
            <ComparativaCotizacionesPage />
          </ProtectedRoute>
        } />

        {/* Order routes - Adquisiciones genera y envía */}
        <Route path="/ordenes" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones']}>
            <OrdenesPage />
          </ProtectedRoute>
        } />
        <Route path="/ordenes/nueva" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones']}>
            <OrdenFormPage />
          </ProtectedRoute>
        } />
        <Route path="/ordenes/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones']}>
            <OrdenDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/ordenes/:id/editar" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones']}>
            <OrdenFormPage />
          </ProtectedRoute>
        } />
        <Route path="/autorizaciones" element={
          <ProtectedRoute allowedRoles={['admin', 'tesoreria']}>
            <AutorizacionesPage />
          </ProtectedRoute>
        } />

        {/* Inventory routes - Almacén recibe y distribuye */}
        <Route path="/inventario/entregas" element={
          <ProtectedRoute allowedRoles={['admin', 'almacen']}>
            <EntregasPage />
          </ProtectedRoute>
        } />
        <Route path="/inventario/entregas/nueva" element={
          <ProtectedRoute allowedRoles={['admin', 'almacen']}>
            <EntregaFormPage />
          </ProtectedRoute>
        } />
        <Route path="/inventario/entregas/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'almacen']}>
            <EntregaDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/inventario/salidas" element={
          <ProtectedRoute allowedRoles={['admin', 'almacen']}>
            <SalidasPage />
          </ProtectedRoute>
        } />
        <Route path="/inventario/salidas/nueva" element={
          <ProtectedRoute allowedRoles={['admin', 'almacen']}>
            <SalidaFormPage />
          </ProtectedRoute>
        } />
        <Route path="/inventario/salidas/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'almacen']}>
            <SalidaDetailPage />
          </ProtectedRoute>
        } />
        <Route path="/inventario/stock" element={
          <ProtectedRoute allowedRoles={['admin', 'almacen']}>
            <StockPage />
          </ProtectedRoute>
        } />
        <Route path="/inventario/articulos" element={
          <ProtectedRoute allowedRoles={['admin', 'almacen']}>
            <ArticulosPage />
          </ProtectedRoute>
        } />
        <Route path="/inventario/auditorias" element={
          <ProtectedRoute allowedRoles={['admin', 'almacen']}>
            <AuditoriasPage />
          </ProtectedRoute>
        } />
        
        {/* Nuevas rutas de Devoluciones y Ajustes */}
        <Route path="/inventario/devoluciones" element={
          <ProtectedRoute allowedRoles={['admin', 'almacen', 'area']}>
            <DevolucionesList />
          </ProtectedRoute>
        } />
        <Route path="/inventario/devoluciones/nueva" element={
          <ProtectedRoute allowedRoles={['area']}>
            <DevolucionCreate />
          </ProtectedRoute>
        } />
        <Route path="/inventario/devoluciones/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'almacen', 'area']}>
            <DevolucionDetail />
          </ProtectedRoute>
        } />
        <Route path="/inventario/ajustes" element={
          <ProtectedRoute allowedRoles={['admin', 'almacen']}>
            <AjustesList />
          </ProtectedRoute>
        } />
        <Route path="/inventario/ajustes/nuevo" element={
          <ProtectedRoute allowedRoles={['almacen']}>
            <AjusteCreate />
          </ProtectedRoute>
        } />
        <Route path="/inventario/ajustes/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'almacen']}>
            <AjusteDetail />
          </ProtectedRoute>
        } />

        <Route path="/inventario" element={<Navigate to="/inventario/entregas" replace />} />

        {/* Invoice routes - Módulo Facturación Refactor */}
        <Route path="/facturacion" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones', 'tesoreria']}>
            <FacturacionDashboard />
          </ProtectedRoute>
        } />
        <Route path="/facturacion/lista" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones', 'tesoreria']}>
            <FacturasList />
          </ProtectedRoute>
        } />
        <Route path="/facturacion/nueva" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones']}>
            <FacturaCreate />
          </ProtectedRoute>
        } />
        <Route path="/facturacion/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones', 'tesoreria', 'area']}>
            <FacturaDetail />
          </ProtectedRoute>
        } />
        <Route path="/facturacion/:id/validacion" element={
          <ProtectedRoute allowedRoles={['admin', 'adquisiciones']}>
            <FacturaValidation />
          </ProtectedRoute>
        } />
        <Route path="/facturacion/programacion-pago" element={
          <ProtectedRoute allowedRoles={['admin', 'tesoreria']}>
            <ProgramacionPago />
          </ProtectedRoute>
        } />

        {/* Distribución Rápida (Antiguo flujo) */}
        <Route path="/facturas/distribucion-rapida" element={
          <ProtectedRoute allowedRoles={['admin', 'tesoreria']}>
            <DistribucionRapidaPage />
          </ProtectedRoute>
        } />

        {/* Budget routes - Claves Presupuestarias */}
        <Route path="/budget/plantillas" element={
          <ProtectedRoute allowedRoles={['admin', 'tesoreria']}>
            <PlantillasPage />
          </ProtectedRoute>
        } />
        <Route path="/budget/plantillas/:id" element={
          <ProtectedRoute allowedRoles={['admin', 'tesoreria']}>
            <PlantillaDetailPage />
          </ProtectedRoute>
        } />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
