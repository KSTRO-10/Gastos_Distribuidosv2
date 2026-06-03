import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { budgetService, Plantilla, PlantillaCreateData } from '../../services/budgetService'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import PageHeader from '../../components/ui/PageHeader'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

const initialFormData: PlantillaCreateData = {
  nombre: '',
  ejercicio_fiscal: new Date().getFullYear(),
  entidad_federativa: '',
  clasificador_administrativo: '',
  no_municipio_ramo: '',
  unidad_administrativa: '',
}

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<PlantillaCreateData>(initialFormData)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    loadPlantillas()
  }, [])

  const loadPlantillas = async () => {
    try {
      setLoading(true)
      const data = await budgetService.getPlantillas()
      setPlantillas(data)
    } catch (err) {
      setError('Error al cargar las plantillas presupuestales')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (plantilla: Plantilla) => {
    const confirmed = confirm(
      `¿Estás seguro de eliminar la plantilla "${plantilla.nombre}"?\n\nEjercicio Fiscal: ${plantilla.ejercicio_fiscal}\nÍtems: ${plantilla.items_count}\n\nEsta acción no se puede deshacer.`
    )

    if (!confirmed) return

    try {
      setDeletingId(plantilla.id)
      await budgetService.deletePlantilla(plantilla.id)
      setPlantillas(prev => prev.filter(p => p.id !== plantilla.id))
      setError('')
    } catch (err) {
      setError('Error al eliminar la plantilla')
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!formData.nombre.trim()) {
      setFormError('El nombre es requerido')
      return
    }
    if (!formData.ejercicio_fiscal) {
      setFormError('El ejercicio fiscal es requerido')
      return
    }

    try {
      setCreating(true)
      const newPlantilla = await budgetService.createPlantilla(formData)
      setPlantillas(prev => [...prev, newPlantilla])
      setShowModal(false)
      setFormData(initialFormData)
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, string[]> } }
      const firstError = error.response?.data
        ? Object.values(error.response.data).flat()[0]
        : 'Error al crear la plantilla'
      setFormError(String(firstError))
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const handleInputChange = (field: keyof PlantillaCreateData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const columns = [
    {
      key: 'nombre',
      header: 'Nombre',
      render: (item: Plantilla) => (
        <span className="font-medium text-gray-900">{item.nombre}</span>
      )
    },
    {
      key: 'ejercicio_fiscal',
      header: 'Ejercicio Fiscal',
      render: (item: Plantilla) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          {item.ejercicio_fiscal}
        </span>
      )
    },
    { key: 'entidad_federativa', header: 'Entidad Fed.' },
    { key: 'unidad_administrativa', header: 'Unidad Administrativa' },
    {
      key: 'items_count',
      header: 'Total Ítems',
      render: (item: Plantilla) => (
        <span className="text-gray-600">{item.items_count ?? item.items?.length ?? 0}</span>
      )
    },
    {
      key: 'id',
      header: 'Acciones',
      render: (row: Plantilla) => (
        <div className="flex gap-2">
          <Link
            to={`/budget/plantillas/${row.id}`}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Ver detalle
          </Link>
          <button
            onClick={() => handleDelete(row)}
            disabled={deletingId === row.id}
            className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 transition-colors"
          >
            {deletingId === row.id ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      )
    }
  ]

  // Stats
  const totalPlantillas = plantillas.length
  const totalItems = plantillas.reduce((sum, p) => sum + (p.items_count ?? p.items?.length ?? 0), 0)
  const ejercicios = [...new Set(plantillas.map(p => p.ejercicio_fiscal))]

  return (
    <div>
      <PageHeader
        title="Claves Presupuestarias"
        subtitle="Gestiona las plantillas de claves presupuestales y sus ítems"
        icon={<DocumentTextIcon className="h-7 w-7" />}
        gradient="indigo"
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Gestión de Plantillas</h2>
        <Button onClick={() => setShowModal(true)}>
          + Nueva Plantilla
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
          <h3 className="text-sm font-medium text-gray-500">Total Plantillas</h3>
          <p className="text-2xl font-bold text-gray-900">{totalPlantillas}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-sm font-medium text-gray-500">Total Ítems</h3>
          <p className="text-2xl font-bold text-blue-600">{totalItems}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <h3 className="text-sm font-medium text-gray-500">Ejercicios Fiscales</h3>
          <p className="text-2xl font-bold text-purple-600">{ejercicios.length}</p>
          {ejercicios.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{ejercicios.sort().join(', ')}</p>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Plantillas Presupuestales</h2>
        </div>
        <Table
          columns={columns}
          data={plantillas}
          keyExtractor={(item) => item.id}
          loading={loading}
          emptyMessage="No hay plantillas registradas. Crea una nueva plantilla para comenzar."
        />
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setFormError('') }}
        title="Nueva Plantilla Presupuestal"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {formError}
            </div>
          )}

          <Input
            id="nombre"
            label="Nombre"
            placeholder="Ej: Plantilla 2026 - Municipal"
            value={formData.nombre}
            onChange={(e) => handleInputChange('nombre', e.target.value)}
            required
          />

          <Input
            id="ejercicio_fiscal"
            label="Ejercicio Fiscal"
            type="number"
            placeholder="2026"
            value={formData.ejercicio_fiscal}
            onChange={(e) => handleInputChange('ejercicio_fiscal', Number(e.target.value))}
            required
          />

          <Input
            id="entidad_federativa"
            label="Entidad Federativa"
            placeholder="Ej: Sonora"
            value={formData.entidad_federativa}
            onChange={(e) => handleInputChange('entidad_federativa', e.target.value)}
          />

          <Input
            id="clasificador_administrativo"
            label="Clasificador Administrativo"
            placeholder="Ej: 01"
            value={formData.clasificador_administrativo}
            onChange={(e) => handleInputChange('clasificador_administrativo', e.target.value)}
          />

          <Input
            id="no_municipio_ramo"
            label="No. Municipio / Ramo"
            placeholder="Ej: 043"
            value={formData.no_municipio_ramo}
            onChange={(e) => handleInputChange('no_municipio_ramo', e.target.value)}
          />

          <Input
            id="unidad_administrativa"
            label="Unidad Administrativa"
            placeholder="Ej: Dirección de Administración"
            value={formData.unidad_administrativa}
            onChange={(e) => handleInputChange('unidad_administrativa', e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setShowModal(false); setFormError('') }}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={creating}>
              Crear Plantilla
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
