import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  PencilIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import { quotationService, Cotizacion } from '@/services/quotationService'
import { documentService } from '@/services/documentService'
import { useAuthStore } from '@/stores/authStore'

const estadoColors: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  recibida: 'bg-blue-100 text-blue-800',
  seleccionada: 'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
}

export default function CotizacionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    if (id) {
      loadCotizacion(id)
    }
  }, [id])

  const loadCotizacion = async (cotizacionId: string) => {
    setLoading(true)
    try {
      const data = await quotationService.getCotizacion(Number(cotizacionId))
      setCotizacion(data)
    } catch (error) {
      toast.error('Error al cargar la cotización')
      navigate('/cotizaciones')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    navigate(`/cotizaciones/${id}/editar`)
  }

  const handleSelect = async () => {
    if (!cotizacion) return
    
    if (!confirm('¿Está seguro de AUTORIZAR esta cotización como ganadora? Las demás cotizaciones de esta solicitud serán rechazadas automáticamente.')) return
    
    try {
      await quotationService.selectCotizacion(cotizacion.id)
      toast.success('Cotización autorizada correctamente')
      loadCotizacion(id!)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al autorizar')
    }
  }

  const handleGenerarPdf = async () => {
    if (!cotizacion) return
    setGeneratingPdf(true)
    try {
      const documentId = await documentService.generateCotizacionPdf(cotizacion.id)
      if (documentId) {
        await documentService.downloadPdf(documentId, `Cotizacion_${cotizacion.numero}.pdf`)
      } else {
        toast.success('PDF en proceso. El documento estará disponible en breve.')
      }
    } catch (error) {
      toast.error('Error al generar el PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleCreateOrder = async () => {
    if (!cotizacion) return
    
    if (!confirm('¿Desea generar la Orden de Compra basada en esta cotización autorizada?')) return
    
    try {
      const order = await quotationService.createOrder(cotizacion.id)
      toast.success('Orden de compra generada correctamente')
      navigate(`/ordenes/${order.id}`)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al generar orden')
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

  if (!cotizacion) {
    return null
  }

  const canEdit = cotizacion.estado === 'pendiente' && ['admin', 'adquisiciones', 'proveedor'].includes(user?.role || '')
  // Tesorería autoriza/selecciona la cotización ganadora
  const canSelect = cotizacion.estado === 'pendiente' && ['admin', 'tesoreria'].includes(user?.role || '')
  // Adquisiciones genera OC desde cotización autorizada
  const canCreateOrder = cotizacion.estado === 'seleccionada' && ['admin', 'adquisiciones'].includes(user?.role || '')

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/cotizaciones')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-1" />
        Volver a cotizaciones
      </button>

      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {cotizacion.numero}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Fecha: {formatDate(cotizacion.fecha)}
              </p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${estadoColors[cotizacion.estado] || 'bg-gray-100 text-gray-800'}`}>
              {cotizacion.estado_display}
            </span>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Información general */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Solicitud</h3>
                <p className="mt-1 text-lg font-medium text-primary-600">
                  {cotizacion.solicitud_numero}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Proveedor</h3>
                <p className="mt-1 text-lg">{cotizacion.proveedor_nombre}</p>
              </div>
              
              {cotizacion.tiempo_entrega && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Tiempo de Entrega</h3>
                  <p className="mt-1">{cotizacion.tiempo_entrega}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {cotizacion.vigencia && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Vigencia</h3>
                  <p className="mt-1">{formatDate(cotizacion.vigencia)}</p>
                </div>
              )}
              
              {cotizacion.condiciones_pago && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Condiciones de Pago</h3>
                  <p className="mt-1">{cotizacion.condiciones_pago}</p>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Total</h3>
                <p className="mt-1 text-2xl font-bold text-primary-600">
                  {formatCurrency(cotizacion.total)}
                </p>
              </div>
            </div>
          </div>

          {/* Documento adjunto */}
          {cotizacion.documento && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Documento adjunto</h3>
              <a
                href={cotizacion.documento}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary-600 hover:text-primary-700"
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Ver documento
              </a>
            </div>
          )}

          {/* Detalle de productos */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Detalle de Productos</h3>
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cotizacion.detalles?.map((detalle, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {detalle.concepto}
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
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-primary-600">
                      {formatCurrency(cotizacion.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notas */}
          {cotizacion.notas && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Notas</h3>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                {cotizacion.notas}
              </p>
            </div>
          )}

          {/* Acciones */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="secondary" onClick={handleGenerarPdf} loading={generatingPdf}>
              <PrinterIcon className="h-5 w-5 mr-2" />
              Generar PDF
            </Button>

            {canEdit && (
              <Button variant="secondary" onClick={handleEdit}>
                <PencilIcon className="h-5 w-5 mr-2" />
                Editar
              </Button>
            )}
            
            {canSelect && (
              <Button onClick={handleSelect}>
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Autorizar Cotización
              </Button>
            )}

            {canCreateOrder && !cotizacion.tiene_orden && (
              <Button onClick={handleCreateOrder}>
                <ShoppingCartIcon className="h-5 w-5 mr-2" />
                Generar Orden de Compra
              </Button>
            )}

            {cotizacion.tiene_orden && cotizacion.estado === 'seleccionada' && (
              <Button variant="secondary" disabled>
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Orden ya generada
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
