import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Button, Input, Modal, Table } from '@/components/ui'
import { proveedorService, Proveedor, CreateProveedorData } from '@/services/proveedorService'
import { useAuthStore } from '@/stores/authStore'
import { useForm } from 'react-hook-form'

export default function ProveedoresPage() {
  const { user } = useAuthStore()
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateProveedorData>()

  // Lógica de filtrado
  const filteredProveedores = useMemo(() => {
    return proveedores.filter(p => {
      // Filtro de búsqueda (Razón Social, RFC, Email)
      const matchesSearch = searchTerm === '' ||
        p.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.rfc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.contacto_email && p.contacto_email.toLowerCase().includes(searchTerm.toLowerCase()))

      // Filtro de estado
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && p.is_active) ||
        (statusFilter === 'inactive' && !p.is_active)

      return matchesSearch && matchesStatus
    })
  }, [proveedores, searchTerm, statusFilter])

  // Limpiar todos los filtros
  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
  }

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all'

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await proveedorService.getProveedores()
      setProveedores(data)
    } catch (error) {
      toast.error('Error al cargar los proveedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openModal = (proveedor?: Proveedor) => {
    if (proveedor) {
      setEditingProveedor(proveedor)
      reset({
        razon_social: proveedor.razon_social,
        nombre_comercial: proveedor.nombre_comercial || '',
        rfc: proveedor.rfc,
        contacto_email: proveedor.contacto_email || '',
        contacto_telefono: proveedor.contacto_telefono || '',
        direccion: proveedor.direccion || '',
        contacto_nombre: proveedor.contacto_nombre || '',
      })
    } else {
      setEditingProveedor(null)
      reset({
        razon_social: '',
        nombre_comercial: '',
        rfc: '',
        contacto_email: '',
        contacto_telefono: '',
        direccion: '',
        contacto_nombre: '',
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProveedor(null)
    reset()
  }

  const onSubmit = async (data: CreateProveedorData) => {
    setSubmitting(true)
    try {
      if (editingProveedor) {
        await proveedorService.updateProveedor(editingProveedor.id, data)
        toast.success('Proveedor actualizado correctamente')
      } else {
        await proveedorService.createProveedor(data)
        toast.success('Proveedor creado correctamente')
      }
      closeModal()
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar el proveedor')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (proveedor: Proveedor) => {
    if (!confirm(`¿Está seguro de eliminar el proveedor "${proveedor.razon_social}"?`)) return

    try {
      await proveedorService.deleteProveedor(proveedor.id)
      toast.success('Proveedor eliminado correctamente')
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al eliminar el proveedor')
    }
  }

  const columns = [
    { key: 'razon_social', header: 'Razón Social' },
    { key: 'rfc', header: 'RFC' },
    { key: 'contacto_email', header: 'Email' },
    { key: 'contacto_telefono', header: 'Teléfono' },
    {
      key: 'is_active',
      header: 'Estado',
      render: (p: Proveedor) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.is_active
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
          }`}>
          {p.is_active ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (p: Proveedor) => (
        <div className="flex space-x-1">
          <button
            onClick={(e) => { e.stopPropagation(); openModal(p) }}
            className="p-1 text-gray-500 hover:text-primary-600"
            title="Editar"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          {['admin'].includes(user?.role || '') && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(p) }}
              className="p-1 text-gray-500 hover:text-red-600"
              title="Eliminar"
            >
              <TrashIcon className="h-5 w-5" />
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
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los proveedores del sistema
          </p>
        </div>
        {['admin', 'adquisiciones'].includes(user?.role || '') && (
          <Button onClick={() => openModal()}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Nuevo Proveedor
          </Button>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white shadow rounded-lg p-4 mb-4 border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por razón social, RFC, email o ciudad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Filtro de Estado */}
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          {/* Botón Limpiar Filtros */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Limpiar
            </button>
          )}
        </div>

        {/* Contador de resultados */}
        <div className="mt-3 text-sm text-gray-500">
          Mostrando {filteredProveedores.length} de {proveedores.length} proveedores
          {hasActiveFilters && <span className="ml-1 text-primary-600">(filtrado)</span>}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <Table
          columns={columns}
          data={filteredProveedores}
          keyExtractor={(p) => p.id}
          loading={loading}
          emptyMessage={hasActiveFilters ? "No se encontraron proveedores con los filtros aplicados" : "No hay proveedores registrados"}
        />
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Razón Social *"
              error={errors.razon_social?.message}
              {...register('razon_social', { required: 'La razón social es requerida' })}
            />
            <Input
              label="Nombre Comercial"
              {...register('nombre_comercial')}
            />
            <Input
              label="RFC *"
              error={errors.rfc?.message}
              {...register('rfc', {
                required: 'El RFC es requerido',
                minLength: { value: 12, message: 'El RFC debe tener al menos 12 caracteres' }
              })}
            />
            <Input
              type="email"
              label="Email de Contacto *"
              error={errors.contacto_email?.message}
              {...register('contacto_email', {
                required: 'El email es requerido',
                pattern: { value: /^\S+@\S+$/i, message: 'Email inválido' }
              })}
            />
            <Input
              label="Teléfono de Contacto"
              {...register('contacto_telefono')}
            />
          </div>

          <Input
            label="Dirección"
            {...register('direccion')}
          />

          <Input
            label="Nombre de Contacto"
            {...register('contacto_nombre')}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {editingProveedor ? 'Guardar Cambios' : 'Crear Proveedor'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
