import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  PencilIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  PrinterIcon,
  XMarkIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import { orderService, OrdenCompra } from '@/services/orderService'
import { documentService } from '@/services/documentService'
import { useAuthStore } from '@/stores/authStore'

const estadoColors: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-800',
  enviada: 'bg-blue-100 text-blue-800',
  confirmada: 'bg-purple-100 text-purple-800',
  parcial: 'bg-yellow-100 text-yellow-800',
  entregada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
}

export default function OrdenDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [orden, setOrden] = useState<OrdenCompra | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingAutPdf, setDownloadingAutPdf] = useState(false)

  useEffect(() => {
    if (id) {
      loadOrden(id)
    }
  }, [id])

  const loadOrden = async (ordenId: string) => {
    setLoading(true)
    try {
      const data = await orderService.getOrden(Number(ordenId))
      setOrden(data)
    } catch (error) {
      toast.error('Error al cargar la orden')
      if (user?.role === 'proveedor') {
        navigate('/portal/ordenes')
      } else {
        navigate('/ordenes')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    navigate(`/ordenes/${id}/editar`)
  }

  const handleSend = async () => {
    if (!orden) return
    if (!confirm('¿Está seguro de enviar esta orden al proveedor?')) return

    try {
      await orderService.sendOrden(orden.id)
      toast.success('Orden enviada al proveedor')
      loadOrden(id!)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al enviar')
    }
  }

  const handleConfirm = async () => {
    if (!orden) return
    if (!confirm('¿Confirmar que el proveedor ha aceptado la orden?')) return

    try {
      await orderService.confirmOrden(orden.id)
      toast.success('Orden confirmada por el proveedor')
      loadOrden(id!)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al confirmar')
    }
  }

  const handleCancel = async () => {
    if (!orden) return
    if (!confirm('¿Está seguro de cancelar esta orden de compra?')) return

    try {
      await orderService.cancelOrden(orden.id)
      toast.success('Orden cancelada')
      loadOrden(id!)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al cancelar')
    }
  }

  const handleDescargarPdf = async () => {
    if (!orden) return
    setDownloadingPdf(true)
    try {
      const documentId = await documentService.generateOrdenCompraPdf(orden.id)
      if (documentId) {
        await documentService.downloadPdf(documentId, `OrdenCompra_${orden.numero}.pdf`)
      } else {
        toast.success('PDF en proceso. El documento estará disponible en breve.')
      }
    } catch (error) {
      toast.error('Error al generar el PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleDescargarAutorizacionPdf = async () => {
    if (!orden || !orden.autorizacion) return
    setDownloadingAutPdf(true)
    try {
      const documentId = await documentService.generateAutorizacionPdf(orden.autorizacion)
      if (documentId) {
        await documentService.downloadPdf(documentId, `Autorizacion_${orden.numero}.pdf`)
      } else {
        toast.success('PDF en proceso. El documento estará disponible en breve.')
      }
    } catch (error) {
      toast.error('Error al generar el PDF de autorización')
    } finally {
      setDownloadingAutPdf(false)
    }
  }


  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '$0.00'
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!orden) {
    return null
  }

  const canEdit = orden.estado === 'borrador' && ['admin', 'adquisiciones'].includes(user?.role || '')
  const canSend = orden.estado === 'borrador' && ['admin', 'adquisiciones'].includes(user?.role || '')
  const canConfirm = orden.estado === 'enviada' && ['admin', 'adquisiciones', 'proveedor'].includes(user?.role || '')
  const canCancel = ['borrador', 'enviada'].includes(orden.estado) && ['admin', 'adquisiciones'].includes(user?.role || '')

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={() => {
          if (user?.role === 'proveedor') {
            navigate('/portal/ordenes')
          } else {
            navigate('/ordenes')
          }
        }}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-1" />
        Volver a órdenes
      </button>

      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Orden de Compra {orden.numero}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Emitida el {formatDate(orden.fecha_emision)}
              </p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${estadoColors[orden.estado] || 'bg-gray-100 text-gray-800'}`}>
              {orden.estado_display}
            </span>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Información general */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Proveedor</h3>
                <p className="mt-1 text-lg font-medium">{orden.proveedor_nombre}</p>
              </div>

              {orden.fecha_entrega_esperada && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Fecha de Entrega Esperada</h3>
                  <p className="mt-1">{formatDate(orden.fecha_entrega_esperada)}</p>
                </div>
              )}

              {orden.condiciones_pago && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Condiciones de Pago</h3>
                  <p className="mt-1">{orden.condiciones_pago}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-primary-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Totales</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(orden.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IVA (16%):</span>
                    <span>{formatCurrency(orden.iva)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-primary-600 pt-2 border-t">
                    <span>Total:</span>
                    <span>{formatCurrency(orden.total)}</span>
                  </div>
                </div>
              </div>

              {orden.referencia_externa && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Referencia Externa</h3>
                  <p className="mt-1">{orden.referencia_externa}</p>
                </div>
              )}
            </div>
          </div>

          {/* Lugar de entrega */}
          {orden.lugar_entrega && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Lugar de Entrega</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                {orden.lugar_entrega}
              </p>
            </div>
          )}

          {/* Detalle de productos */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Detalle de la Orden</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Concepto
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidad
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P. Unitario
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subtotal
                    </th>
                    {['confirmada', 'parcial', 'entregada'].includes(orden.estado) && (
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recibido
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orden.detalles?.map((detalle, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{detalle.concepto}</p>
                          {detalle.descripcion && (
                            <p className="text-gray-500 text-xs">{detalle.descripcion}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">
                        {detalle.unidad}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">
                        {detalle.cantidad}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {formatCurrency(detalle.precio_unitario)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(detalle.subtotal)}
                      </td>
                      {['confirmada', 'parcial', 'entregada'].includes(orden.estado) && (
                        <td className="px-4 py-3 text-sm text-center">
                          <span className={detalle.cantidad_pendiente === 0 ? 'text-green-600' : 'text-yellow-600'}>
                            {detalle.cantidad_recibida || 0} / {detalle.cantidad}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-primary-600">
                      {formatCurrency(orden.total)}
                    </td>
                    {['confirmada', 'parcial', 'entregada'].includes(orden.estado) && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notas */}
          {orden.notas && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Notas</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                {orden.notas}
              </p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            {orden.autorizacion && (
              <Button variant="secondary" onClick={handleDescargarAutorizacionPdf} loading={downloadingAutPdf}>
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Descargar Autorización
              </Button>
            )}

            <Button variant="secondary" onClick={handleDescargarPdf} loading={downloadingPdf}>
              <PrinterIcon className="h-5 w-5 mr-2" />
              Descargar PDF
            </Button>

            {canEdit && (
              <Button variant="secondary" onClick={handleEdit}>
                <PencilIcon className="h-5 w-5 mr-2" />
                Editar
              </Button>
            )}

            {canCancel && (
              <Button variant="danger" onClick={handleCancel}>
                <XMarkIcon className="h-5 w-5 mr-2" />
                Cancelar Orden
              </Button>
            )}

            {canSend && (
              <Button onClick={handleSend}>
                <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                Enviar a Proveedor
              </Button>
            )}

            {canConfirm && (
              <Button onClick={handleConfirm}>
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Confirmar Orden
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
