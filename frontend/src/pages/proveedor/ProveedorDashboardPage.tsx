import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ClipboardDocumentListIcon,
  ShoppingCartIcon,
  ReceiptPercentIcon,
  CurrencyDollarIcon,
  DocumentPlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  TruckIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui'
import { proveedorPortalService, ProveedorDashboardData } from '@/services/proveedorPortalService'
import { dashboardService, type ActividadReciente } from '@/services/dashboardService'

const estadoColors: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  activo: 'bg-green-100 text-green-800',
  suspendido: 'bg-red-100 text-red-800',
}

const ordenEstadoColors: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-800',
  enviada: 'bg-blue-100 text-blue-800',
  confirmada: 'bg-purple-100 text-purple-800',
  parcial: 'bg-yellow-100 text-yellow-800',
  entregada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
}

export default function ProveedorDashboardPage() {
  const [data, setData] = useState<ProveedorDashboardData | null>(null)
  const [actividad, setActividad] = useState<ActividadReciente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const [dashboardData, actividadData] = await Promise.all([
        proveedorPortalService.getDashboard(),
        dashboardService.getActividadReciente()
      ])
      setData(dashboardData)
      setActividad(actividadData)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No se pudo cargar el dashboard</h3>
        <p className="text-gray-500">Asegúrese de tener un perfil de proveedor asociado.</p>
      </div>
    )
  }

  const { info_proveedor, estadisticas, ordenes_recientes, solicitudes_abiertas } = data

  return (
    <div className="space-y-6">
      {/* Header con información del proveedor */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Logo del proveedor */}
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/20 flex-shrink-0 flex items-center justify-center">
              {(data as any)?.info_proveedor?.logo ? (
                <img src={(data as any).info_proveedor.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-2xl font-bold text-white/80">
                  {info_proveedor.nombre_comercial?.charAt(0)?.toUpperCase() || 'P'}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{info_proveedor.nombre_comercial}</h1>
              <p className="text-primary-100">{info_proveedor.razon_social}</p>
              <p className="text-primary-200 text-sm mt-1">RFC: {info_proveedor.rfc}</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${estadoColors[info_proveedor.estado_cuenta]}`}>
              {info_proveedor.estado_cuenta.charAt(0).toUpperCase() + info_proveedor.estado_cuenta.slice(1)}
            </span>
            <p className="text-primary-200 text-sm mt-2">{info_proveedor.email}</p>
            <p className="text-primary-200 text-sm">{info_proveedor.telefono}</p>
            <Link to="/perfil" className="inline-flex items-center gap-1 mt-2 text-xs text-primary-200 hover:text-white transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar perfil
            </Link>
          </div>
        </div>
      </div>

      {/* Alerta si el proveedor está suspendido o pendiente */}
      {info_proveedor.estado_cuenta !== 'activo' && (
        <div className={`rounded-md p-4 ${info_proveedor.estado_cuenta === 'suspendido' ? 'bg-red-50' : 'bg-yellow-50'}`}>
          <div className="flex">
            <ExclamationTriangleIcon className={`h-5 w-5 ${info_proveedor.estado_cuenta === 'suspendido' ? 'text-red-400' : 'text-yellow-400'}`} />
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${info_proveedor.estado_cuenta === 'suspendido' ? 'text-red-800' : 'text-yellow-800'}`}>
                {info_proveedor.estado_cuenta === 'suspendido'
                  ? 'Cuenta Suspendida'
                  : 'Cuenta Pendiente de Aprobación'}
              </h3>
              <p className={`text-sm mt-1 ${info_proveedor.estado_cuenta === 'suspendido' ? 'text-red-700' : 'text-yellow-700'}`}>
                {info_proveedor.estado_cuenta === 'suspendido'
                  ? 'Su cuenta ha sido suspendida. Contacte al administrador para más información.'
                  : 'Su cuenta está en proceso de aprobación. Una vez aprobada podrá cotizar y recibir órdenes.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Cotizaciones Pendientes</p>
              <p className="text-2xl font-semibold text-gray-900">{estadisticas.cotizaciones_pendientes}</p>
              <p className="text-xs text-gray-400">
                {estadisticas.cotizaciones_seleccionadas} seleccionadas
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingCartIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Órdenes Nuevas</p>
              <p className="text-2xl font-semibold text-gray-900">{estadisticas.ordenes_nuevas}</p>
              <p className="text-xs text-gray-400">
                {estadisticas.ordenes_confirmadas} confirmadas
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ReceiptPercentIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Facturas Pendientes</p>
              <p className="text-2xl font-semibold text-gray-900">{estadisticas.facturas_pendientes}</p>
              <p className="text-xs text-gray-400">
                {estadisticas.facturas_procesadas} procesadas
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Facturado este Mes</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(estadisticas.total_facturado_mes)}</p>
              <p className="text-xs text-gray-400">
                Total: {formatCurrency(estadisticas.total_facturado_historico)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solicitudes abiertas para cotizar */}
        <Card>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <DocumentPlusIcon className="h-5 w-5 text-blue-500" />
                Solicitudes Abiertas para Cotizar
              </h3>
              <Link to="/portal/cotizar" className="text-sm text-primary-600 hover:text-primary-800">
                Ver todas →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {solicitudes_abiertas.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <ClipboardDocumentListIcon className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                No hay solicitudes abiertas para cotizar
              </div>
            ) : (
              solicitudes_abiertas.map((sol) => (
                <Link
                  key={sol.id}
                  to={`/portal/cotizar/${sol.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{sol.numero}</p>
                      <p className="text-sm text-gray-500">{sol.descripcion || 'Sin descripción'}</p>
                      <p className="text-xs text-gray-400 mt-1">Área: {sol.area}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(sol.total_estimado)}</p>
                      <p className="text-xs text-gray-500">{sol.fecha}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Órdenes recientes */}
        <Card>
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <ShoppingCartIcon className="h-5 w-5 text-purple-500" />
                Mis Órdenes Recientes
              </h3>
              <Link to="/portal/ordenes" className="text-sm text-primary-600 hover:text-primary-800">
                Ver todas →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {ordenes_recientes.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <ShoppingCartIcon className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                No hay órdenes asignadas
              </div>
            ) : (
              ordenes_recientes.map((orden) => (
                <Link
                  key={orden.id}
                  to={`/portal/ordenes/${orden.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{orden.numero}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          Entrega: {orden.fecha_entrega || 'Por definir'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(orden.total)}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ordenEstadoColors[orden.estado]}`}>
                        {orden.estado_display}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card>
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Acciones Rápidas</h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/portal/cotizar"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <DocumentPlusIcon className="h-8 w-8 text-primary-600" />
            <div>
              <p className="font-medium text-gray-900">Nueva Cotización</p>
              <p className="text-sm text-gray-500">Cotizar solicitudes abiertas</p>
            </div>
          </Link>

          <Link
            to="/portal/ordenes"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <CheckCircleIcon className="h-8 w-8 text-purple-600" />
            <div>
              <p className="font-medium text-gray-900">Confirmar Órdenes</p>
              <p className="text-sm text-gray-500">Ver órdenes pendientes</p>
            </div>
          </Link>

          <Link
            to="/portal/facturas"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <ReceiptPercentIcon className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Mis Facturas</p>
              <p className="text-sm text-gray-500">Ver estado de pagos</p>
            </div>
          </Link>
        </div>
      </Card>

      {/* Actividad Reciente */}
      {actividad.length > 0 && (
        <Card>
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Actividad Reciente</h3>
          </div>
          <div className="p-4 space-y-4">
            {actividad.map((item, index) => (
              <div key={item.id} className="flex gap-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    {item.tipo === 'solicitud' && <DocumentTextIcon className="w-5 h-5 text-blue-500" />}
                    {item.tipo === 'cotizacion' && <ChartBarIcon className="w-5 h-5 text-purple-500" />}
                    {item.tipo === 'orden' && <ShoppingCartIcon className="w-5 h-5 text-emerald-500" />}
                    {item.tipo === 'factura' && <CurrencyDollarIcon className="w-5 h-5 text-amber-500" />}
                    {item.tipo === 'entrega' && <TruckIcon className="w-5 h-5 text-teal-500" />}
                  </div>
                  {index < actividad.length - 1 && (
                    <div className="absolute left-1/2 top-10 bottom-0 w-px bg-gray-200 -translate-x-1/2 h-full" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm text-gray-900">{item.descripcion}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{item.fecha}</span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-500">{item.usuario}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
