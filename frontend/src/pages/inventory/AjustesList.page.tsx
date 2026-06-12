import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import PageHeader from '../../components/ui/PageHeader'
import Table from '../../components/ui/Table'
import Button from '../../components/ui/Button'
import EstadoBadge from '../../components/inventory/EstadoBadge'
import { ajustesService } from '../../services/ajustesService'
import { IAjusteInventario } from '../../types/inventory'
import { useAuthStore } from '../../stores/authStore'
import { toast } from 'react-hot-toast'

export default function AjustesList() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [data, setData] = useState<IAjusteInventario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await ajustesService.getAjustes()
      setData(result)
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Error al cargar los ajustes de inventario'
      setError(msg)
      toast.error(msg)
    } finally {
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
      render: (item: IAjusteInventario) => <span className="font-medium text-blue-600">{item.numero}</span>
    },
    {
      key: 'almacen_nombre',
      header: 'Almacén',
      render: (item: IAjusteInventario) => item.almacen_nombre || 'N/A'
    },
    {
      key: 'motivo_general',
      header: 'Motivo',
      render: (item: IAjusteInventario) => <span className="capitalize">{item.motivo_general}</span>
    },
    {
      key: 'fecha_solicitud',
      header: 'Fecha Solicitud',
      render: (item: IAjusteInventario) => new Date(item.fecha_solicitud).toLocaleDateString()
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item: IAjusteInventario) => <EstadoBadge estado={item.estado} />
    }
  ]

  // Almacén puede crear mermas. Administrador aprueba pero no crea desde cero (idealmente).
  const canCreate = user?.role === 'almacen'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ajustes y Mermas"
        subtitle="Administra recuentos, daños y ajustes de inventario"
        icon={<AdjustmentsHorizontalIcon className="h-6 w-6" />}
        breadcrumbs={[{ label: 'Inventario' }, { label: 'Ajustes' }]}
        actions={
          canCreate ? (
            <Button
              onClick={() => navigate('/inventario/ajustes/nuevo')}
            >
              <PlusIcon className="h-5 w-5 mr-2" /> Nuevo Ajuste
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
          <Table<IAjusteInventario>
            columns={columns}
            data={data}
            keyExtractor={(item) => item.id.toString()}
            loading={loading}
            emptyMessage="No hay ajustes de inventario registrados."
            onRowClick={(item) => navigate(`/inventario/ajustes/${item.id}`)}
          />
        )}
      </div>
    </div>
  )
}
