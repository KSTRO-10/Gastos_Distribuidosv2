import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { facturaService, Factura } from '../../services/facturaService'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'

const statusColors: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-800',
  procesando: 'bg-blue-100 text-blue-800',
  procesada: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  distribuida: 'bg-purple-100 text-purple-800'
}

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  procesando: 'Procesando',
  procesada: 'Procesada',
  error: 'Error',
  distribuida: 'Distribuida'
}

export default function FacturasPage() {
  const navigate = useNavigate()
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const handleDelete = async (factura: Factura) => {
    if (factura.status === 'distribuida') {
      setError('No se puede eliminar una factura que ya fue distribuida')
      return
    }

    const confirmed = confirm(
      `¿Estás seguro de eliminar esta factura?\n\nProveedor: ${factura.proveedor_nombre}\nUUID: ${factura.uuid_cfdi || 'Pendiente'}\nTotal: $${Number(factura.total).toLocaleString('es-MX')}`
    )

    if (!confirmed) return

    try {
      setDeletingId(factura.id)
      await facturaService.deleteFactura(factura.id)
      setFacturas(prev => prev.filter(f => f.id !== factura.id))
      setError('')
    } catch (err) {
      setError('Error al eliminar la factura')
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    loadFacturas()
  }, [])

  const loadFacturas = async () => {
    try {
      setLoading(true)
      const data = await facturaService.getFacturas()
      setFacturas(data)
    } catch (err) {
      setError('Error al cargar las facturas')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredFacturas = facturas.filter(factura => {
    if (filterStatus === 'all') return true
    return factura.status === filterStatus
  })

  const columns = [
    {
      key: 'uuid_cfdi',
      header: 'UUID CFDI',
      render: (item: Factura) => item.uuid_cfdi ? item.uuid_cfdi.substring(0, 8) + '...' : 'Pendiente'
    },
    { key: 'proveedor_nombre', header: 'Proveedor' },
    { key: 'folio', header: 'Folio' },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (item: Factura) => item.fecha ? new Date(item.fecha).toLocaleDateString('es-MX') : '-'
    },
    {
      key: 'total',
      header: 'Total',
      render: (item: Factura) => `$${Number(item.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    },
    {
      key: 'status',
      header: 'Estado',
      render: (item: Factura) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || 'bg-gray-100'}`}>
          {statusLabels[item.status] || item.status}
        </span>
      )
    },
    {
      key: 'id',
      header: 'Acciones',
      render: (row: Factura) => (
        <div className="flex gap-2">
          <Link
            to={`/facturas/${row.id}`}
            className="text-blue-600 hover:text-blue-800"
          >
            Ver
          </Link>
          {row.status === 'procesada' && (
            <Link
              to={`/facturas/${row.id}/distribuir`}
              className="text-purple-600 hover:text-purple-800"
            >
              Distribuir
            </Link>
          )}
          {row.status !== 'distribuida' && (
            <button
              onClick={() => handleDelete(row)}
              disabled={deletingId === row.id}
              className="text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              {deletingId === row.id ? 'Eliminando...' : 'Eliminar'}
            </button>
          )}
        </div>
      )
    }
  ]

  // Stats
  const totalFacturas = facturas.length
  const facturasProcessed = facturas.filter(f => f.status === 'procesada').length
  const facturasDistributed = facturas.filter(f => f.status === 'distribuida').length
  const facturasError = facturas.filter(f => f.status === 'error').length
  const totalAmount = facturas.reduce((sum, f) => sum + Number(f.total), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Facturas CFDI</h1>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/facturas/distribucion-rapida')}>
            Dist. Rápida
          </Button>
          <Button onClick={() => navigate('/facturas/subir')}>
            Subir Factura
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500">Total Facturas</h3>
          <p className="text-2xl font-bold text-gray-900">{totalFacturas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500">Procesadas</h3>
          <p className="text-2xl font-bold text-green-600">{facturasProcessed}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <h3 className="text-sm font-medium text-gray-500">Distribuidas</h3>
          <p className="text-2xl font-bold text-purple-600">{facturasDistributed}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-gray-500">Con Error</h3>
          <p className="text-2xl font-bold text-red-600">{facturasError}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <h3 className="text-sm font-medium text-gray-500">Monto Total</h3>
          <p className="text-lg font-bold text-gray-900">
            ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-4 items-center">
          <label className="font-medium text-gray-700">Filtrar por estado:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded-md px-3 py-2"
            title="Filtro de estado"
          >
            <option value="all">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="procesando">Procesando</option>
            <option value="procesada">Procesada</option>
            <option value="distribuida">Distribuida</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Pending Invoices Section */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Facturas Pendientes de Pago / Distribución</h2>
        </div>
        <Table
          columns={columns}
          data={facturas.filter(f => ['pendiente', 'procesando'].includes(f.status))}
          keyExtractor={(item) => item.id}
          emptyMessage="No hay facturas pendientes"
        />
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-4">Historial de Facturas</h2>

      {/* Table */}
      <div className="bg-white rounded-lg shadow">
        <Table
          columns={columns}
          data={filteredFacturas}
          keyExtractor={(item) => item.id}
          emptyMessage="No hay facturas registradas"
        />
      </div>
    </div>
  )
}
