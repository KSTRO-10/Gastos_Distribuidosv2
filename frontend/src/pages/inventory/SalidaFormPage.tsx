import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { inventoryService, CreateSalidaData } from '../../services/inventoryService'
import { areaService, Area } from '../../services/areaService'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

interface SalidaFormData {
  almacen: string
  destino_area: string
  fecha: string
  referencia: string
  notas: string
  detalles: {
    material: string
    descripcion: string
    cantidad: number
    unidad: string
  }[]
}

export default function SalidaFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [areas, setAreas] = useState<Area[]>([])
  
  const { register, control, handleSubmit, formState: { errors } } = useForm<SalidaFormData>({
    defaultValues: {
      almacen: '',
      destino_area: '',
      fecha: new Date().toISOString().slice(0, 16),
      referencia: '',
      notas: '',
      detalles: [{ material: '', descripcion: '', cantidad: 1, unidad: 'PZA' }]
    }
  })
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'detalles'
  })

  useEffect(() => {
    loadAreas()
  }, [])

  const loadAreas = async () => {
    try {
      const data = await areaService.getAreas()
      setAreas(data)
    } catch (err) {
      console.error('Error al cargar áreas:', err)
    }
  }

  const onSubmit = async (data: SalidaFormData) => {
    try {
      setLoading(true)
      setError('')
      
      const payload: CreateSalidaData = {
        almacen: Number(data.almacen),
        destino_area: Number(data.destino_area),
        fecha: data.fecha,
        referencia: data.referencia,
        notas: data.notas,
        detalles: data.detalles.filter(d => d.material && d.cantidad > 0)
      }
      
      if (isEditing) {
        await inventoryService.updateSalida(Number(id), payload)
      } else {
        await inventoryService.createSalida(payload)
      }
      
      navigate('/inventario/salidas')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Error al guardar la salida')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const addDetalle = () => {
    append({ material: '', descripcion: '', cantidad: 1, unidad: 'PZA' })
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Salida' : 'Nueva Salida de Bienes'}
        </h1>
        <Button variant="secondary" onClick={() => navigate('/inventario/salidas')}>
          Cancelar
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información General */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Información de la Salida</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Almacén Origen *"
              {...register('almacen', { required: 'Seleccione el almacén' })}
              error={errors.almacen?.message}
              placeholder="Seleccione almacén"
              options={areas.map(area => ({
                value: area.id,
                label: area.nombre
              }))}
            />

            <Select
              label="Área Destino *"
              {...register('destino_area', { required: 'Seleccione el área destino' })}
              error={errors.destino_area?.message}
              placeholder="Seleccione área destino"
              options={areas.map(area => ({
                value: area.id,
                label: area.nombre
              }))}
            />

            <Input
              label="Fecha *"
              type="datetime-local"
              {...register('fecha', { required: 'Campo requerido' })}
              error={errors.fecha?.message}
            />

            <Input
              label="Referencia"
              {...register('referencia')}
              placeholder="Ej: Solicitud #123, Proyecto XYZ"
            />
          </div>

          <div className="mt-4">
            <Input
              label="Notas"
              {...register('notas')}
              placeholder="Observaciones adicionales"
            />
          </div>
        </div>

        {/* Detalles */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Materiales</h2>
            <Button type="button" size="sm" onClick={addDetalle}>
              + Agregar Material
            </Button>
          </div>
          
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-4 items-start border-b pb-4">
                <div className="flex-1">
                  <Input
                    label="Material *"
                    {...register(`detalles.${index}.material`, { required: 'Requerido' })}
                    placeholder="Nombre del material"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    label="Descripción"
                    {...register(`detalles.${index}.descripcion`)}
                    placeholder="Descripción adicional"
                  />
                </div>
                <div className="w-24">
                  <Input
                    label="Cantidad *"
                    type="number"
                    step="0.01"
                    min="0.01"
                    {...register(`detalles.${index}.cantidad`, { 
                      required: 'Requerido',
                      valueAsNumber: true,
                      min: 0.01
                    })}
                  />
                </div>
                <div className="w-24">
                  <Input
                    label="Unidad *"
                    {...register(`detalles.${index}.unidad`, { required: 'Requerido' })}
                    placeholder="PZA"
                  />
                </div>
                <div className="pt-6">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button 
            variant="secondary" 
            type="button" 
            onClick={() => navigate('/inventario/salidas')}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {isEditing ? 'Actualizar' : 'Registrar Salida'}
          </Button>
        </div>
      </form>
    </div>
  )
}
