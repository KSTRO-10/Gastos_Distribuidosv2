import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Button, Input, Select } from '@/components/ui'
import { orderService, CreateOrdenData } from '@/services/orderService'
import { quotationService, Cotizacion, Proveedor } from '@/services/quotationService'

interface DetalleForm {
  concepto: string
  descripcion: string
  unidad: string
  cantidad: number
  precio_unitario: number
}

interface OrdenFormData {
  proveedor: number
  cotizacion: number
  fecha_emision: string
  fecha_entrega_esperada: string
  condiciones_pago: string
  lugar_entrega: string
  notas: string
  detalles: DetalleForm[]
}

export default function OrdenFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  
  const [loading, setLoading] = useState(false)
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [selectedCotizacion, setSelectedCotizacion] = useState<Cotizacion | null>(null)
  
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<OrdenFormData>({
    defaultValues: {
      fecha_emision: new Date().toISOString().split('T')[0],
      detalles: [{ concepto: '', descripcion: '', unidad: '', cantidad: 1, precio_unitario: 0 }]
    }
  })
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'detalles'
  })

  const watchCotizacion = watch('cotizacion')
  const watchDetalles = watch('detalles')

  // Calcular totales
  const subtotal = watchDetalles?.reduce((sum, detalle) => {
    return sum + (detalle.cantidad || 0) * (detalle.precio_unitario || 0)
  }, 0) || 0
  const iva = subtotal * 0.16
  const total = subtotal + iva

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [provData, cotData] = await Promise.all([
          quotationService.getProveedores(),
          quotationService.getCotizaciones()
        ])
        setProveedores(provData)
        // Solo mostrar cotizaciones seleccionadas (ganadoras)
        setCotizaciones(cotData.filter(c => c.estado === 'seleccionada'))
      } catch (error) {
        toast.error('Error al cargar datos')
      }
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    if (watchCotizacion && cotizaciones.length > 0) {
      const cot = cotizaciones.find(c => c.id === Number(watchCotizacion))
      setSelectedCotizacion(cot || null)
      
      if (cot) {
        setValue('proveedor', cot.proveedor)
        
        // Pre-cargar detalles de la cotización
        if (cot.detalles && cot.detalles.length > 0) {
          const nuevosDetalles = cot.detalles.map(d => ({
            concepto: d.concepto,
            descripcion: d.descripcion || '',
            unidad: d.unidad,
            cantidad: d.cantidad,
            precio_unitario: typeof d.precio_unitario === 'string' 
              ? parseFloat(d.precio_unitario) 
              : d.precio_unitario
          }))
          setValue('detalles', nuevosDetalles)
        }
      }
    }
  }, [watchCotizacion, cotizaciones, setValue])

  useEffect(() => {
    if (isEdit && id) {
      loadOrden(id)
    }
  }, [isEdit, id])

  const loadOrden = async (ordenId: string) => {
    try {
      const data = await orderService.getOrden(Number(ordenId))
      setValue('proveedor', data.proveedor)
      setValue('cotizacion', data.cotizacion || 0)
      setValue('fecha_emision', data.fecha_emision)
      setValue('fecha_entrega_esperada', data.fecha_entrega_esperada || '')
      setValue('condiciones_pago', data.condiciones_pago || '')
      setValue('lugar_entrega', data.lugar_entrega || '')
      setValue('notas', data.notas || '')
      
      if (data.detalles && data.detalles.length > 0) {
        setValue('detalles', data.detalles.map(d => ({
          concepto: d.concepto,
          descripcion: d.descripcion || '',
          unidad: d.unidad,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario
        })))
      }
    } catch (error) {
      toast.error('Error al cargar la orden')
      navigate('/ordenes')
    }
  }

  const onSubmit = async (data: OrdenFormData) => {
    setLoading(true)
    try {
      const payload: CreateOrdenData = {
        ...data,
        cotizacion: data.cotizacion || undefined,
        fecha_entrega_esperada: data.fecha_entrega_esperada || undefined,
        detalles: data.detalles.map(d => ({
          ...d,
        }))
      }
      
      if (isEdit) {
        await orderService.updateOrden(Number(id), payload)
        toast.success('Orden actualizada correctamente')
      } else {
        await orderService.createOrden(payload)
        toast.success('Orden creada correctamente')
      }
      navigate('/ordenes')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar la orden')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={() => navigate('/ordenes')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-1" />
        Volver
      </button>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Datos de origen */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Datos de Origen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Cotización Ganadora *"
                error={errors.cotizacion?.message}
                placeholder="Seleccionar cotización..."
                options={cotizaciones.map(cot => ({ 
                  value: cot.id, 
                  label: `${cot.numero} - ${cot.proveedor_nombre} - ${formatCurrency(parseFloat(cot.total))}` 
                }))}
                {...register('cotizacion', { required: 'La cotización es requerida', valueAsNumber: true })}
              />

              <Select
                label="Proveedor *"
                error={errors.proveedor?.message}
                placeholder="Seleccionar proveedor..."
                options={
                  selectedCotizacion 
                    ? [{ value: selectedCotizacion.proveedor, label: selectedCotizacion.proveedor_nombre }]
                    : proveedores.map(prov => ({ 
                        value: prov.id, 
                        label: prov.razon_social 
                      }))
                }
                disabled={!!selectedCotizacion}
                {...register('proveedor', { required: 'El proveedor es requerido', valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Información de la cotización seleccionada */}
          {selectedCotizacion && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                Información de la cotización
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-blue-700">
                <div>
                  <strong>Número:</strong> {selectedCotizacion.numero}
                </div>
                <div>
                  <strong>Proveedor:</strong> {selectedCotizacion.proveedor_nombre}
                </div>
                <div>
                  <strong>Vigencia:</strong> {selectedCotizacion.vigencia || 'Sin especificar'}
                </div>
                <div>
                  <strong>Total:</strong> {formatCurrency(parseFloat(selectedCotizacion.total))}
                </div>
              </div>
            </div>
          )}

          {/* Datos generales */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Datos de la Orden</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                type="date"
                label="Fecha de Emisión *"
                error={errors.fecha_emision?.message}
                {...register('fecha_emision', { required: 'La fecha de emisión es requerida' })}
              />

              <Input
                type="date"
                label="Fecha de Entrega Esperada"
                {...register('fecha_entrega_esperada')}
              />

              <Input
                label="Condiciones de Pago"
                placeholder="Ej: 30 días crédito"
                {...register('condiciones_pago')}
              />
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lugar de Entrega
              </label>
              <textarea
                rows={2}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="Dirección de entrega..."
                {...register('lugar_entrega')}
              />
            </div>
          </div>

          {/* Detalles de la orden */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Detalle de la Orden</h3>
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

            {/* Totales */}
            <div className="mt-4 flex justify-end">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 min-w-64">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA (16%):</span>
                  <span className="font-medium">{formatCurrency(iva)}</span>
                </div>
                <div className="flex justify-between text-lg border-t pt-2">
                  <span className="font-medium text-gray-900">Total:</span>
                  <span className="font-bold text-primary-600">{formatCurrency(total)}</span>
                </div>
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
              onClick={() => navigate('/ordenes')}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {isEdit ? 'Guardar Cambios' : 'Crear Orden'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
