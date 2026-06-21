import { useState, useEffect, useCallback } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { notificationService, Notification } from '@/services/notificationService'
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
  ArchiveBoxIcon,
  Cog6ToothIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ClipboardDocumentCheckIcon,
  BoltIcon
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
  { name: 'Entradas/Salidas', href: '/inventario', icon: TruckIcon, roles: ['admin', 'almacen'] },

  // Stock: almacén revisa existencias
  { name: 'Existencias', href: '/inventario/stock', icon: ArchiveBoxIcon, roles: ['admin', 'almacen'] },

  // Catálogo de almacén
  { name: 'Catálogo de Artículos', href: '/inventario/articulos', icon: DocumentTextIcon, roles: ['admin', 'almacen'] },

  // Auditorías de inventario
  { name: 'Auditorías', href: '/inventario/auditorias', icon: ClipboardDocumentCheckIcon, roles: ['admin', 'almacen'] },

  // Facturación: Dashboard central de Cuentas por Pagar
  { name: 'Facturación', href: '/facturacion', icon: ReceiptPercentIcon, roles: ['admin', 'adquisiciones', 'tesoreria'] },

  // Distribución Rápida: subir XML y distribuir gastos directamente
  { name: 'Dist. Rápida', href: '/facturas/distribucion-rapida', icon: BoltIcon, roles: ['admin', 'tesoreria'] },

  // Claves Presupuestarias: plantillas de claves presupuestales
  { name: 'Claves Presupuestarias', href: '/budget/plantillas', icon: BanknotesIcon, roles: ['admin', 'tesoreria'] },
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

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!user || loadingNotifications) return
    try {
      setLoadingNotifications(true)
      const data = await notificationService.getNotifications()
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.read).length)
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoadingNotifications(false)
    }
  }, [user, loadingNotifications])

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds for new notifications
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [user])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await notificationService.markAsRead(notification.id)
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch (err) {
        console.error('Error marking notification as read:', err)
      }
    }
    setNotificationsOpen(false)
    if (notification.action_url) {
      navigate(notification.action_url)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Ahora mismo'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
    return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`
  }

  const getNotificationIcon = (tipo: 'info' | 'success' | 'warning' | 'error') => {
    switch (tipo) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
    }
  }

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

  const isActive = (pathname: string, href: string) => {
    if (pathname === href) return true
    if (href === '/' || href === '/dashboard') return false

    // Caso especial para '/inventario' (Entradas/Salidas) para no colisionar con stock, articulos, etc.
    if (href === '/inventario') {
      return pathname.startsWith('/inventario/entregas') ||
             pathname.startsWith('/inventario/salidas') ||
             pathname.startsWith('/inventario/devoluciones') ||
             pathname.startsWith('/inventario/ajustes')
    }

    // Caso especial para facturas y distribución rápida
    if (href === '/facturas' || href === '/facturacion' || href === '/portal/facturas') {
      return pathname === href;
    }

    return pathname.startsWith(href + '/')
  }

  const renderNavItem = (item: NavItem) => (
    <Link
      key={item.name}
      to={item.href}
      onClick={() => setSidebarOpen(false)}
      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive(location.pathname, item.href)
        ? 'bg-blue-100 text-blue-900'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
    >
      <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${isActive(location.pathname, item.href)
        ? 'text-blue-600'
        : 'text-gray-400 group-hover:text-gray-600'
        }`} />
      {item.name}
    </Link>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'} print:hidden`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <span className="text-xl font-bold text-blue-600">Gastos Distribuidos</span>
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
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col print:hidden">
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
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive(location.pathname, item.href)
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  }`}
              >
                <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${isActive(location.pathname, item.href)
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
                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive(location.pathname, item.href)
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                      }`}
                  >
                    <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${isActive(location.pathname, item.href)
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
      <div className="lg:pl-64 print:pl-0">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-100 bg-white/80 backdrop-blur-lg px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8 print:hidden">
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
            <div className="relative flex items-center">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
                title="Notificaciones"
              >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {notificationsOpen && (
                <>
                  {/* Click outside backdrop */}
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setNotificationsOpen(false)}
                  />

                  {/* Dropdown panel */}
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden transform origin-top-right transition-all duration-200 top-full">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Notificaciones</span>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 text-xs font-semibold text-red-600 bg-red-50 rounded-full">
                            {unreadCount} nuevas
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Marcar todas como leídas
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                      {loadingNotifications && notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                          Cargando notificaciones...
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center">
                          <BellIcon className="h-10 w-10 text-gray-300 mb-2" />
                          <p className="text-sm font-medium text-gray-900">Sin notificaciones</p>
                          <p className="text-xs text-gray-500">Te avisaremos cuando haya novedades</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 flex gap-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                              !notification.read ? 'bg-blue-50/30' : ''
                            }`}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotificationIcon(notification.tipo)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm text-gray-900 truncate ${
                                  !notification.read ? 'font-semibold' : 'font-normal'
                                }`}>
                                  {notification.title}
                                </p>
                                {!notification.read && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" />
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {formatRelativeTime(notification.created_at)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

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
