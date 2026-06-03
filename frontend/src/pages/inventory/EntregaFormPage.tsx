import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { inventoryService, CreateEntregaData } from '../../services/inventoryService'
import { orderService, OrdenCompra, DetalleOrden } from '../../services/orderService'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface EntregaFormData {
  orden: string
  factura: string
  fecha_recepcion: string
  notas: string
  completa: boolean
  detalles: {
    detalle_orden: number
    concepto: string
    cantidad_ordenada: number
    cantidad_pendiente: number
    cantidad_recibida: number
    notas: string
    condicion_buena: boolean
    observaciones_condicion: string
  }[]
}

export default function EntregaFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [selectedOrden, setSelectedOrden] = useState<OrdenCompra | null>(null)
  const [evidencias, setEvidencias] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [evidenciaError, setEvidenciaError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [searchParams] = useSearchParams()
  const preSelectedOrdenId = searchParams.get('orden')

  // Calculate local time for default value
  const getLocalISOString = () => {
    const tzOffset = new Date().getTimezoneOffset() * 60000
    return new Date(Date.now() - tzOffset).toISOString().slice(0, 16)
  }

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<EntregaFormData>({
    defaultValues: {
      orden: preSelectedOrdenId || '',
      factura: '',
      fecha_recepcion: getLocalISOString(),
      notas: '',
      completa: false,
      detalles: []
    }
  })

  const { fields, replace } = useFieldArray({
    control,
    name: 'detalles'
  })

  const watchOrden = watch('orden')

  useEffect(() => {
    loadOrdenes()
  }, [])

  useEffect(() => {
    if (watchOrden && !isEditing) {
      const orden = ordenes.find(o => o.id === Number(watchOrden))
      if (orden) {
        setSelectedOrden(orden)
        loadOrdenDetalles(orden)
      }
    } else if (preSelectedOrdenId && !watchOrden && ordenes.length > 0) {
      // Ensure the form value is set if it was passed via URL but not yet picked up by defaultValues
      setValue('orden', preSelectedOrdenId)
    }
  }, [watchOrden, ordenes, isEditing, preSelectedOrdenId, setValue])

  const loadOrdenes = async () => {
    try {
      const data = await orderService.getOrdenes()
      // Solo órdenes confirmadas o parcialmente entregadas
      const ordenesValidas = data.filter(o =>
        o.estado === 'confirmada' || o.estado === 'parcial'
      )
      setOrdenes(ordenesValidas)
    } catch (err) {
      console.error('Error al cargar órdenes:', err)
    }
  }

  const loadOrdenDetalles = (orden: OrdenCompra) => {
    const detallesForm = orden.detalles
      .filter(d => (d.cantidad_pendiente || d.cantidad - (d.cantidad_recibida || 0)) > 0)
      .map((d: DetalleOrden) => ({
        detalle_orden: d.id || 0,
        concepto: d.concepto,
        cantidad_ordenada: d.cantidad,
        cantidad_pendiente: d.cantidad_pendiente || d.cantidad - (d.cantidad_recibida || 0),
        cantidad_recibida: d.cantidad_pendiente || d.cantidad - (d.cantidad_recibida || 0),
        notas: '',
        condicion_buena: true,
        observaciones_condicion: ''
      }))

    replace(detallesForm)
  }

  const handleAddEvidencias = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles = Array.from(files)
    const validFiles = newFiles.filter(f => f.type.startsWith('image/'))
    
    if (validFiles.length !== newFiles.length) {
      toast.error('Solo se permiten archivos de imagen (JPG, PNG, WebP)')
    }

    setEvidencias(prev => [...prev, ...validFiles])
    
    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })

    setEvidenciaError('')
    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveEvidencia = (index: number) => {
    setEvidencias(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: EntregaFormData) => {
    // Validar que haya al menos una foto de evidencia
    if (evidencias.length === 0 && !isEditing) {
      setEvidenciaError('Debes subir al menos una foto de evidencia de la entrega')
      toast.error('Se requiere al menos una foto de evidencia')
      return
    }

    try {
      setLoading(true)
      setError('')

      const payload: CreateEntregaData = {
        orden: Number(data.orden),
        factura: data.factura ? Number(data.factura) : null,
        fecha_recepcion: data.fecha_recepcion,
        notas: data.notas,
        completa: data.completa,
        detalles: data.detalles
          .filter(d => d.cantidad_recibida > 0)
          .map(d => ({
            detalle_orden: d.detalle_orden,
            cantidad_recibida: d.cantidad_recibida,
            notas: d.notas,
            condicion_buena: d.condicion_buena,
            observaciones_condicion: d.observaciones_condicion
          }))
      }

      let result
      if (isEditing) {
        result = await inventoryService.updateEntrega(Number(id), payload)
      } else {
        result = await inventoryService.createEntregaWithEvidence(payload, evidencias)
      }

      toast.success('Entrega registrada con evidencia fotográfica')
      navigate(`/inventario/entregas/${result.id}`)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      setError(error.response?.data?.detail || 'Error al guardar la entrega')
      toast.error(error.response?.data?.detail || 'Error al guardar la entrega')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Entrega' : 'Nueva Entrega de Bienes'}
        </h1>
        <Button variant="secondary" onClick={() => navigate('/inventario/entregas')}>
          Cancelar
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Selección de Orden */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Información de la Entrega</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Orden de Compra *"
              {...register('orden', { required: 'Seleccione una orden' })}
              error={errors.orden?.message}
              disabled={isEditing}
              placeholder="Seleccione una orden"
              options={ordenes.map(orden => ({
                value: orden.id,
                label: `${orden.numero} - ${orden.proveedor_nombre}`
              }))}
            />

            <Input
              label="Fecha de Recepción *"
              type="datetime-local"
              {...register('fecha_recepcion', { required: 'Campo requerido' })}
              error={errors.fecha_recepcion?.message}
            />
          </div>

          <div className="mt-4">
            <Input
              label="Notas"
              {...register('notas')}
              placeholder="Observaciones generales de la recepción"
            />
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('completa')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Entrega completa (todos los items de la orden)</span>
            </label>
          </div>
        </div>

        {/* Info de la Orden Seleccionada */}
        {selectedOrden && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Orden Seleccionada</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Número:</span>
                <p className="font-medium">{selectedOrden.numero}</p>
              </div>
              <div>
                <span className="text-gray-600">Proveedor:</span>
                <p className="font-medium">{selectedOrden.proveedor_nombre}</p>
              </div>
              <div>
                <span className="text-gray-600">Total:</span>
                <p className="font-medium">${Number(selectedOrden.total).toLocaleString('es-MX')}</p>
              </div>
              <div>
                <span className="text-gray-600">Estado:</span>
                <p className="font-medium">{selectedOrden.estado_display}</p>
              </div>
            </div>
          </div>
        )}

        {/* Detalles de la Entrega */}
        {fields.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Detalle de Recepción</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ordenado</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Recibido</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Condición</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fields.map((field, index) => (
                    <tr key={field.id}>
                      <td className="px-3 py-4 text-sm text-gray-900">
                        {field.concepto}
                        <input type="hidden" {...register(`detalles.${index}.detalle_orden`)} />
                      </td>
                      <td className="px-3 py-4 text-sm text-center text-gray-600">
                        {Number(field.cantidad_ordenada).toString()}
                      </td>
                      <td className="px-3 py-4 text-sm text-center text-orange-600 font-medium">
                        {Number(field.cantidad_pendiente).toString()}
                      </td>
                      <td className="px-3 py-4">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={field.cantidad_pendiente}
                          {...register(`detalles.${index}.cantidad_recibida`, {
                            valueAsNumber: true,
                            min: 0,
                            max: field.cantidad_pendiente
                          })}
                          className="w-20 text-center border rounded-md px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-4 text-center">
                        <select
                          {...register(`detalles.${index}.condicion_buena`)}
                          className="border rounded-md px-2 py-1 text-sm"
                        >
                          <option value="true">Buena</option>
                          <option value="false">Dañado</option>
                        </select>
                      </td>
                      <td className="px-3 py-4">
                        <input
                          type="text"
                          {...register(`detalles.${index}.notas`)}
                          placeholder="Observaciones"
                          className="w-full border rounded-md px-2 py-1 text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Evidencia Fotográfica (Obligatoria) */}
        {!isEditing && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Evidencia Fotográfica <span className="text-red-500">*</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Sube al menos una foto como evidencia de la recepción de bienes
                </p>
              </div>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                evidencias.length > 0 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {evidencias.length} {evidencias.length === 1 ? 'foto' : 'fotos'}
              </span>
            </div>

            {evidenciaError && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {evidenciaError}
              </div>
            )}

            {/* Previews de imágenes seleccionadas */}
            {previews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Evidencia ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      title="Eliminar foto"
                      onClick={() => handleRemoveEvidencia(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-gray-500 mt-1 truncate">{evidencias[index]?.name}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Zona de subida */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                evidenciaError
                  ? 'border-red-300 bg-red-50 hover:border-red-400'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <PhotoIcon className={`w-10 h-10 mx-auto mb-3 ${
                evidenciaError ? 'text-red-400' : 'text-gray-400'
              }`} />
              <p className={`text-sm font-medium ${
                evidenciaError ? 'text-red-600' : 'text-gray-600'
              }`}>
                Haz clic para seleccionar fotos
              </p>
              <p className="text-xs text-gray-400 mt-1">
                JPG, PNG o WebP — puedes seleccionar varias a la vez
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleAddEvidencias}
              className="hidden"
              aria-label="Seleccionar fotos de evidencia"
            />
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate('/inventario/entregas')}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {isEditing ? 'Actualizar' : 'Registrar Entrega'}
          </Button>
        </div>
      </form>
    </div>
  )
}
