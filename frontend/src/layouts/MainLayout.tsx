import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  ReceiptPercentIcon,
  BellIcon,
  UsersIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  DocumentPlusIcon,
  BoltIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  roles?: string[]  // Si no se especifica, todos los roles internos pueden verlo
}

// Navegación principal para usuarios internos - CON restricciones por rol según flujo de negocio
// 
// FLUJO: Área→Adquisiciones→Proveedores→Tesorería(autoriza)→Adquisiciones(OC)→Almacén→Tesorería(pago)
//
const navigation: NavItem[] = [
  // Todos ven el Dashboard
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },

  // Reportes: solo admin y tesorería
  { name: 'Reportes', href: '/reportes', icon: ChartBarIcon, roles: ['admin', 'tesoreria'] },

  // Solicitudes: área crea, adquisiciones gestiona, admin supervisa
  { name: 'Solicitudes', href: '/solicitudes', icon: DocumentTextIcon, roles: ['admin', 'adquisiciones', 'area'] },

  // Cotizaciones: adquisiciones envía a proveedores, tesorería autoriza la mejor
  { name: 'Cotizaciones', href: '/cotizaciones', icon: ClipboardDocumentListIcon, roles: ['admin', 'adquisiciones', 'tesoreria'] },

  // Órdenes de Compra: adquisiciones genera y envía al proveedor ganador
  { name: 'Órdenes de Compra', href: '/ordenes', icon: ShoppingCartIcon, roles: ['admin', 'adquisiciones'] },

  // Inventario/Entregas: almacén recibe mercancía del proveedor
  { name: 'Inventario', href: '/inventario', icon: TruckIcon, roles: ['admin', 'almacen'] },

  // Facturas/Pagos: tesorería procesa pagos a proveedores
  { name: 'Facturas', href: '/facturas', icon: ReceiptPercentIcon, roles: ['admin', 'tesoreria'] },

  // Claves Presupuestarias: plantillas de claves presupuestales
  { name: 'Claves Presupuestarias', href: '/budget/plantillas', icon: BanknotesIcon, roles: ['admin', 'tesoreria'] },

  // Distribución Rápida: subir XML y distribuir gastos directamente
  { name: 'Dist. Rápida', href: '/facturas/distribucion-rapida', icon: BoltIcon, roles: ['admin', 'tesoreria'] },
]

// Navegación para proveedores
const proveedorNavigation: NavItem[] = [
  { name: 'Mi Portal', href: '/portal', icon: HomeIcon },
  { name: 'Mi Catálogo', href: '/portal/catalogo', icon: ArchiveBoxIcon },
  { name: 'Cotizar', href: '/portal/cotizar', icon: DocumentPlusIcon },
  { name: 'Mis Cotizaciones', href: '/portal/cotizaciones', icon: ClipboardDocumentListIcon },
  { name: 'Mis Órdenes', href: '/portal/ordenes', icon: ShoppingCartIcon },
  { name: 'Mis Facturas', href: '/portal/facturas', icon: ReceiptPercentIcon },
]

const adminNavigation: NavItem[] = [
  { name: 'Usuarios', href: '/usuarios', icon: UsersIcon, roles: ['admin'] },
  { name: 'Áreas', href: '/areas', icon: BuildingOfficeIcon, roles: ['admin', 'tesoreria'] },
  { name: 'Proveedores', href: '/proveedores', icon: BuildingStorefrontIcon, roles: ['admin', 'adquisiciones'] },
  { name: 'Config. Empresa', href: '/config-pdf', icon: Cog6ToothIcon, roles: ['admin'] },
]

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Determinar si es proveedor
  const isProveedor = user?.role === 'proveedor'
  const userRole = user?.role || ''

  // Navegación según tipo de usuario, filtrada por rol
  const mainNavigation = isProveedor
    ? proveedorNavigation
    : navigation.filter(item => !item.roles || item.roles.includes(userRole))

  const filteredAdminNav = isProveedor ? [] : adminNavigation.filter(
    item => !item.roles || (user && item.roles.includes(user.role))
  )

  const renderNavItem = (item: NavItem) => (
    <Link
      key={item.name}
      to={item.href}
      onClick={() => setSidebarOpen(false)}
      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${location.pathname === item.href
        ? 'bg-primary-100 text-primary-900'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
    >
      <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
      {item.name}
    </Link>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <span className="text-xl font-bold text-primary-600">Gastos Distribuidos</span>
            <button
              onClick={() => setSidebarOpen(false)}
              title="Cerrar menú"
              aria-label="Cerrar menú de navegación"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {mainNavigation.map(renderNavItem)}

            {filteredAdminNav.length > 0 && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Administración
                  </p>
                </div>
                {filteredAdminNav.map(renderNavItem)}
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-grow flex-col overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-800">
          <div className="flex h-16 items-center px-4 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">GD</span>
              </div>
              <span className="text-lg font-bold text-white">Gastos Dist.</span>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {mainNavigation.map(item => (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${location.pathname === item.href || location.pathname.startsWith(item.href + '/')
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
              >
                <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${location.pathname === item.href || location.pathname.startsWith(item.href + '/')
                  ? 'text-white'
                  : 'text-slate-400 group-hover:text-white'
                  }`} />
                {item.name}
              </Link>
            ))}

            {filteredAdminNav.length > 0 && (
              <>
                <div className="pt-6 pb-2">
                  <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Administración
                  </p>
                </div>
                {filteredAdminNav.map(item => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${location.pathname === item.href
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                      }`}
                  >
                    <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${location.pathname === item.href
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-white'
                      }`} />
                    {item.name}
                  </Link>
                ))}
              </>
            )}
          </nav>

          {/* User info en sidebar */}
          <div className="p-4 border-t border-slate-700/50">
            <Link to="/perfil" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-transparent group-hover:ring-blue-500 transition-all">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate group-hover:text-blue-300 transition-colors">{user?.full_name || 'Usuario'}</p>
                <p className="text-xs text-slate-400 truncate">{user?.role_display || user?.role}</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-100 bg-white/80 backdrop-blur-lg px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            title="Abrir menú"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex flex-1 justify-end gap-x-4 lg:gap-x-6">
            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Notificaciones">
              <BellIcon className="h-6 w-6" />
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {/* Profile dropdown */}
            <div className="flex items-center gap-x-3 pl-3 border-l border-gray-200">
              <Link to="/perfil" className="flex items-center gap-x-3 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                      <span className="text-white font-medium text-xs">
                        {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="hidden sm:flex sm:flex-col sm:items-end">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.full_name || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500">{user?.role_display || user?.role}</p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6 bg-gray-100 min-h-[calc(100vh-4rem)] transition-colors duration-300">
          <div className="px-4 sm:px-6 lg:px-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
