import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import PageHeader from '../../components/ui/PageHeader'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import EstadoBadge from '../../components/inventory/EstadoBadge'
import { devolucionesService } from '../../services/devolucionesService'
import { IDevolucionInterna } from '../../types/inventory'
import { useAuthStore } from '../../stores/authStore'
import { toast } from 'react-hot-toast'

export default function DevolucionesList() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [data, setData] = useState<IDevolucionInterna[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isLoadingRef = React.useRef(false)

  const fetchData = async () => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true
    try {
      setLoading(true)
      setError(null)
      const result = await devolucionesService.getDevoluciones()
      setData(result)
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error al cargar las devoluciones'
      setError(msg)
      toast.error(msg)
      setData([])
    } finally {
      isLoadingRef.current = false
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const columns = [
    {
      key: 'numero',
      header: 'Folio',
      render: (item: IDevolucionInterna) => <span className="font-medium text-blue-600">{item.numero}</span>
    },
    {
      key: 'area_origen_nombre',
      header: 'Área Origen',
      render: (item: IDevolucionInterna) => item.area_origen_nombre || 'N/A'
    },
    {
      key: 'almacen_destino_nombre',
      header: 'Almacén Destino',
      render: (item: IDevolucionInterna) => item.almacen_destino_nombre || 'N/A'
    },
    {
      key: 'fecha_solicitud',
      header: 'Fecha Solicitud',
      render: (item: IDevolucionInterna) => new Date(item.fecha_solicitud).toLocaleDateString()
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item: IDevolucionInterna) => <EstadoBadge estado={item.estado} />
    }
  ]

  const canCreate = user?.role === 'area'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devoluciones Internas"
        subtitle="Gestiona el retorno de materiales desde las áreas hacia el almacén"
        icon={<ArrowPathIcon className="h-6 w-6" />}
        breadcrumbs={[{ label: 'Inventario' }, { label: 'Devoluciones' }]}
        actions={
          canCreate ? (
            <Button
              onClick={() => navigate('/inventario/devoluciones/nueva')}
            >
              <PlusIcon className="h-5 w-5 mr-2" /> Nueva Devolución
            </Button>
          ) : null
        }
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-red-600">
            <p>{error}</p>
            <Button onClick={fetchData} variant="secondary" className="mt-4">Reintentar</Button>
          </div>
        ) : (
          <Table<IDevolucionInterna>
            columns={columns}
            data={data}
            keyExtractor={(item) => item.id.toString()}
            loading={loading}
            emptyMessage="No hay devoluciones registradas."
            onRowClick={(item) => navigate(`/inventario/devoluciones/${item.id}`)}
          />
        )}
      </div>
    </div>
  )
}
