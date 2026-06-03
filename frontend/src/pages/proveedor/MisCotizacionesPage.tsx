import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { Button, Card } from '@/components/ui'
import { proveedorPortalService } from '@/services/proveedorPortalService'
import { Cotizacion } from '@/services/quotationService'

const estadoColors: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  recibida: 'bg-blue-100 text-blue-800',
  seleccionada: 'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
}

const estadoIcons: Record<string, React.ElementType> = {
  pendiente: ClockIcon,
  recibida: ClipboardDocumentListIcon,
  seleccionada: CheckCircleIcon,
  rechazada: XCircleIcon,
}

export default function MisCotizacionesPage() {
  const navigate = useNavigate()
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('')

  useEffect(() => {
    loadCotizaciones()
  }, [])

  const loadCotizaciones = async () => {
    try {
      const data = await proveedorPortalService.getMisCotizaciones()
      setCotizaciones(data)
    } catch (error: any) {
      toast.error('Error al cargar cotizaciones')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0)
  }

  const cotizacionesFiltradas = filtroEstado
    ? cotizaciones.filter(c => c.estado === filtroEstado)
    : cotizaciones

  // Estadísticas
  const stats = {
    total: cotizaciones.length,
    pendientes: cotizaciones.filter(c => c.estado === 'pendiente').length,
    seleccionadas: cotizaciones.filter(c => c.estado === 'seleccionada').length,
    rechazadas: cotizaciones.filter(c => c.estado === 'rechazada').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/portal')}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Mis Cotizaciones</h1>
            <p className="text-gray-500">Historial de cotizaciones enviadas</p>
          </div>
        </div>
        <Link to="/portal/cotizar">
          <Button>
            <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
            Nueva Cotización
          </Button>
        </Link>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={`p-4 cursor-pointer transition-all ${filtroEstado === '' ? 'ring-2 ring-primary-500' : ''}`}
          onClick={() => setFiltroEstado('')}
        >
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
        </Card>
        <Card 
          className={`p-4 cursor-pointer transition-all ${filtroEstado === 'pendiente' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setFiltroEstado(filtroEstado === 'pendiente' ? '' : 'pendiente')}
        >
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="text-2xl font-semibold text-yellow-600">{stats.pendientes}</p>
        </Card>
        <Card 
          className={`p-4 cursor-pointer transition-all ${filtroEstado === 'seleccionada' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setFiltroEstado(filtroEstado === 'seleccionada' ? '' : 'seleccionada')}
        >
          <p className="text-sm text-gray-500">Seleccionadas</p>
          <p className="text-2xl font-semibold text-green-600">{stats.seleccionadas}</p>
        </Card>
        <Card 
          className={`p-4 cursor-pointer transition-all ${filtroEstado === 'rechazada' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setFiltroEstado(filtroEstado === 'rechazada' ? '' : 'rechazada')}
        >
          <p className="text-sm text-gray-500">Rechazadas</p>
          <p className="text-2xl font-semibold text-red-600">{stats.rechazadas}</p>
        </Card>
      </div>

      {/* Lista de cotizaciones */}
      {cotizacionesFiltradas.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardDocumentListIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {cotizaciones.length === 0 ? 'No hay cotizaciones' : 'No hay cotizaciones con este filtro'}
          </h3>
          <p className="text-gray-500">
            {cotizaciones.length === 0 
              ? 'Aún no ha enviado ninguna cotización.'
              : 'Pruebe cambiando el filtro para ver otras cotizaciones.'}
          </p>
          {cotizaciones.length === 0 && (
            <Link to="/portal/cotizar">
              <Button className="mt-4">Ver Solicitudes Abiertas</Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {cotizacionesFiltradas.map((cot) => {
            const IconEstado = estadoIcons[cot.estado] || ClockIcon
            return (
              <Card key={cot.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${estadoColors[cot.estado]}`}>
                      <IconEstado className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{cot.numero}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${estadoColors[cot.estado]}`}>
                          {cot.estado_display}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Solicitud: {cot.solicitud_numero}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>Fecha: {cot.fecha}</span>
                        {cot.vigencia && <span>Vigencia: {cot.vigencia}</span>}
                        {cot.tiempo_entrega && <span>Entrega: {cot.tiempo_entrega}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(cot.total)}</p>
                    <Link
                      to={`/cotizaciones/${cot.id}`}
                      className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 mt-2"
                    >
                      <EyeIcon className="h-4 w-4" />
                      Ver detalle
                    </Link>
                  </div>
                </div>

                {/* Mensaje especial si fue seleccionada */}
                {cot.estado === 'seleccionada' && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      <p className="text-sm text-green-800">
                        <span className="font-medium">¡Felicidades!</span> Esta cotización fue seleccionada. 
                        Recibirá una orden de compra pronto.
                      </p>
                    </div>
                  </div>
                )}

                {/* Mensaje si fue rechazada */}
                {cot.estado === 'rechazada' && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2">
                      <XCircleIcon className="h-5 w-5 text-red-600" />
                      <p className="text-sm text-red-800">
                        Esta cotización no fue seleccionada en esta ocasión.
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
