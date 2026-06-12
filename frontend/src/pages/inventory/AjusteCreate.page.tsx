import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import FileDropzone from '../../components/inventory/FileDropzone'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { ajustesService } from '../../services/ajustesService'
import { areaService } from '../../services/areaService'
import { inventoryService } from '../../services/inventoryService'
import { ICreateAjusteInventario } from '../../types/inventory'

export default function AjusteCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [almacenes, setAlmacenes] = useState<any[]>([])
  const [articulos, setArticulos] = useState<any[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [formData, setFormData] = useState<ICreateAjusteInventario | null>(null)

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<ICreateAjusteInventario>({
    defaultValues: {
      justificacion: '',
      motivo_general: 'dano',
      detalles: [{ articulo: 0, cantidad: 1, tipo: 'resta' }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'detalles'
  })

  const currentMotivo = watch('motivo_general')

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [areasData, articulosData] = await Promise.all([
          areaService.getAreas(),
          inventoryService.getArticulos()
        ])
        
        setAlmacenes(areasData.filter(a => a.codigo.startsWith('ALM') || a.nombre.toLowerCase().includes('almac')))
        setArticulos(articulosData)
      } catch (error) {
        toast.error('Error al cargar dependencias del formulario')
      }
    }
    fetchDependencies()
  }, [])

  const onPreSubmit = (data: ICreateAjusteInventario) => {
    if (['dano', 'robo', 'perdida'].includes(data.motivo_general) && selectedFiles.length === 0) {
      toast.error('Se requiere al menos una imagen de evidencia para este motivo.')
      return
    }
    
    // Validar cantidad no negativa y que haya articulos
    const cleanedData = {
      ...data,
      almacen: Number(data.almacen),
      detalles: data.detalles.filter(d => d.articulo > 0 && d.cantidad > 0).map(d => ({
        articulo: Number(d.articulo),
        cantidad: Number(d.cantidad),
        tipo: d.tipo
      }))
    }

    if (cleanedData.detalles.length === 0) {
      toast.error('Debe incluir al menos un artículo válido con cantidad mayor a cero.')
      return
    }

    setFormData(cleanedData)
    setIsConfirmOpen(true)
  }

  const handleConfirmSubmit = async () => {
    if (!formData) return
    
    try {
      setLoading(true)
      setIsConfirmOpen(false)
      
      // 1. Crear el JSON
      const ajuste = await ajustesService.createAjuste(formData)
      
      // 2. Subir Evidencias (Múltiples)
      if (selectedFiles.length > 0) {
        await Promise.all(
          selectedFiles.map(file => ajustesService.uploadEvidencia(ajuste.id, file))
        )
      }

      toast.success('Ajuste registrado exitosamente.')
      navigate('/inventario/ajustes')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Hubo un error al crear el ajuste de inventario.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Reportar Ajuste o Merma"
        subtitle="Genera un reporte de diferencias físicas, daños o ingresos administrativos"
        icon={<ArrowLeftIcon className="h-6 w-6" />}
        breadcrumbs={[{ label: 'Ajustes', href: '/inventario/ajustes' }, { label: 'Nuevo' }]}
      />

      <form onSubmit={handleSubmit(onPreSubmit)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
        
        {/* Cabecera */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Almacén Afectado</label>
            <select
              {...register('almacen', { required: 'Selecciona el almacén' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Seleccione...</option>
              {almacenes.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {errors.almacen && <p className="mt-1 text-sm text-red-600">{errors.almacen.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Motivo del Ajuste</label>
            <select
              {...register('motivo_general')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="dano">Producto Dañado</option>
              <option value="robo">Robo o Extravío</option>
              <option value="caducidad">Caducidad</option>
              <option value="error">Error de Captura</option>
              <option value="perdida">Pérdida General</option>
              <option value="admin">Ajuste Administrativo</option>
              <option value="otro">Otro Motivo</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Justificación Detallada</label>
          <textarea
            {...register('justificacion', { required: 'La justificación es obligatoria' })}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Describa cómo y por qué sucedió este ajuste..."
          />
          {errors.justificacion && <p className="mt-1 text-sm text-red-600">{errors.justificacion.message}</p>}
        </div>

        {/* Evidencia Fotográfica */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Evidencia Fotográfica {['dano', 'robo', 'perdida'].includes(currentMotivo) && <span className="text-red-500">* Obligatoria</span>}
          </label>
          <FileDropzone onFilesSelect={setSelectedFiles} maxSizeMB={10} multiple={true} />
        </div>

        {/* Detalles */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Artículos Afectados</h3>
            <Button
              type="button"
              variant="secondary"
              onClick={() => append({ articulo: 0, cantidad: 1, tipo: 'resta' })}
            >
              <PlusIcon className="h-4 w-4 mr-2" /> Agregar Fila
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-wrap md:flex-nowrap items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="w-full md:w-1/3">
                  <select
                    {...register(`detalles.${index}.tipo` as const)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="resta">Resta (Salida/Merma)</option>
                    <option value="suma">Suma (Ingreso)</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <select
                    {...register(`detalles.${index}.articulo` as const, { required: true })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value={0}>Seleccione artículo...</option>
                    {articulos.map(a => (
                      <option key={a.id} value={a.id}>{a.nombre} ({a.codigo})</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min="1"
                    {...register(`detalles.${index}.cantidad` as const, { required: true, min: 1 })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Cant."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  aria-label="Eliminar"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
            {fields.length === 0 && (
              <p className="text-center text-gray-500 py-4 text-sm">No hay artículos. Presione "Agregar Fila".</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="secondary"
            className="mr-3"
            onClick={() => navigate('/inventario/ajustes')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Procesando...' : 'Registrar Ajuste'}
          </Button>
        </div>
      </form>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirmar Ajuste"
        message={`¿Estás seguro de registrar este ajuste por motivo de ${currentMotivo}? Se generará un folio de auditoría.`}
        confirmText="Sí, registrar"
        type="warning"
        isLoading={loading}
      />
    </div>
  )
}
