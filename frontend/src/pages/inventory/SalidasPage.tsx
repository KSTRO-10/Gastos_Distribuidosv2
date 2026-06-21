import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { inventoryService, SalidaBienes } from '../../services/inventoryService'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'

export default function SalidasPage() {
  const navigate = useNavigate()
  const [salidas, setSalidas] = useState<SalidaBienes[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterConfirmada, setFilterConfirmada] = useState<string>('all')

  useEffect(() => {
    loadSalidas()
  }, [])

  const isLoadingRef = React.useRef(false)

  const loadSalidas = async () => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    try {
      setLoading(true)
      const data = await inventoryService.getSalidas()
      setSalidas(data)
    } catch (err) {
      setError('Error al cargar las salidas')
      console.error(err)
    } finally {
      isLoadingRef.current = false
      setLoading(false)
    }
  }

  const filteredSalidas = salidas.filter(salida => {
    if (filterConfirmada === 'all') return true
    if (filterConfirmada === 'confirmada') return salida.confirmada
    if (filterConfirmada === 'pendiente') return !salida.confirmada
    return true
  })

  const columns = [
    { key: 'numero', header: 'Número' },
    { key: 'almacen_nombre', header: 'Almacén Origen' },
    { key: 'destino_nombre', header: 'Área Destino' },
    { 
      key: 'fecha', 
      header: 'Fecha', 
      render: (item: SalidaBienes) => new Date(item.fecha).toLocaleDateString('es-MX')
    },
    { key: 'responsable_nombre', header: 'Responsable' },
    {
      key: 'confirmada',
      header: 'Estado',
      render: (item: SalidaBienes) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          item.confirmada 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {item.confirmada ? 'Confirmada' : 'Pendiente'}
        </span>
      )
    },
    {
      key: 'detalles',
      header: 'Items',
      render: (item: SalidaBienes) => item.detalles?.length || 0
    },
    {
      key: 'id',
      header: 'Acciones',
      render: (row: SalidaBienes) => (
        <div className="flex gap-2">
          <Link
            to={`/inventario/salidas/${row.id}`}
            className="text-blue-600 hover:text-blue-800"
          >
            Ver
          </Link>
        </div>
      )
    }
  ]

  // Stats
  const totalSalidas = salidas.length
  const salidasConfirmadas = salidas.filter(s => s.confirmada).length
  const salidasPendientes = salidas.filter(s => !s.confirmada).length

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
        <h1 className="text-2xl font-bold text-gray-900">Salidas de Bienes</h1>
        <Button onClick={() => navigate('/inventario/salidas/nueva')}>
          Nueva Salida
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
          <h3 className="text-sm font-medium text-gray-500">Total Salidas</h3>
          <p className="text-2xl font-bold text-gray-900">{totalSalidas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500">Confirmadas</h3>
          <p className="text-2xl font-bold text-green-600">{salidasConfirmadas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <h3 className="text-sm font-medium text-gray-500">Pendientes</h3>
          <p className="text-2xl font-bold text-yellow-600">{salidasPendientes}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-4 items-center">
          <label className="font-medium text-gray-700">Filtrar por estado:</label>
          <select
            value={filterConfirmada}
            onChange={(e) => setFilterConfirmada(e.target.value)}
            className="border rounded-md px-3 py-2"
            title="Filtro de estado"
          >
            <option value="all">Todas</option>
            <option value="confirmada">Confirmadas</option>
            <option value="pendiente">Pendientes</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow">
        <Table 
          columns={columns} 
          data={filteredSalidas}
          keyExtractor={(item) => item.id}
          emptyMessage="No hay salidas registradas"
        />
      </div>
    </div>
  )
}
