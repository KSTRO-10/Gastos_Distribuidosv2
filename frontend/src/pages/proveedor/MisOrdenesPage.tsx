import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  ShoppingCartIcon,
  EyeIcon,
  CheckCircleIcon,
  TruckIcon,
  ClockIcon,
  XCircleIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline'
import { Button, Card, Input } from '@/components/ui'
import { proveedorPortalService } from '@/services/proveedorPortalService'
import { OrdenCompra } from '@/services/orderService'

const estadoColors: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-800',
  enviada: 'bg-blue-100 text-blue-800',
  confirmada: 'bg-purple-100 text-purple-800',
  parcial: 'bg-yellow-100 text-yellow-800',
  entregada: 'bg-green-100 text-green-800',
  cancelada: 'bg-red-100 text-red-800',
}

const estadoIcons: Record<string, React.ElementType> = {
  borrador: ClockIcon,
  enviada: ShoppingCartIcon,
  confirmada: CheckCircleIcon,
  parcial: TruckIcon,
  entregada: DocumentCheckIcon,
  cancelada: XCircleIcon,
}

export default function MisOrdenesPage() {
  const navigate = useNavigate()
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [referenciaExterna, setReferenciaExterna] = useState('')
  const [modalOrden, setModalOrden] = useState<OrdenCompra | null>(null)

  const loadOrdenes = async (controller?: AbortController) => {
    setLoading(true)
    try {
      const data = await proveedorPortalService.getMisOrdenes()
      if (!controller || !controller.signal.aborted) {
        setOrdenes(data)
      }
    } catch (error: any) {
      if (!controller || !controller.signal.aborted) {
        toast.dismiss('mis-ordenes-error')
        toast.error('Error al cargar órdenes', { id: 'mis-ordenes-error' })
        setOrdenes([])
      }
    } finally {
      if (!controller || !controller.signal.aborted) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadOrdenes(controller)
    return () => {
      controller.abort()
      toast.dismiss('mis-ordenes-error')
    }
  }, [])

  const handleConfirmar = async () => {
    if (!modalOrden) return
    
    setConfirmando(modalOrden.id)
    try {
      await proveedorPortalService.confirmarOrden(modalOrden.id, referenciaExterna)
      toast.success('Orden confirmada exitosamente')
      setModalOrden(null)
      setReferenciaExterna('')
      loadOrdenes()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al confirmar orden')
    } finally {
      setConfirmando(null)
    }
  }

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0)
  }

  const ordenesFiltradas = filtroEstado
    ? ordenes.filter(o => o.estado === filtroEstado)
    : ordenes

  // Estadísticas
  const stats = {
    total: ordenes.length,
    nuevas: ordenes.filter(o => o.estado === 'enviada').length,
    confirmadas: ordenes.filter(o => o.estado === 'confirmada').length,
    entregadas: ordenes.filter(o => o.estado === 'entregada').length,
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
      {/* Modal de confirmación */}
      {modalOrden && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar Orden</h3>
            <p className="text-gray-600 mb-4">
              ¿Confirma que acepta la orden <span className="font-medium">{modalOrden.numero}</span> por un total de <span className="font-medium">{formatCurrency(modalOrden.total)}</span>?
            </p>
            
            <Input
              label="Referencia Externa (opcional)"
              value={referenciaExterna}
              onChange={(e) => setReferenciaExterna(e.target.value)}
              placeholder="Ej: Número de pedido interno"
              className="mb-4"
            />
            
            <p className="text-sm text-gray-500 mb-4">
              Al confirmar, se compromete a entregar los productos en la fecha acordada.
            </p>
            
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setModalOrden(null)
                  setReferenciaExterna('')
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmar}
                disabled={confirmando !== null}
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                {confirmando ? 'Confirmando...' : 'Confirmar Orden'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/portal')}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Mis Órdenes de Compra</h1>
            <p className="text-gray-500">Órdenes asignadas a su empresa</p>
          </div>
        </div>
      </div>

      {/* Alerta de órdenes nuevas */}
      {stats.nuevas > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <ShoppingCartIcon className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">
                Tiene {stats.nuevas} orden{stats.nuevas > 1 ? 'es' : ''} nueva{stats.nuevas > 1 ? 's' : ''} por confirmar
              </p>
              <p className="text-sm text-blue-700">
                Revise y confirme las órdenes para iniciar el proceso de entrega.
              </p>
            </div>
          </div>
        </div>
      )}

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
          className={`p-4 cursor-pointer transition-all ${filtroEstado === 'enviada' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setFiltroEstado(filtroEstado === 'enviada' ? '' : 'enviada')}
        >
          <p className="text-sm text-gray-500">Por Confirmar</p>
          <p className="text-2xl font-semibold text-blue-600">{stats.nuevas}</p>
        </Card>
        <Card 
          className={`p-4 cursor-pointer transition-all ${filtroEstado === 'confirmada' ? 'ring-2 ring-purple-500' : ''}`}
          onClick={() => setFiltroEstado(filtroEstado === 'confirmada' ? '' : 'confirmada')}
        >
          <p className="text-sm text-gray-500">Confirmadas</p>
          <p className="text-2xl font-semibold text-purple-600">{stats.confirmadas}</p>
        </Card>
        <Card 
          className={`p-4 cursor-pointer transition-all ${filtroEstado === 'entregada' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setFiltroEstado(filtroEstado === 'entregada' ? '' : 'entregada')}
        >
          <p className="text-sm text-gray-500">Entregadas</p>
          <p className="text-2xl font-semibold text-green-600">{stats.entregadas}</p>
        </Card>
      </div>

      {/* Lista de órdenes */}
      {ordenesFiltradas.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingCartIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {ordenes.length === 0 ? 'No hay órdenes asignadas' : 'No hay órdenes con este filtro'}
          </h3>
          <p className="text-gray-500">
            {ordenes.length === 0 
              ? 'Aún no tiene órdenes de compra asignadas. Cuando gane una cotización, recibirá una orden.'
              : 'Pruebe cambiando el filtro para ver otras órdenes.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {ordenesFiltradas.map((orden) => {
            const IconEstado = estadoIcons[orden.estado] || ClockIcon
            const puedeConfirmar = orden.estado === 'enviada'
            
            return (
              <Card key={orden.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${estadoColors[orden.estado]}`}>
                      <IconEstado className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{orden.numero}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${estadoColors[orden.estado]}`}>
                          {orden.estado_display}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>Emisión: {orden.fecha_emision}</span>
                        {orden.fecha_entrega_esperada && (
                          <span className="text-orange-600 font-medium">
                            Entrega: {orden.fecha_entrega_esperada}
                          </span>
                        )}
                      </div>
                      {orden.referencia_externa && (
                        <p className="text-xs text-gray-400 mt-1">
                          Ref: {orden.referencia_externa}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(orden.total)}</p>
                    <div className="flex items-center gap-2 mt-2 justify-end">
                      <Link
                        to={`/portal/ordenes/${orden.id}`}
                        className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800"
                      >
                        <EyeIcon className="h-4 w-4" />
                        Ver detalle
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Botón de confirmar si está pendiente */}
                {puedeConfirmar && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <p className="text-sm text-blue-700">
                      Esta orden está pendiente de confirmación.
                    </p>
                    <Button 
                      size="sm"
                      onClick={() => setModalOrden(orden)}
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      Confirmar Orden
                    </Button>
                  </div>
                )}

                {/* Detalles de productos */}
                {orden.detalles && orden.detalles.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Productos ({orden.detalles.length})</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {orden.detalles.slice(0, 4).map((det, idx) => (
                        <div key={idx} className="text-sm bg-gray-50 px-3 py-2 rounded">
                          <span className="text-gray-900">{det.concepto}</span>
                          <span className="text-gray-500 ml-2">x{det.cantidad} {det.unidad}</span>
                        </div>
                      ))}
                      {orden.detalles.length > 4 && (
                        <div className="text-sm text-gray-500 px-3 py-2">
                          +{orden.detalles.length - 4} más...
                        </div>
                      )}
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
