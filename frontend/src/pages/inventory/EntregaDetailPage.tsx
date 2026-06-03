import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { inventoryService, EntregaBienes, EvidenciaEntrega } from '../../services/inventoryService'
import { documentService } from '../../services/documentService'
import Button from '../../components/ui/Button'

export default function EntregaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [entrega, setEntrega] = useState<EntregaBienes | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    if (id) {
      loadEntrega()
    }
  }, [id])

  const loadEntrega = async () => {
    try {
      setLoading(true)
      const data = await inventoryService.getEntrega(Number(id))
      setEntrega(data)
    } catch (err) {
      setError('Error al cargar la entrega')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerarPdf = async () => {
    if (!entrega) return
    setGeneratingPdf(true)
    try {
      const documentId = await documentService.generateEntregaPdf(entrega.id)
      if (documentId) {
        await documentService.downloadPdf(documentId, `Entrega_${entrega.numero}.pdf`)
      } else {
        toast.success('PDF en proceso. El documento estará disponible en breve.')
      }
    } catch (err) {
      toast.error('Error al generar el PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !entrega) return

    try {
      setUploading(true)
      await inventoryService.uploadEvidence(entrega.id, file, 'Evidencia de recepción')
      await loadEntrega()
    } catch (err) {
      setError('Error al subir la imagen')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!entrega) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          Entrega no encontrada
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{entrega.numero}</h1>
          <p className="text-gray-600">Entrega de Bienes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleGenerarPdf} loading={generatingPdf}>
            Generar PDF
          </Button>
          <Button variant="secondary" onClick={() => navigate('/inventario/entregas')}>
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
              <p className="font-medium">{entrega.numero}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Orden de Compra</label>
              <p className="font-medium">
                <Link
                  to={`/ordenes/${entrega.orden}`}
                  className="text-blue-600 hover:underline"
                >
                  {entrega.orden_numero}
                </Link>
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Fecha Recepción</label>
              <p className="font-medium">
                {new Date(entrega.fecha_recepcion).toLocaleString('es-MX')}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Estado</label>
              <p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${entrega.completa
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  {entrega.completa ? 'Completa' : 'Parcial'}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Recibido Por</label>
              <p className="font-medium">{entrega.recibido_por_nombre}</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-500">Notas</label>
              <p className="font-medium">{entrega.notas || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detalles de la Entrega */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Detalle de Bienes Recibidos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad Recibida</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Condición</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entrega.detalles.map((detalle, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {detalle.concepto || `Detalle #${detalle.detalle_orden}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-center font-medium">
                    {Number(detalle.cantidad_recibida).toString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${detalle.condicion_buena
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                      }`}>
                      {detalle.condicion_buena ? 'Buena' : 'Dañado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {detalle.notas || detalle.observaciones_condicion || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidencias */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Evidencias Fotográficas</h2>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadEvidence}
              accept="image/*"
              className="hidden"
              title="Seleccionar imagen"
            />
            <Button
              variant="secondary"
              loading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              📷 Subir Evidencia
            </Button>
          </div>
        </div>
        <div className="p-6">
          {entrega.evidencias.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay evidencias registradas</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {entrega.evidencias.map((evidencia: EvidenciaEntrega) => (
                <div key={evidencia.id} className="relative">
                  <img
                    src={evidencia.imagen}
                    alt={evidencia.descripcion}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {evidencia.descripcion || new Date(evidencia.created_at).toLocaleDateString('es-MX')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
