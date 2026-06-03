import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Button, Table, Modal, Input } from '@/components/ui'
import { areaService, Area, CreateAreaData, UpdateAreaData } from '@/services/areaService'
import { useForm } from 'react-hook-form'

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedArea, setSelectedArea] = useState<Area | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateAreaData>()

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await areaService.getAreas()
      setAreas(data)
    } catch (error) {
      toast.error('Error al cargar las áreas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = () => {
    setSelectedArea(null)
    setIsEditing(false)
    reset({
      company: 1, // TODO: Obtener company del usuario o permitir seleccionar
      name: '',
      code: '',
      description: '',
      presupuesto_anual: ''
    })
    setModalOpen(true)
  }

  const handleEdit = (area: Area) => {
    setSelectedArea(area)
    setIsEditing(true)
    reset({
      company: 1, // TODO: Usar el company actual del área
      name: area.nombre,
      code: area.codigo,
      description: area.descripcion,
      presupuesto_anual: area.presupuesto_anual
    })
    setModalOpen(true)
  }

  const handleDelete = (area: Area) => {
    setSelectedArea(area)
    setDeleteModalOpen(true)
  }

  const onSubmit = async (data: CreateAreaData) => {
    setSubmitting(true)
    try {
      if (isEditing && selectedArea) {
        await areaService.updateArea(selectedArea.id, data as UpdateAreaData)
        toast.success('Área actualizada correctamente')
      } else {
        await areaService.createArea(data)
        toast.success('Área creada correctamente')
      }
      setModalOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar el área')
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!selectedArea) return
    setSubmitting(true)
    try {
      await areaService.deleteArea(selectedArea.id)
      toast.success('Área eliminada correctamente')
      setDeleteModalOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al eliminar el área')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return '$0.00'
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num)
  }

  const columns = [
    { key: 'codigo', header: 'Código' },
    { key: 'nombre', header: 'Nombre' },
    { key: 'descripcion', header: 'Descripción' },
    {
      key: 'presupuesto_anual',
      header: 'Presupuesto Anual',
      render: (area: Area) => formatCurrency(area.presupuesto_anual)
    },
    {
      key: 'presupuesto_disponible',
      header: 'Disponible',
      render: (area: Area) => (
        <span className={parseFloat(area.presupuesto_disponible) < 0 ? 'text-red-600' : 'text-green-600'}>
          {formatCurrency(area.presupuesto_disponible)}
        </span>
      )
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (area: Area) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          area.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {area.is_active ? 'Activa' : 'Inactiva'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (area: Area) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(area) }}
            className="text-primary-600 hover:text-primary-900"
            title="Editar área"
            aria-label={`Editar área ${area.nombre}`}
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(area) }}
            className="text-red-600 hover:text-red-900"
            title="Eliminar área"
            aria-label={`Eliminar área ${area.nombre}`}
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Áreas</h1>
          <p className="mt-1 text-sm text-gray-500">Gestiona las áreas de la organización</p>
        </div>
        <Button onClick={handleCreate}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Nueva Área
        </Button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <Table
          columns={columns}
          data={areas}
          keyExtractor={(area) => area.id}
          loading={loading}
          emptyMessage="No hay áreas registradas"
        />
      </div>

      {/* Create/Edit Area Modal */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={isEditing ? 'Editar Área' : 'Nueva Área'} 
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Código"
              placeholder="AREA-001"
              {...register('code', { required: 'El código es requerido' })}
              error={errors.code?.message}
            />
            <Input
              label="Nombre"
              placeholder="Recursos Humanos"
              {...register('name', { required: 'El nombre es requerido' })}
              error={errors.name?.message}
            />
          </div>

          <Input
            label="Descripción"
            placeholder="recursos humanos de la empresa"
            {...register('description')}
          />

          <Input
            label="Presupuesto Anual"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('presupuesto_anual')}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {isEditing ? 'Actualizar' : 'Crear'} Área
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Eliminar Área" size="sm">
        <p className="text-gray-600">
          ¿Estás seguro de que deseas eliminar el área <strong>{selectedArea?.nombre}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={submitting}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
