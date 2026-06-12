import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import ConfirmModal from '../../components/ui/ConfirmModal'
import EstadoBadge from '../../components/inventory/EstadoBadge'
import { devolucionesService } from '../../services/devolucionesService'
import { IDevolucionInterna } from '../../types/inventory'
import { useAuthStore } from '../../stores/authStore'

export default function DevolucionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [data, setData] = useState<IDevolucionInterna | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchDetail = async () => {
    try {
      setLoading(true)
      const result = await devolucionesService.getDevolucion(Number(id))
      setData(result)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar la devolución.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchDetail()
  }, [id])

  const handleConfirm = async () => {
    try {
      setIsProcessing(true)
      await devolucionesService.confirmarRecepcion(Number(id))
      toast.success('Recepción física confirmada. El stock ha sido actualizado.')
      setIsConfirmOpen(false)
      fetchDetail() // Recargar datos para ver el estado completado
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Hubo un error al confirmar la devolución.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando detalles...</div>
  if (error || !data) return <div className="p-8 text-center text-red-600">{error || 'No encontrado'}</div>

  // Lógica de negocio: Solo los almacenistas (o admin) pueden confirmar la recepción física.
  const canConfirm = data.estado === 'pendiente' && (user?.role === 'almacen' || user?.role === 'admin')

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={`Devolución ${data.numero}`}
        subtitle="Detalles del retorno de materiales"
        icon={<ArrowLeftIcon className="h-6 w-6 cursor-pointer" onClick={() => navigate('/inventario/devoluciones')} />}
        actions={
          canConfirm ? (
            <Button
              onClick={() => setIsConfirmOpen(true)}
              variant="primary"
            >
              <CheckCircleIcon className="h-5 w-5 mr-2" /> Recibir Devolución
            </Button>
          ) : null
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Estado</h4>
            <div className="mt-1"><EstadoBadge estado={data.estado} /></div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Fecha Solicitud</h4>
            <div className="mt-1 text-sm text-gray-900">{new Date(data.fecha_solicitud).toLocaleString()}</div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Área Origen</h4>
            <div className="mt-1 text-sm text-gray-900">{data.area_origen_nombre}</div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Almacén Destino</h4>
            <div className="mt-1 text-sm text-gray-900">{data.almacen_destino_nombre}</div>
          </div>
        </div>

        {data.notas && (
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-500 mb-1">Notas</h4>
            <p className="text-sm text-gray-800">{data.notas}</p>
          </div>
        )}

        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Artículos Devueltos</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-100 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artículo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.detalles.map((detalle) => (
                  <tr key={detalle.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {detalle.articulo_nombre}
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
        
        {data.recibido_por_nombre && (
          <div className="px-6 py-4 bg-green-50 border-t border-green-100 text-sm text-green-800">
            <strong>Recibido por:</strong> {data.recibido_por_nombre} el {new Date(data.fecha_recepcion!).toLocaleString()}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Confirmar Recepción de Artículos"
        message="¿Estás seguro de que tienes los artículos físicos en tu poder? Esta acción aumentará el stock del almacén de manera definitiva y cerrará la devolución."
        confirmText="Sí, he recibido el material"
        type="info"
        isLoading={isProcessing}
      />
    </div>
  )
}
