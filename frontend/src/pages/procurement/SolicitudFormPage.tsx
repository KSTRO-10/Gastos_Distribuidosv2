import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import toast from 'react-hot-toast'
import { PlusIcon, TrashIcon, ArrowLeftIcon, ExclamationTriangleIcon, IdentificationIcon } from '@heroicons/react/24/outline'
import { Button, Input, Select, Modal, CogCombobox } from '@/components/ui'
import { procurementService, Cog, CreateSolicitudData } from '@/services/procurementService'
import { areaService, Area } from '@/services/areaService'
import { useAuthStore } from '@/stores/authStore'

interface DetalleForm {
  concepto: string
  descripcion: string
  cantidad: number
  unidad: string
  cog: number
  precio_estimado: number
  notas: string
}

interface SolicitudForm {
  area: number
  fecha_solicitud: string
  descripcion: string
  justificacion: string
  urgente: boolean
  fecha_requerida: string
  eje_rector: string
  programa_presupuestario: string
  actividad: string
  detalles: DetalleForm[]
}

export default function SolicitudFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showIneModal, setShowIneModal] = useState(false)
  const [ineFoto, setIneFoto] = useState<File | null>(null)
  const [inePreview, setInePreview] = useState<string | null>(null)
  const [pendingFormData, setPendingFormData] = useState<SolicitudForm | null>(null)
  const [pendingSendDirectly, setPendingSendDirectly] = useState(false)
  const [areas, setAreas] = useState<Area[]>([])
  const [cogs, setCogs] = useState<Cog[]>([])
  const { user, updateUser } = useAuthStore()
  const ineExempt = user?.role === 'admin' || user?.role === 'adquisiciones'

  // Opciones predefinidas de unidades
  const unidadOptions = [
    { value: 'Pieza', label: 'Pieza' },
    { value: 'Piezas', label: 'Piezas' },
    { value: 'Kg', label: 'Kilogramo (Kg)' },
    { value: 'Lt', label: 'Litro (Lt)' },
    { value: 'Caja', label: 'Caja' },
    { value: 'Paquete', label: 'Paquete' },
    { value: 'Metro', label: 'Metro' },
    { value: 'Rollo', label: 'Rollo' },
    { value: 'Par', label: 'Par' },
    { value: 'Juego', label: 'Juego' },
    { value: 'Servicio', label: 'Servicio' },
    { value: 'Unidad', label: 'Unidad' },
    { value: 'Bolsa', label: 'Bolsa' },
    { value: 'Galón', label: 'Galón' },
    { value: 'Otro', label: 'Otro' },
  ]

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<SolicitudForm>({
    defaultValues: {
      area: 0,
      fecha_solicitud: new Date().toISOString().split('T')[0],
      descripcion: '',
      justificacion: '',
      urgente: false,
      fecha_requerida: '',
      eje_rector: '',
      programa_presupuestario: '',
      actividad: '',
      detalles: [{ concepto: '', descripcion: '', cantidad: 1, unidad: 'Pieza', cog: 0, precio_estimado: 0, notas: '' }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'detalles'
  })

  const watchDetalles = watch('detalles')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [areasData, cogsData] = await Promise.all([
          areaService.getAreas(),
          procurementService.getCogs()
        ])
        setAreas(areasData)
        setCogs(cogsData)

        if (isEditing && id) {
          const solicitud = await procurementService.getSolicitud(parseInt(id))
          setValue('area', solicitud.area)
          setValue('fecha_solicitud', solicitud.fecha_solicitud)
          setValue('descripcion', solicitud.descripcion)
          setValue('justificacion', solicitud.justificacion)
          setValue('urgente', solicitud.urgente)
          setValue('fecha_requerida', solicitud.fecha_requerida || '')
          setValue('eje_rector', solicitud.eje_rector || '')
          setValue('programa_presupuestario', solicitud.programa_presupuestario || '')
          setValue('actividad', solicitud.actividad || '')
          setValue('detalles', solicitud.detalles.map(d => ({
            concepto: d.concepto,
            descripcion: d.descripcion,
            cantidad: d.cantidad,
            unidad: d.unidad,
            cog: d.cog,
            precio_estimado: d.precio_estimado,
            notas: d.notas
          })))
        }
      } catch (error) {
        toast.error('Error al cargar los datos')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, isEditing, setValue])

  const onSubmit = async (data: SolicitudForm, sendDirectly: boolean = false) => {
    if (data.detalles.length === 0) {
      toast.error('Agrega al menos un material a la solicitud')
      return
    }

    // If user has no INE photo on file and not editing, show INE modal (admin/adquisiciones exempt)
    if (!ineExempt && !isEditing && !user?.ine_documento && !ineFoto) {
      setPendingFormData(data)
      setPendingSendDirectly(sendDirectly)
      setShowIneModal(true)
      return
    }

    setSubmitting(true)
    try {
      const payload: CreateSolicitudData = {
        ...data,
        fecha_requerida: data.fecha_requerida || null,
        eje_rector: data.eje_rector || null,
        programa_presupuestario: data.programa_presupuestario || null,
        actividad: data.actividad || null,
        detalles: data.detalles.map(d => ({
          concepto: d.concepto,
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          unidad: d.unidad,
          cog: d.cog,
          precio_estimado: d.precio_estimado,
          notas: d.notas
        }))
      }

      if (isEditing && id) {
        await procurementService.updateSolicitud(parseInt(id), payload)
        toast.success('Solicitud actualizada correctamente')
      } else {
        const created = await procurementService.createSolicitud(payload, ineFoto || undefined)

        if (!ineExempt && !user?.ine_documento && ineFoto) {
          // User just uploaded INE - update local store
          updateUser({ ine_rechazada: false, ine_rechazo_motivo: '' })
          toast.success('Solicitud creada. Tu INE será verificada por un administrador.')
        } else if (!ineExempt && !user?.ine_verificada) {
          toast.success('Solicitud creada. Tu INE será verificada por un administrador.')
        } else if (sendDirectly) {
          await procurementService.enviarSolicitud(created.id)
          toast.success('Solicitud creada y enviada correctamente')
        } else {
          toast.success('Solicitud guardada como borrador')
        }
      }
      navigate('/solicitudes')
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail ||
        error.response?.data?.message ||
        Object.values(error.response?.data || {})[0] ||
        'Error al guardar la solicitud'
      toast.error(String(errorMsg))
    } finally {
      setSubmitting(false)
      setShowConfirmModal(false)
      setShowIneModal(false)
      setPendingFormData(null)
      setPendingSendDirectly(false)
      setIneFoto(null)
      setInePreview(null)
    }
  }

  // Manejador para guardar como borrador
  const handleSaveDraft = (data: SolicitudForm) => {
    onSubmit(data, false)
  }

  // Manejador para abrir modal de confirmación de envío directo
  const handleSendDirectly = (data: SolicitudForm) => {
    // If user has no INE on file, the INE modal will handle the flow
    if (!ineExempt && !user?.ine_documento) {
      setPendingFormData(data)
      setPendingSendDirectly(true)
      setShowIneModal(true)
      return
    }
    setPendingFormData(data)
    setShowConfirmModal(true)
  }

  // Confirmar envío directo
  const confirmSendDirectly = () => {
    if (pendingFormData) {
      onSubmit(pendingFormData, true)
    }
  }

  const handleIneFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIneFoto(file)
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => setInePreview(reader.result as string)
        reader.readAsDataURL(file)
      } else {
        setInePreview(null) // It's a PDF, handle preview differently
      }
    }
  }

  // Confirm INE upload and proceed with solicitud creation
  const confirmIneUpload = () => {
    if (!ineFoto) {
      toast.error('Debes seleccionar una foto de tu INE')
      return
    }
    setShowIneModal(false)
    if (pendingFormData) {
      onSubmit(pendingFormData, pendingSendDirectly)
    }
  }

  const addDetalle = () => {
    append({ concepto: '', descripcion: '', cantidad: 1, unidad: 'Pieza', cog: 0, precio_estimado: 0, notas: '' })
  }

  const calculateTotal = () => {
    return watchDetalles.reduce((sum, d) => sum + (d.cantidad * d.precio_estimado), 0)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/solicitudes')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Volver a solicitudes
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar Solicitud' : 'Nueva Solicitud de Material'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(handleSaveDraft)} className="space-y-6">
        {/* Datos generales */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Datos Generales</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Área solicitante *"
              options={areas.map(a => ({ value: a.id, label: a.nombre }))}
              placeholder="Selecciona un área"
              {...register('area', { required: 'El área es requerida', valueAsNumber: true })}
              error={errors.area?.message}
            />

            <Input
              label="Fecha de solicitud *"
              type="date"
              {...register('fecha_solicitud', { required: 'La fecha es requerida' })}
              error={errors.fecha_solicitud?.message}
            />

            <Input
              label="Fecha requerida"
              type="date"
              {...register('fecha_requerida')}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <Input
              label="Descripción"
              placeholder="Descripción breve de la solicitud"
              {...register('descripcion')}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Justificación</label>
              <textarea
                {...register('justificacion')}
                rows={3}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="Justificación de la solicitud de material"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                {...register('urgente')}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">Marcar como urgente</span>
            </label>
          </div>

          <h3 className="text-md font-medium text-gray-900 mt-6 mb-4 border-t pt-4">Clasificación Presupuestaria (Opcional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Eje Rector"
              placeholder="Ej. Eje 1. Desarrollo..."
              {...register('eje_rector')}
            />
            <Input
              label="Programa Presupuestario"
              placeholder="Ej. Programa Nacional..."
              {...register('programa_presupuestario')}
            />
            <Input
              label="Actividad"
              placeholder="Ej. Actividad 1.1..."
              {...register('actividad')}
            />
          </div>
        </div>

        {/* Detalle de materiales */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Materiales Solicitados</h2>
            <Button type="button" size="sm" onClick={addDetalle}>
              <PlusIcon className="h-4 w-4 mr-1" />
              Agregar Material
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay materiales agregados. Haz clic en "Agregar Material" para comenzar.
            </p>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-500">Material #{index + 1}</span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700"
                        title="Eliminar material"
                        aria-label={`Eliminar material ${index + 1}`}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                      <Input
                        label="Concepto *"
                        placeholder="Nombre del material"
                        {...register(`detalles.${index}.concepto`, { required: 'Requerido' })}
                        error={errors.detalles?.[index]?.concepto?.message}
                      />
                    </div>

                    <Input
                      label="Cantidad *"
                      type="number"
                      step="0.01"
                      min="0.01"
                      {...register(`detalles.${index}.cantidad`, {
                        required: 'Requerido',
                        valueAsNumber: true,
                        min: { value: 0.01, message: 'Mínimo 0.01' }
                      })}
                      error={errors.detalles?.[index]?.cantidad?.message}
                    />

                    <Select
                      label="Unidad *"
                      options={unidadOptions}
                      placeholder="Selecciona unidad"
                      {...register(`detalles.${index}.unidad`, { required: 'Requerido' })}
                      error={errors.detalles?.[index]?.unidad?.message}
                    />

                    <CogCombobox
                      label="COG *"
                      options={Array.isArray(cogs) ? cogs : []}
                      value={watchDetalles[index]?.cog || null}
                      onChange={(cogId) => setValue(`detalles.${index}.cog`, cogId || 0, { shouldValidate: true })}
                      error={errors.detalles?.[index]?.cog?.message}
                    />

                    {/* Hidden input para react-hook-form validation */}
                    <input
                      type="hidden"
                      {...register(`detalles.${index}.cog`, { required: 'Requerido', validate: v => v !== 0 || 'Selecciona un COG' })}
                    />

                    <Input
                      label="Precio estimado"
                      type="number"
                      step="0.01"
                      min="0"
                      {...register(`detalles.${index}.precio_estimado`, { valueAsNumber: true })}
                    />

                    <div className="lg:col-span-2">
                      <Input
                        label="Descripción adicional"
                        placeholder="Especificaciones del material"
                        {...register(`detalles.${index}.descripcion`)}
                      />
                    </div>
                  </div>

                  <div className="mt-2 text-right text-sm text-gray-500">
                    Subtotal: {formatCurrency((watchDetalles[index]?.cantidad || 0) * (watchDetalles[index]?.precio_estimado || 0))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {fields.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 text-right">
              <span className="text-lg font-medium text-gray-900">
                Total Estimado: {formatCurrency(calculateTotal())}
              </span>
            </div>
          )}
        </div>

        {/* Sección de INE directamente en el formulario */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Identificación Oficial (INE)</h2>
          {user?.ine_documento && !ineFoto ? (
            <div className="flex items-center space-x-3 bg-green-50 p-4 rounded-lg border border-green-200">
              <IdentificationIcon className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">INE ya proporcionada</p>
                <a href={user.ine_documento} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline">
                  Ver documento subido
                </a>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-2">Para procesar la solicitud, es necesario adjuntar tu INE (Formato PDF o Imagen).</p>
              <div className="flex items-center space-x-4">
                <label className="cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm py-2 px-4 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <IdentificationIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <span>{ineFoto ? 'Cambiar archivo' : 'Seleccionar archivo...'}</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleIneFileChange}
                    className="hidden"
                  />
                </label>
                {ineFoto && (
                  <span className="text-sm text-primary-600 font-medium">
                    {ineFoto.name}
                  </span>
                )}
              </div>
              {inePreview && (
                <div className="mt-4">
                  <img src={inePreview} alt="Preview INE" className="max-h-48 rounded-lg border border-gray-200" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/solicitudes')}>
            Cancelar
          </Button>
          {!isEditing && (
            <Button
              type="button"
              variant="secondary"
              loading={submitting}
              onClick={handleSubmit(handleSaveDraft)}
            >
              Guardar Borrador
            </Button>
          )}
          <Button
            type="button"
            loading={submitting}
            onClick={handleSubmit(isEditing ? handleSaveDraft : handleSendDirectly)}
          >
            {isEditing ? 'Actualizar Solicitud' : 'Enviar Solicitud'}
          </Button>
        </div>
      </form>

      {/* Modal de confirmación para envío directo */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirmar Envío de Solicitud"
        size="md"
      >
        <div className="text-center py-4">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
            <ExclamationTriangleIcon className="h-10 w-10 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ¿Estás seguro de enviar esta solicitud?
          </h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800 font-medium">
              ⚠️ Una vez enviada, NO podrás modificar la solicitud.
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Asegúrate de que todos los datos sean correctos antes de continuar.
            </p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Si necesitas hacer cambios después, deberás cancelar esta solicitud y crear una nueva.
          </p>
          <div className="flex justify-center space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowConfirmModal(false)}
            >
              Revisar de nuevo
            </Button>
            <Button
              onClick={confirmSendDirectly}
              loading={submitting}
            >
              Sí, Enviar Solicitud
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de verificación INE */}
      <Modal
        isOpen={showIneModal}
        onClose={() => { setShowIneModal(false); setPendingFormData(null); setPendingSendDirectly(false) }}
        title="Verificación de Identidad (INE)"
        size="md"
      >
        <div className="py-4">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
            <IdentificationIcon className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
            Es la primera vez que creas una solicitud
          </h3>
          <p className="text-sm text-gray-600 mb-4 text-center">
            Adjunta tu documento INE en formato PDF o Imagen para continuar. Un administrador verificará tu identidad antes de procesar la solicitud.
          </p>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {inePreview ? (
              <div className="space-y-3">
                <img src={inePreview} alt="Vista previa INE" className="mx-auto max-h-48 rounded-lg" />
                <p className="text-sm text-green-600 font-medium">Imagen seleccionada</p>
                <button
                  type="button"
                  onClick={() => { setIneFoto(null); setInePreview(null) }}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  Cambiar documento
                </button>
              </div>
            ) : ineFoto ? (
              <div className="space-y-3">
                <div className="bg-gray-100 p-3 rounded text-sm text-gray-700 border border-gray-200">
                  {ineFoto.name}
                </div>
                <p className="text-sm text-green-600 font-medium">Documento seleccionado</p>
                <button
                  type="button"
                  onClick={() => { setIneFoto(null); setInePreview(null) }}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  Cambiar documento
                </button>
              </div>
            ) : (
              <div>
                <IdentificationIcon className="mx-auto h-12 w-12 text-gray-400" />
                <label className="mt-2 cursor-pointer">
                  <span className="text-sm font-medium text-primary-600 hover:text-primary-500">
                    Seleccionar documento de INE
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleIneFileChange}
                    className="hidden"
                  />
                </label>
                <p className="mt-1 text-xs text-gray-500">Imagen o PDF</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-center space-x-3 mt-6">
            <Button
              variant="secondary"
              onClick={() => { setShowIneModal(false); setPendingFormData(null); setPendingSendDirectly(false) }}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmIneUpload}
              disabled={!ineFoto}
              loading={submitting}
            >
              Continuar con la solicitud
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
