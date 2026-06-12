import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import ConfirmModal from '../../components/ui/ConfirmModal'
import EstadoBadge from '../../components/inventory/EstadoBadge'
import { ajustesService } from '../../services/ajustesService'
import { IAjusteInventario } from '../../types/inventory'
import { useAuthStore } from '../../stores/authStore'

export default function AjusteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [data, setData] = useState<IAjusteInventario | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchDetail = async () => {
    try {
      setLoading(true)
      const result = await ajustesService.getAjuste(Number(id))
      setData(result)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar el ajuste.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchDetail()
  }, [id])

  const handleApprove = async () => {
    try {
      setIsProcessing(true)
      await ajustesService.aprobarAjuste(Number(id))
      toast.success('Ajuste autorizado exitosamente. Los inventarios han sido actualizados.')
      setIsConfirmOpen(false)
      fetchDetail()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Hubo un error al autorizar el ajuste.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando detalles...</div>
  if (error || !data) return <div className="p-8 text-center text-red-600">{error || 'No encontrado'}</div>

  // Lógica de negocio: Solo Administradores autorizan ajustes de inventario que están pendientes
  const canApprove = data.estado === 'pendiente' && user?.role === 'admin'

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={`Ajuste ${data.numero}`}
        subtitle="Reporte de merma o diferencia de stock"
        icon={<ArrowLeftIcon className="h-6 w-6 cursor-pointer" onClick={() => navigate('/inventario/ajustes')} />}
        actions={
          canApprove ? (
            <Button
              onClick={() => setIsConfirmOpen(true)}
              variant="primary"
            >
              <CheckBadgeIcon className="h-5 w-5 mr-2" /> Aprobar Ajuste
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda: Detalles del Documento */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Estado</h4>
                <div className="mt-1"><EstadoBadge estado={data.estado} /></div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Fecha de Reporte</h4>
                <div className="mt-1 text-sm text-gray-900">{new Date(data.fecha_solicitud).toLocaleString()}</div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Almacén</h4>
                <div className="mt-1 text-sm text-gray-900">{data.almacen_nombre}</div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Motivo General</h4>
                <div className="mt-1 text-sm font-medium text-gray-900 capitalize">{data.motivo_general}</div>
              </div>
              <div className="col-span-2">
                <h4 className="text-sm font-medium text-gray-500">Solicitante</h4>
                <div className="mt-1 text-sm text-gray-900">{data.solicitante_nombre}</div>
              </div>
            </div>

            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-500 mb-1">Justificación Detallada</h4>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{data.justificacion}</p>
            </div>

            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Artículos Afectados</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-100 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artículo</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tipo de Ajuste</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.detalles.map((detalle) => (
                      <tr key={detalle.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {detalle.articulo_nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            detalle.tipo === 'suma' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {detalle.tipo === 'suma' ? 'Suma (+)' : 'Resta (-)'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {detalle.cantidad}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {data.autorizador_nombre && (
              <div className="px-6 py-4 bg-blue-50 border-t border-blue-100 text-sm text-blue-800 flex items-center">
                <CheckBadgeIcon className="h-5 w-5 mr-2" />
                <span>
                  <strong>Autorizado por:</strong> {data.autorizador_nombre} el {new Date(data.fecha_autorizacion!).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Evidencia */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900">Evidencia Fotográfica</h3>
            </div>
            <div className="p-4 flex items-center justify-center min-h-[200px] bg-gray-100">
              {data.evidencia ? (
                <a href={data.evidencia} target="_blank" rel="noreferrer" className="block max-w-full">
                  <img 
                    src={data.evidencia} 
                    alt="Evidencia del ajuste" 
                    className="max-h-64 object-contain rounded border border-gray-300 shadow-sm hover:opacity-90 transition-opacity"
                  />
                </a>
              ) : (
                <p className="text-sm text-gray-500 text-center">No se adjuntó evidencia para este reporte.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleApprove}
        title="Autorizar Ajuste de Inventario"
        message="¿Estás seguro de que deseas autorizar este movimiento? Esto modificará permanentemente los niveles de inventario físicos en el sistema y generará registros contables de pérdida o ganancia."
        confirmText="Sí, autorizar"
        type="warning"
        isLoading={isProcessing}
      />
    </div>
  )
}
