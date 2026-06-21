import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { 
  PlusIcon, 
  EyeIcon, 
  PaperAirplaneIcon,
  PrinterIcon
} from '@heroicons/react/24/outline'
import { Button, Table } from '@/components/ui'
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

export default function OrdenesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('todos')
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const isLoadingRef = React.useRef(false)

  const loadData = async (controller?: AbortController) => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    setLoading(true)
    try {
      const data = await orderService.getOrdenes()
      if (!controller || !controller.signal.aborted) {
        setOrdenes(data)
      }
    } catch (error: any) {
      if (!controller || !controller.signal.aborted) {
        if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
          toast.dismiss('ordenes-error')
          toast.error('Error al cargar las órdenes de compra', { id: 'ordenes-error' })
          setOrdenes([])
        }
      }
    } finally {
      isLoadingRef.current = false
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadData(controller)
    return () => {
      controller.abort()
      toast.dismiss('ordenes-error')
    }
  }, [])

  const handleCreate = () => {
    navigate('/ordenes/nueva')
  }

  const handleView = (orden: OrdenCompra) => {
    navigate(`/ordenes/${orden.id}`)
  }

  const handleSend = async (orden: OrdenCompra) => {
    if (!confirm('¿Está seguro de enviar esta orden al proveedor?')) return
    
    try {
      await orderService.sendOrden(orden.id)
      toast.success('Orden enviada correctamente')
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al enviar la orden')
    }
  }

  const handleDescargarPdf = async (e: React.MouseEvent, orden: OrdenCompra) => {
    e.stopPropagation()
    setDownloadingId(orden.id)
    try {
      await documentService.downloadOrdenCompraPdf(orden.id, orden.numero)
      toast.success('PDF descargado correctamente')
    } catch (error) {
      toast.error('Error al generar el PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return '$0.00'
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const filteredOrdenes = filter === 'todos' 
    ? ordenes 
    : ordenes.filter(o => o.estado === filter)

  const columns = [
    { 
      key: 'numero', 
      header: 'Número',
      render: (o: OrdenCompra) => (
        <span className="font-medium text-primary-600">{o.numero}</span>
      )
    },
    { 
      key: 'fecha_emision', 
      header: 'Fecha Emisión',
      render: (o: OrdenCompra) => formatDate(o.fecha_emision)
    },
    { key: 'proveedor_nombre', header: 'Proveedor' },
    {
      key: 'total',
      header: 'Total',
      render: (o: OrdenCompra) => (
        <span className="font-medium">{formatCurrency(o.total)}</span>
      )
    },
    { 
      key: 'fecha_entrega_esperada', 
      header: 'Entrega Esperada',
      render: (o: OrdenCompra) => o.fecha_entrega_esperada ? formatDate(o.fecha_entrega_esperada) : '-'
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (o: OrdenCompra) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoColors[o.estado] || 'bg-gray-100 text-gray-800'}`}>
          {o.estado_display}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (o: OrdenCompra) => (
        <div className="flex space-x-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleView(o) }}
            className="p-1 text-gray-500 hover:text-primary-600"
            title="Ver detalle"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
          
          {o.estado === 'borrador' && ['admin', 'adquisiciones'].includes(user?.role || '') && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSend(o) }}
              className="p-1 text-gray-500 hover:text-blue-600"
              title="Enviar al proveedor"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          )}
          
          <button
            onClick={(e) => handleDescargarPdf(e, o)}
            disabled={downloadingId === o.id}
            className={`p-1 ${downloadingId === o.id ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:text-blue-600'}`}
            title="Descargar PDF"
          >
            {downloadingId === o.id ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <PrinterIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      )
    }
  ]

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de Compra</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona las órdenes de compra a proveedores
          </p>
        </div>
        {['admin', 'adquisiciones'].includes(user?.role || '') && (
          <Button onClick={handleCreate}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Nueva Orden
          </Button>
        )}
      </div>

      {/* Filtros rápidos */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'borrador', label: 'Borradores' },
          { key: 'enviada', label: 'Enviadas' },
          { key: 'confirmada', label: 'Confirmadas' },
          { key: 'parcial', label: 'Parciales' },
          { key: 'entregada', label: 'Entregadas' }
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              filter === item.key 
                ? 'bg-primary-100 border-primary-300 text-primary-700' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Órdenes</p>
          <p className="text-2xl font-bold text-gray-900">{ordenes.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">En Proceso</p>
          <p className="text-2xl font-bold text-blue-600">
            {ordenes.filter(o => ['enviada', 'confirmada', 'parcial'].includes(o.estado)).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Entregadas</p>
          <p className="text-2xl font-bold text-green-600">
            {ordenes.filter(o => o.estado === 'entregada').length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Monto Total</p>
          <p className="text-lg font-bold text-primary-600">
            {formatCurrency(
              ordenes.reduce((sum, o) => sum + parseFloat(o.total || '0'), 0).toString()
            )}
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <Table
          columns={columns}
          data={filteredOrdenes}
          keyExtractor={(o) => o.id}
          loading={loading}
          emptyMessage="No hay órdenes de compra registradas"
          onRowClick={handleView}
        />
      </div>
    </div>
  )
}
