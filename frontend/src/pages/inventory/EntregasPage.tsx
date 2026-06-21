import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { inventoryService, EntregaBienes } from '../../services/inventoryService'
import { orderService, OrdenCompra } from '../../services/orderService'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'

export default function EntregasPage() {
  const navigate = useNavigate()
  const [entregas, setEntregas] = useState<EntregaBienes[]>([])
  const [pendingOrders, setPendingOrders] = useState<OrdenCompra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterCompleta, setFilterCompleta] = useState<string>('all')
  const isLoadingRef = React.useRef(false)

  const loadData = async (controller?: AbortController) => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    setLoading(true)
    try {
      const [entregasData, ordenesData] = await Promise.all([
        inventoryService.getEntregas(),
        orderService.getOrdenes()
      ])

      if (!controller || !controller.signal.aborted) {
        setEntregas(entregasData)
        // Filter for orders that need receiving
        const pending = ordenesData.filter(o =>
          o.estado === 'confirmada' || o.estado === 'parcial'
        )
        setPendingOrders(pending)
      }
    } catch (err) {
      if (!controller || !controller.signal.aborted) {
        setError('Error al cargar los datos')
        setEntregas([])
        setPendingOrders([])
        console.error(err)
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
    }
  }, [])

  const filteredEntregas = entregas.filter(entrega => {
    if (filterCompleta === 'all') return true
    if (filterCompleta === 'completa') return entrega.completa
    if (filterCompleta === 'parcial') return !entrega.completa
    return true
  })

  const columns = [
    { key: 'numero', header: 'Número' },
    { key: 'orden_numero', header: 'Orden de Compra' },
    {
      key: 'fecha_recepcion',
      header: 'Fecha Recepción',
      render: (item: EntregaBienes) => new Date(item.fecha_recepcion).toLocaleDateString('es-MX')
    },
    { key: 'recibido_por_nombre', header: 'Recibido Por' },
    {
      key: 'completa',
      header: 'Estado',
      render: (item: EntregaBienes) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.completa
          ? 'bg-green-100 text-green-800'
          : 'bg-yellow-100 text-yellow-800'
          }`}>
          {item.completa ? 'Completa' : 'Parcial'}
        </span>
      )
    },
    {
      key: 'detalles',
      header: 'Items',
      render: (item: EntregaBienes) => item.detalles?.length || 0
    },
    {
      key: 'id',
      header: 'Acciones',
      render: (row: EntregaBienes) => (
        <div className="flex gap-2">
          <Link
            to={`/inventario/entregas/${row.id}`}
            className="text-blue-600 hover:text-blue-800"
          >
            Ver
          </Link>
        </div>
      )
    }
  ]

  // Stats
  const totalEntregas = entregas.length
  const entregasCompletas = entregas.filter(e => e.completa).length
  const entregasParciales = entregas.filter(e => !e.completa).length

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
        <h1 className="text-2xl font-bold text-gray-900">Entregas de Bienes</h1>
        <Button onClick={() => navigate('/inventario/entregas/nueva')}>
          Nueva Entrega
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500">Total Entregas</h3>
          <p className="text-2xl font-bold text-gray-900">{totalEntregas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500">Completas</h3>
          <p className="text-2xl font-bold text-green-600">{entregasCompletas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <h3 className="text-sm font-medium text-gray-500">Parciales</h3>
          <p className="text-2xl font-bold text-yellow-600">{entregasParciales}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-4 items-center">
          <label className="font-medium text-gray-700">Filtrar por estado:</label>
          <select
            value={filterCompleta}
            onChange={(e) => setFilterCompleta(e.target.value)}
            className="border rounded-md px-3 py-2"
            title="Filtro de estado"
          >
            <option value="all">Todas</option>
            <option value="completa">Completas</option>
            <option value="parcial">Parciales</option>
          </select>
        </div>
      </div>

      {/* Pending Orders Section */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Órdenes Pendientes por Recibir</h2>
        </div>
        <Table
          columns={[
            { key: 'numero', header: 'Número' },
            { key: 'proveedor_nombre', header: 'Proveedor' },
            {
              key: 'fecha_entrega_esperada',
              header: 'Fecha Esperada',
              render: (item: OrdenCompra) => item.fecha_entrega_esperada
                ? new Date(item.fecha_entrega_esperada).toLocaleDateString('es-MX')
                : 'N/A'
            },
            { key: 'total', header: 'Total', render: (item: OrdenCompra) => `$${Number(item.total).toLocaleString('es-MX')}` },
            {
              key: 'estado',
              header: 'Estado',
              render: (item: OrdenCompra) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.estado === 'confirmada'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-orange-100 text-orange-800'
                  }`}>
                  {item.estado_display}
                </span>
              )
            },
            {
              key: 'actions',
              header: 'Acciones',
              render: (row: OrdenCompra) => (
                <Button
                  size="sm"
                  onClick={() => navigate(`/inventario/entregas/nueva?orden=${row.id}`)}
                >
                  Recibir
                </Button>
              )
            }
          ]}
          data={pendingOrders}
          keyExtractor={(item) => item.id}
          emptyMessage="No hay órdenes pendientes de recepción"
        />
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-4">Historial de Entregas</h2>

      {/* Existing History Table */}
      <div className="bg-white rounded-lg shadow">
        <Table
          columns={columns}
          data={filteredEntregas}
          keyExtractor={(item) => item.id}
          emptyMessage="No hay entregas registradas"
        />
      </div>
    </div>
  )
}
