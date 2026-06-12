import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'
import Button from '../../components/ui/Button'
import { devolucionesService } from '../../services/devolucionesService'
import { areaService } from '../../services/areaService'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { inventoryService } from '../../services/inventoryService'
import { ICreateDevolucionInterna } from '../../types/inventory'

export default function DevolucionCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [almacenes, setAlmacenes] = useState<any[]>([])
  const [articulos, setArticulos] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [salidas, setSalidas] = useState<any[]>([])
  const [salidaSeleccionada, setSalidaSeleccionada] = useState<any | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [formData, setFormData] = useState<ICreateDevolucionInterna | null>(null)

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<ICreateDevolucionInterna>({
    defaultValues: {
      notas: '',
      salida_origen: null,
      detalles: [{ articulo: 0, cantidad: 1 }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'detalles'
  })

  const watchSalida = watch('salida_origen')

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [areasData, articulosData, salidasData] = await Promise.all([
          areaService.getAreas(),
          inventoryService.getArticulos(),
          inventoryService.getSalidas()
        ])
        
        setAreas(areasData.filter(a => !a.codigo.startsWith('ALM')))
        setAlmacenes(areasData.filter(a => a.codigo.startsWith('ALM') || a.nombre.toLowerCase().includes('almac')))
        setArticulos(articulosData)
        setSalidas(salidasData.filter((s: any) => s.confirmada)) // Solo podemos devolver cosas que ya recibimos físicamente
      } catch (error) {
        toast.error('Error al cargar dependencias del formulario')
      }
    }
    fetchDependencies()
  }, [])

  useEffect(() => {
    if (watchSalida) {
      const salida = salidas.find((s: any) => s.id === Number(watchSalida))
      setSalidaSeleccionada(salida || null)
      // Limpiar detalles actuales
      remove()
      if (salida) {
        // Pre-poblar
        salida.detalles.forEach((d: any) => {
          append({ articulo: d.articulo, cantidad: d.cantidad })
        })
      }
    } else {
      setSalidaSeleccionada(null)
    }
  }, [watchSalida, salidas])

  const onPreSubmit = (data: ICreateDevolucionInterna) => {
    // Clean up empty lines and parse numbers
      const cleanedData = {
        ...data,
        area_origen: Number(data.area_origen),
        almacen_destino: Number(data.almacen_destino),
        detalles: data.detalles.filter(d => d.articulo > 0 && d.cantidad > 0).map(d => ({
        articulo: Number(d.articulo),
        cantidad: Number(d.cantidad)
      }))
    }

    if (cleanedData.detalles.length === 0) {
      toast.error('Debe incluir al menos un artículo válido.')
      return
    }

    // Validar cantidad no exceda la salida
    if (salidaSeleccionada) {
      for (const d of cleanedData.detalles) {
        const itemSalida = salidaSeleccionada.detalles.find((sd: any) => sd.articulo === d.articulo)
        if (!itemSalida) {
          toast.error('Un artículo ingresado no corresponde a la salida de almacén origen.')
          return
        }
        if (d.cantidad > itemSalida.cantidad) {
          toast.error(`La cantidad del artículo excedió la entregada originalmente (${itemSalida.cantidad}).`)
          return
        }
      }
    }

    setFormData(cleanedData)
    setIsConfirmOpen(true)
  }

  const handleConfirmSubmit = async () => {
    if (!formData) return

    try {
      setLoading(true)
      setIsConfirmOpen(false)

      await devolucionesService.createDevolucion(formData)
      toast.success('Devolución creada exitosamente.')
      navigate('/inventario/devoluciones')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Hubo un error al procesar la devolución.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Crear Devolución"
        subtitle="Registrar retorno de artículos al almacén"
        icon={<ArrowLeftIcon className="h-6 w-6" />}
        breadcrumbs={[{ label: 'Devoluciones', href: '/inventario/devoluciones' }, { label: 'Nueva' }]}
      />

      <form onSubmit={handleSubmit(onPreSubmit)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Salida Origen (Opcional)</label>
            <select
              {...register('salida_origen')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Ninguna (Devolución Libre)</option>
              {salidas.map(s => (
                <option key={s.id} value={s.id}>{s.numero} - {s.almacen_nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Área Origen</label>
            <select
              {...register('area_origen', { required: 'Selecciona el área de origen' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Seleccione...</option>
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {errors.area_origen && <p className="mt-1 text-sm text-red-600">{errors.area_origen.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Almacén Destino</label>
            <select
              {...register('almacen_destino', { required: 'Selecciona el almacén destino' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Seleccione...</option>
              {almacenes.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {errors.almacen_destino && <p className="mt-1 text-sm text-red-600">{errors.almacen_destino.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Notas / Motivo</label>
          <textarea
            {...register('notas')}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Opcional. Escriba algún comentario sobre la devolución..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Artículos a Devolver</h3>
            <Button
              type="button"
              variant="secondary"
              onClick={() => append({ articulo: 0, cantidad: 1 })}
            >
              <PlusIcon className="h-4 w-4 mr-2" /> Agregar Fila
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div className="flex-1">
                  <select
                    {...register(`detalles.${index}.articulo` as const, { required: true })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value={0}>Seleccione artículo...</option>
                    {salidaSeleccionada 
                      ? salidaSeleccionada.detalles.map((a: any) => (
                          <option key={a.articulo} value={a.articulo}>{a.articulo_nombre} (Máx: {a.cantidad})</option>
                        ))
                      : articulos.map(a => (
                          <option key={a.id} value={a.id}>{a.nombre} ({a.codigo})</option>
                        ))}
                  </select>
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    min="1"
                    {...register(`detalles.${index}.cantidad` as const, { required: true, min: 1 })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Cantidad"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
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
            onClick={() => navigate('/inventario/devoluciones')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Crear Devolución'}
          </Button>
        </div>
      </form>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirmar Devolución"
        message="¿Estás seguro de registrar esta devolución? Los artículos quedarán pendientes de recepción por el Almacén."
        confirmText="Sí, enviar"
        type="info"
        isLoading={loading}
      />
    </div>
  )
}
