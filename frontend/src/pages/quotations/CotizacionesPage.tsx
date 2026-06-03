import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { 
  PlusIcon, 
  EyeIcon, 
  CheckCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Button, Table } from '@/components/ui'
import { quotationService, Cotizacion } from '@/services/quotationService'
import { useAuthStore } from '@/stores/authStore'

const estadoColors: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  recibida: 'bg-blue-100 text-blue-800',
  seleccionada: 'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
}

export default function CotizacionesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await quotationService.getCotizaciones()
      setCotizaciones(data)
    } catch (error) {
      toast.error('Error al cargar las cotizaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = () => {
    navigate('/cotizaciones/nueva')
  }

  const handleView = (cotizacion: Cotizacion) => {
    navigate(`/cotizaciones/${cotizacion.id}`)
  }

  const handleSelect = async (cotizacion: Cotizacion) => {
    try {
      await quotationService.selectCotizacion(cotizacion.id)
      toast.success('Cotización seleccionada como ganadora')
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al seleccionar la cotización')
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

  const columns = [
    { 
      key: 'numero', 
      header: 'Número',
      render: (c: Cotizacion) => (
        <span className="font-medium text-primary-600">{c.numero}</span>
      )
    },
    { 
      key: 'fecha', 
      header: 'Fecha',
      render: (c: Cotizacion) => formatDate(c.fecha)
    },
    { key: 'solicitud_numero', header: 'Solicitud' },
    { key: 'proveedor_nombre', header: 'Proveedor' },
    {
      key: 'total',
      header: 'Total',
      render: (c: Cotizacion) => (
        <span className="font-medium">{formatCurrency(c.total)}</span>
      )
    },
    { key: 'tiempo_entrega', header: 'Tiempo Entrega' },
    {
      key: 'estado',
      header: 'Estado',
      render: (c: Cotizacion) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoColors[c.estado] || 'bg-gray-100 text-gray-800'}`}>
          {c.estado_display}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (c: Cotizacion) => (
        <div className="flex space-x-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleView(c) }}
            className="p-1 text-gray-500 hover:text-primary-600"
            title="Ver detalle"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
          
          {c.documento && (
            <a
              href={c.documento}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 text-gray-500 hover:text-primary-600"
              title="Ver documento"
            >
              <DocumentTextIcon className="h-5 w-5" />
            </a>
          )}
          
          {c.estado === 'recibida' && ['admin', 'adquisiciones'].includes(user?.role || '') && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSelect(c) }}
              className="p-1 text-gray-500 hover:text-green-600"
              title="Seleccionar como ganadora"
            >
              <CheckCircleIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona las cotizaciones de proveedores
          </p>
        </div>
        {['admin', 'adquisiciones'].includes(user?.role || '') && (
          <Button onClick={handleCreate}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Nueva Cotización
          </Button>
        )}
      </div>

      {/* Filtros rápidos */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries({
          todos: 'Todos',
          pendiente: 'Pendientes',
          recibida: 'Recibidas',
          seleccionada: 'Seleccionadas'
        }).map(([key, label]) => (
          <button
            key={key}
            className="px-3 py-1 text-sm rounded-full border border-gray-300 hover:bg-gray-50"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <Table
          columns={columns}
          data={cotizaciones}
          keyExtractor={(c) => c.id}
          loading={loading}
          emptyMessage="No hay cotizaciones registradas"
          onRowClick={handleView}
        />
      </div>
    </div>
  )
}
