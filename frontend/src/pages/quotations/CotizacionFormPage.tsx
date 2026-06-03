import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Button, Input, Select } from '@/components/ui'
import { quotationService, Proveedor } from '@/services/quotationService'
import { procurementService, Solicitud } from '@/services/procurementService'

interface DetalleForm {
  concepto: string
  descripcion: string
  unidad: string
  cantidad: number
  precio_unitario: number
}

interface CotizacionFormData {
  solicitud: number
  proveedor: number
  fecha: string
  vigencia: string
  tiempo_entrega: string
  condiciones_pago: string
  notas: string
  detalles: DetalleForm[]
}

export default function CotizacionFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  
  const [loading, setLoading] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null)
  
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CotizacionFormData>({
    defaultValues: {
      fecha: new Date().toISOString().split('T')[0],
      detalles: [{ concepto: '', descripcion: '', unidad: '', cantidad: 1, precio_unitario: 0 }]
    }
  })
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'detalles'
  })

  const watchSolicitud = watch('solicitud')
  const watchDetalles = watch('detalles')

  // Calcular total
  const total = watchDetalles?.reduce((sum, detalle) => {
    return sum + (detalle.cantidad || 0) * (detalle.precio_unitario || 0)
  }, 0) || 0

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [provData, solData] = await Promise.all([
          quotationService.getProveedores(),
          procurementService.getSolicitudes()
        ])
        setProveedores(provData)
        // Solo mostrar solicitudes que ya están en proceso de cotización
        setSolicitudes(solData.filter(s => s.estado === 'cotizacion' || s.estado === 'enviada'))
      } catch (error) {
        toast.error('Error al cargar datos')
      }
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    if (watchSolicitud && solicitudes.length > 0) {
      const sol = solicitudes.find(s => s.id === Number(watchSolicitud))
      setSelectedSolicitud(sol || null)
      
      // Pre-cargar materiales de la solicitud como detalles
      if (sol?.materiales && sol.materiales.length > 0) {
        const nuevosDetalles = sol.materiales.map((m: { descripcion: string; unidad_medida: string; cantidad: number }) => ({
          concepto: m.descripcion,
          descripcion: '',
          unidad: m.unidad_medida,
          cantidad: m.cantidad,
          precio_unitario: 0
        }))
        setValue('detalles', nuevosDetalles)
      }
    }
  }, [watchSolicitud, solicitudes, setValue])

  useEffect(() => {
    if (isEdit && id) {
      loadCotizacion(id)
    }
  }, [isEdit, id])

  const loadCotizacion = async (cotizacionId: string) => {
    try {
      const data = await quotationService.getCotizacion(Number(cotizacionId))
      setValue('solicitud', data.solicitud)
      setValue('proveedor', data.proveedor)
      setValue('fecha', data.fecha)
      setValue('vigencia', data.vigencia || '')
      setValue('tiempo_entrega', data.tiempo_entrega || '')
      setValue('condiciones_pago', data.condiciones_pago || '')
      setValue('notas', data.notas || '')
      
      if (data.detalles && data.detalles.length > 0) {
        setValue('detalles', data.detalles.map(d => ({
          concepto: d.concepto,
          descripcion: d.descripcion || '',
          unidad: d.unidad,
          cantidad: d.cantidad,
          precio_unitario: parseFloat(String(d.precio_unitario))
        })))
      }
    } catch (error) {
      toast.error('Error al cargar la cotización')
      navigate('/cotizaciones')
    }
  }

  const onSubmit = async (data: CotizacionFormData) => {
    setLoading(true)
    try {
      const payload = {
        ...data,
        detalles: data.detalles.map(d => ({
          ...d,
          subtotal: d.cantidad * d.precio_unitario
        }))
      }
      
      if (isEdit) {
        await quotationService.updateCotizacion(Number(id), payload)
        toast.success('Cotización actualizada correctamente')
      } else {
        await quotationService.createCotizacion(payload)
        toast.success('Cotización creada correctamente')
      }
      navigate('/cotizaciones')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar la cotización')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/cotizaciones')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-1" />
        Volver
      </button>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Editar Cotización' : 'Nueva Cotización'}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Datos generales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Solicitud *"
              error={errors.solicitud?.message}
              placeholder="Seleccionar solicitud..."
              options={solicitudes.map(sol => ({ 
                value: sol.id, 
                label: `${sol.numero} - ${sol.area_nombre || sol.area_name}` 
              }))}
              {...register('solicitud', { required: 'La solicitud es requerida' })}
            />

            <Select
              label="Proveedor *"
              error={errors.proveedor?.message}
              placeholder="Seleccionar proveedor..."
              options={proveedores.map(prov => ({ 
                value: prov.id, 
                label: prov.razon_social 
              }))}
              {...register('proveedor', { required: 'El proveedor es requerido' })}
            />

            <Input
              type="date"
              label="Fecha *"
              error={errors.fecha?.message}
              {...register('fecha', { required: 'La fecha es requerida' })}
            />

            <Input
              type="date"
              label="Vigencia"
              {...register('vigencia')}
            />

            <Input
              label="Tiempo de Entrega"
              placeholder="Ej: 5 días hábiles"
              {...register('tiempo_entrega')}
            />

            <Input
              label="Condiciones de Pago"
              placeholder="Ej: 30 días crédito"
              {...register('condiciones_pago')}
            />
          </div>

          {/* Información de la solicitud seleccionada */}
          {selectedSolicitud && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                Información de la solicitud
              </h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Área:</strong> {selectedSolicitud.area_nombre}</p>
                <p><strong>Fecha requerida:</strong> {selectedSolicitud.fecha_requerida}</p>
                {selectedSolicitud.justificacion && (
                  <p><strong>Justificación:</strong> {selectedSolicitud.justificacion}</p>
                )}
              </div>
            </div>
          )}

          {/* Detalles de la cotización */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Detalle de la Cotización</h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => append({ concepto: '', descripcion: '', unidad: '', cantidad: 1, precio_unitario: 0 })}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div className="md:col-span-2">
                      <Input
                        label={index === 0 ? "Concepto" : undefined}
                        placeholder="Nombre del artículo"
                        error={errors.detalles?.[index]?.concepto?.message}
                        {...register(`detalles.${index}.concepto`, {
                          required: 'Requerido'
                        })}
                      />
                    </div>
                    <div>
                      <Input
                        label={index === 0 ? "Unidad" : undefined}
                        placeholder="Pza, Kg..."
                        {...register(`detalles.${index}.unidad`)}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        label={index === 0 ? "Cantidad" : undefined}
                        min="0.01"
                        step="0.01"
                        error={errors.detalles?.[index]?.cantidad?.message}
                        {...register(`detalles.${index}.cantidad`, {
                          required: 'Requerido',
                          valueAsNumber: true,
                          min: { value: 0.01, message: 'Debe ser mayor a 0' }
                        })}
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        label={index === 0 ? "P. Unitario" : undefined}
                        min="0"
                        step="0.01"
                        error={errors.detalles?.[index]?.precio_unitario?.message}
                        {...register(`detalles.${index}.precio_unitario`, {
                          required: 'Requerido',
                          valueAsNumber: true,
                          min: { value: 0, message: 'Debe ser >= 0' }
                        })}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-6">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-1 text-red-500 hover:text-red-700"
                        title="Eliminar"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-4 flex justify-end">
              <div className="bg-primary-50 px-4 py-2 rounded-lg">
                <span className="text-sm text-gray-600">Total: </span>
                <span className="text-lg font-bold text-primary-700">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas adicionales
            </label>
            <textarea
              rows={3}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="Observaciones o notas adicionales..."
              {...register('notas')}
            />
          </div>

          {/* Acciones */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/cotizaciones')}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {isEdit ? 'Guardar Cambios' : 'Crear Cotización'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
