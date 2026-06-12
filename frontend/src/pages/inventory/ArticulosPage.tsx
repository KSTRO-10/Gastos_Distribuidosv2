import { useState, useEffect } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { inventoryService, Articulo } from '@/services/inventoryService'
import { procurementService, Cog } from '@/services/procurementService'
import { PageHeader, Button, Table, Modal, Input, Select } from '@/components/ui'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'

interface ArticuloFormData {
  codigo: string
  nombre: string
  descripcion: string
  unidad_medida: string
  cog: string
  costo_promedio: number
  is_active: boolean
}

export default function ArticulosPage() {
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [cogs, setCogs] = useState<Cog[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ArticuloFormData>({
    defaultValues: {
      codigo: '',
      nombre: '',
      descripcion: '',
      unidad_medida: 'PZA',
      cog: '',
      costo_promedio: 0,
      is_active: true
    }
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [articulosData, cogsData] = await Promise.all([
        inventoryService.getArticulos(),
        procurementService.getCogs()
      ])
      setArticulos(articulosData)
      setCogs(cogsData)
    } catch (error: any) {
      toast.error('Error al cargar datos del catálogo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const onSubmit = async (data: ArticuloFormData) => {
    try {
      setSubmitting(true)
      const payload = {
        ...data,
        cog: Number(data.cog)
      }
      await inventoryService.createArticulo(payload)
      toast.success('Artículo creado correctamente')
      setModalOpen(false)
      reset()
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.codigo?.[0] || 'Error al guardar el artículo')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { key: 'codigo', header: 'SKU', className: 'font-mono text-sm' },
    { key: 'nombre', header: 'Nombre', className: 'font-medium text-gray-900' },
    { key: 'descripcion', header: 'Descripción', className: 'max-w-xs truncate' },
    { key: 'unidad_medida', header: 'Unidad' },
    { key: 'cog_descripcion', header: 'Partida Presupuestal', render: (a: Articulo) => <span className="text-xs">{a.cog_descripcion || a.cog}</span> },
    { 
      key: 'costo_promedio', 
      header: 'Costo Promedio', 
      className: 'text-right',
      render: (a: Articulo) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(a.costo_promedio)
    },
    { 
      key: 'is_active', 
      header: 'Estado', 
      render: (a: Articulo) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${a.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {a.is_active ? 'Activo' : 'Inactivo'}
        </span>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de Artículos"
        subtitle="Administra los productos que se manejan en los almacenes"
        gradient="purple"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Nuevo Artículo
          </Button>
        }
      />

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <Table
          columns={columns}
          data={articulos}
          keyExtractor={(a) => a.id}
          loading={loading}
          emptyMessage="No hay artículos registrados en el catálogo."
        />
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo Artículo"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Código (SKU) *"
              {...register('codigo', { required: 'Requerido' })}
              error={errors.codigo?.message}
              placeholder="Ej. LAP-001"
            />
            <Input
              label="Nombre *"
              {...register('nombre', { required: 'Requerido' })}
              error={errors.nombre?.message}
            />
            <div className="md:col-span-2">
              <Input
                label="Descripción"
                {...register('descripcion')}
                placeholder="Detalles adicionales del artículo"
              />
            </div>
            <Input
              label="Unidad de Medida *"
              {...register('unidad_medida', { required: 'Requerido' })}
              error={errors.unidad_medida?.message}
              placeholder="PZA, CAJA, KG..."
            />
            <Input
              label="Costo Promedio"
              type="number"
              step="0.01"
              min="0"
              {...register('costo_promedio', { valueAsNumber: true })}
            />
            <div className="md:col-span-2">
              <Select
                label="Partida Presupuestal (COG) *"
                {...register('cog', { required: 'Debe ligar el artículo a una partida presupuestal' })}
                error={errors.cog?.message}
                options={cogs.map(c => ({
                  value: c.id,
                  label: `${c.codigo} - ${c.descripcion}`
                }))}
                placeholder="Seleccione la partida"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Guardar Artículo
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
