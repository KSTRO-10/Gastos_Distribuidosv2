import React, { useState, useEffect } from 'react'
import { inventoryService, Stock } from '@/services/inventoryService'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import toast from 'react-hot-toast'

export default function StockPage() {
  const [stock, setStock] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)

  const isLoadingRef = React.useRef(false)

  const fetchStock = async () => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    setLoading(true)
    try {
      const data = await inventoryService.getStock()
      setStock(data)
    } catch (error: any) {
      toast.error('Error al cargar el inventario: ' + (error.response?.data?.detail || error.message), { id: 'stock-error' })
      setStock([])
    } finally {
      isLoadingRef.current = false
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStock()
  }, [])

  const getStockStatus = (cantidad: number) => {
    if (cantidad <= 0) return <Badge variant="danger">Agotado</Badge>
    if (cantidad < 10) return <Badge variant="warning">Por Agotarse</Badge>
    return <Badge variant="success">Disponible</Badge>
  }

  const columns = [
    { key: 'almacen_nombre', header: 'Almacén' },
    { key: 'articulo_codigo', header: 'SKU', render: (item: Stock) => <span className="font-mono text-xs">{item.articulo_codigo}</span> },
    { key: 'articulo_nombre', header: 'Artículo', className: 'font-medium' },
    { key: 'cantidad', header: 'Cantidad Disponible', className: 'text-right' },
    { key: 'cantidad_reservada', header: 'Reservado', className: 'text-right text-gray-500' },
    { key: 'estado', header: 'Estado', render: (item: Stock) => getStockStatus(item.cantidad) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario Actual (Stock)</h1>
          <p className="text-gray-500">Consulta de existencias en almacén</p>
        </div>
        <Button onClick={() => fetchStock()} disabled={loading}>
          Actualizar
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Existencias Registradas</h2>
        </div>
        <div className="rounded-md border">
          <Table
            columns={columns}
            data={stock}
            keyExtractor={(item) => item.id}
            loading={loading}
            emptyMessage="No hay registros de inventario."
          />
        </div>
      </Card>
    </div>
  )
}
