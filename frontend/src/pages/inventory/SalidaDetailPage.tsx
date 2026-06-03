import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { inventoryService, SalidaBienes } from '../../services/inventoryService'
import { documentService } from '../../services/documentService'
import Button from '../../components/ui/Button'

export default function SalidaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [salida, setSalida] = useState<SalidaBienes | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    if (id) {
      loadSalida()
    }
  }, [id])

  const loadSalida = async () => {
    try {
      setLoading(true)
      const data = await inventoryService.getSalida(Number(id))
      setSalida(data)
    } catch (err) {
      setError('Error al cargar la salida')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerarPdf = async () => {
    if (!salida) return
    setGeneratingPdf(true)
    try {
      const documentId = await documentService.generateSalidaPdf(salida.id)
      if (documentId) {
        await documentService.downloadPdf(documentId, `Salida_${salida.numero}.pdf`)
      } else {
        toast.success('PDF en proceso. El documento estará disponible en breve.')
      }
    } catch (err) {
      toast.error('Error al generar el PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleConfirm = async () => {
    if (!salida || !confirm('¿Confirmar la recepción de estos materiales?')) return

    try {
      setActionLoading(true)
      await inventoryService.confirmSalida(salida.id)
      await loadSalida()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setError(error.response?.data?.error || 'Error al confirmar')
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!salida) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          Salida no encontrada
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{salida.numero}</h1>
          <p className="text-gray-600">Salida de Bienes</p>
        </div>
        <div className="flex gap-2">
          {!salida.confirmada && (
            <Button
              onClick={handleConfirm}
              loading={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              Confirmar Recepción
            </Button>
          )}
          <Button variant="secondary" onClick={handleGenerarPdf} loading={generatingPdf}>
            Generar PDF
          </Button>
          <Button variant="secondary" onClick={() => navigate('/inventario/salidas')}>
            Volver
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Información General */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Información General</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <label className="text-sm text-gray-500">Número</label>
              <p className="font-medium">{salida.numero}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Almacén Origen</label>
              <p className="font-medium">{salida.almacen_nombre}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Área Destino</label>
              <p className="font-medium">{salida.destino_nombre}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Fecha</label>
              <p className="font-medium">
                {new Date(salida.fecha).toLocaleString('es-MX')}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Estado</label>
              <p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  salida.confirmada 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {salida.confirmada ? 'Confirmada' : 'Pendiente de Confirmación'}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Responsable</label>
              <p className="font-medium">{salida.responsable_nombre}</p>
            </div>
            {salida.confirmada && (
              <>
                <div>
                  <label className="text-sm text-gray-500">Confirmada Por</label>
                  <p className="font-medium">{salida.confirmada_por || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Fecha Confirmación</label>
                  <p className="font-medium">
                    {salida.fecha_confirmacion 
                      ? new Date(salida.fecha_confirmacion).toLocaleString('es-MX')
                      : '-'}
                  </p>
                </div>
              </>
            )}
            <div>
              <label className="text-sm text-gray-500">Referencia</label>
              <p className="font-medium">{salida.referencia || '-'}</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-500">Notas</label>
              <p className="font-medium">{salida.notas || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detalles */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Materiales Entregados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unidad</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salida.detalles.map((detalle, index) => (
                <tr key={detalle.id || index}>
                  <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {detalle.material}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {detalle.descripcion || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-center font-medium">
                    {detalle.cantidad}
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    {detalle.unidad}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
