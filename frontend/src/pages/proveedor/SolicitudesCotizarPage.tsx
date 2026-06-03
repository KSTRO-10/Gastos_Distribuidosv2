import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { Button, Card } from '@/components/ui'
import { proveedorPortalService, SolicitudParaCotizar } from '@/services/proveedorPortalService'

export default function SolicitudesCotizarPage() {
  const navigate = useNavigate()
  const [solicitudes, setSolicitudes] = useState<SolicitudParaCotizar[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SolicitudParaCotizar | null>(null)

  useEffect(() => {
    loadSolicitudes()
  }, [])

  const loadSolicitudes = async () => {
    try {
      const data = await proveedorPortalService.getSolicitudesParaCotizar()
      setSolicitudes(data)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cargar solicitudes')
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/portal')}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Solicitudes Abiertas para Cotizar</h1>
            <p className="text-gray-500">Seleccione una solicitud para enviar su cotización</p>
          </div>
        </div>
      </div>

      {solicitudes.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardDocumentListIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay solicitudes abiertas</h3>
          <p className="text-gray-500">
            Actualmente no hay solicitudes disponibles para cotizar. 
            Revise más tarde o contacte al área de adquisiciones.
          </p>
          <Link to="/portal">
            <Button variant="outline" className="mt-4">
              Volver al Dashboard
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de solicitudes */}
          <div className="space-y-4">
            {solicitudes.map((sol) => (
              <Card
                key={sol.id}
                className={`p-4 cursor-pointer transition-all ${
                  selected?.id === sol.id 
                    ? 'ring-2 ring-primary-500 bg-primary-50' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelected(sol)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{sol.numero}</h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {sol.detalles.length} items
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {sol.descripcion || 'Sin descripción'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Área: {sol.area}</span>
                      <span>Fecha: {sol.fecha_solicitud}</span>
                      {sol.fecha_requerida && (
                        <span className="text-red-600">Requerido: {sol.fecha_requerida}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-gray-900">{formatCurrency(sol.total_estimado)}</p>
                    <p className="text-xs text-gray-500">Estimado</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Detalle de solicitud seleccionada */}
          <div>
            {selected ? (
              <Card className="sticky top-4">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{selected.numero}</h3>
                      <p className="text-sm text-gray-500">{selected.area}</p>
                    </div>
                    <Link to={`/portal/cotizar/${selected.id}`}>
                      <Button>
                        <DocumentPlusIcon className="h-4 w-4 mr-2" />
                        Cotizar
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Descripción</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {selected.descripcion || 'Sin descripción adicional'}
                  </p>

                  <h4 className="font-medium text-gray-900 mb-3">Materiales Solicitados</h4>
                  <div className="space-y-3">
                    {selected.detalles.map((det, idx) => (
                      <div key={det.id || idx} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{det.concepto}</p>
                            {det.descripcion && (
                              <p className="text-sm text-gray-500 mt-1">{det.descripcion}</p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm font-medium text-gray-900">
                              {det.cantidad} {det.unidad}
                            </p>
                            <p className="text-xs text-gray-500">
                              Est: {formatCurrency(det.precio_estimado)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Estimado:</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(selected.total_estimado)}
                      </span>
                    </div>
                    {selected.fecha_requerida && (
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-gray-500">Fecha Requerida:</span>
                        <span className="font-medium text-red-600">{selected.fecha_requerida}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <EyeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Seleccione una solicitud para ver sus detalles
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
