import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PlusIcon, CheckCircleIcon, DocumentTextIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import { quotationService, Cotizacion } from '@/services/quotationService'
import { useAuthStore } from '@/stores/authStore'

interface Props {
  solicitudId: number
  estadoSolicitud: string
  onCotizacionSelected?: () => void
}

export default function CotizacionesSection({ solicitudId, estadoSolicitud, onCotizacionSelected }: Props) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<number | null>(null)

  const isAdquisiciones = user?.role === 'adquisiciones'
  const isAdmin = user?.role === 'admin'

  const loadCotizaciones = async () => {
    try {
      const data = await quotationService.getCotizaciones(solicitudId)
      setCotizaciones(data)
    } catch (error) {
      toast.error('Error al cargar cotizaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCotizaciones()
  }, [solicitudId])

  const handleSelect = async (id: number) => {
    setSelecting(id)
    try {
      await quotationService.selectCotizacion(id)
      toast.success('Cotización seleccionada como ganadora')
      loadCotizaciones()
      if (onCotizacionSelected) {
        onCotizacionSelected()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al seleccionar cotización')
    } finally {
      setSelecting(null)
    }
  }

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    return isNaN(num) ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num)
  }

  if (loading) return <div className="py-4 text-center text-sm text-gray-500">Cargando cotizaciones...</div>

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-500" />
          Cotizaciones Recibidas ({cotizaciones.length})
        </h3>
        
        {['en_cotizacion', 'cotizado'].includes(estadoSolicitud) && (isAdquisiciones || isAdmin) && (
          <Button size="sm" onClick={() => navigate(`/cotizaciones/nueva?solicitud=${solicitudId}`)}>
            <PlusIcon className="h-4 w-4 mr-1" />
            Nueva Cotización
          </Button>
        )}
      </div>

      {cotizaciones.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-6 text-center text-sm text-gray-500 border border-dashed border-gray-300">
          No hay cotizaciones registradas para esta solicitud.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cotizaciones.map((cot) => (
            <div 
              key={cot.id} 
              className={`bg-white rounded-lg shadow border-2 p-4 transition-all ${
                cot.estado === 'seleccionada' 
                  ? 'border-green-500 ring-2 ring-green-100' 
                  : 'border-transparent hover:border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="inline-flex items-center text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {cot.numero}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  cot.estado === 'seleccionada' ? 'bg-green-100 text-green-800' :
                  cot.estado === 'rechazada' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {cot.estado_display}
                </span>
              </div>
              
              <h4 className="font-semibold text-gray-900 flex items-center mb-1">
                <BuildingStorefrontIcon className="h-4 w-4 mr-1 text-gray-400" />
                {cot.proveedor_nombre}
              </h4>
              
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(cot.subtotal)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-gray-500">IVA:</span>
                  <span className="font-medium">{formatCurrency(cot.iva)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-gray-700">Total:</span>
                  <span className="text-primary-700 text-base">{formatCurrency(cot.total)}</span>
                </div>
              </div>
              
              <div className="mt-5 flex justify-between items-center pt-3 border-t">
                {cot.documento ? (
                  <a href={cot.documento} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:text-primary-800 font-medium hover:underline">
                    Ver PDF
                  </a>
                ) : (
                  <span className="text-sm text-gray-400">Sin PDF</span>
                )}

                {/* Si la solicitud está en cotización o cotizado, se puede seleccionar */}
                {['en_cotizacion', 'cotizado'].includes(estadoSolicitud) && cot.estado !== 'seleccionada' && (isAdquisiciones || isAdmin) && (
                  <Button 
                    size="sm" 
                    variant="primary" 
                    onClick={() => handleSelect(cot.id)}
                    loading={selecting === cot.id}
                    disabled={selecting !== null}
                  >
                    Elegir
                  </Button>
                )}

                {cot.estado === 'seleccionada' && (
                  <div className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                    <CheckCircleIcon className="h-5 w-5 mr-1" /> Ganadora
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
