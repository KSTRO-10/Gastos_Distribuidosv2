import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline'
import { Button, Card, Input, TextArea, Select } from '@/components/ui'
import { proveedorPortalService, SolicitudParaCotizar } from '@/services/proveedorPortalService'
import { quotationService, CreateCotizacionData } from '@/services/quotationService'

interface LineaCotizacion {
  detalle_material: number
  concepto: string
  descripcion: string
  cantidad: number
  unidad: string
  precio_unitario: number
  subtotal: number
}

export default function NuevaCotizacionPage() {
  const { solicitudId } = useParams<{ solicitudId: string }>()
  const navigate = useNavigate()

  const [solicitud, setSolicitud] = useState<SolicitudParaCotizar | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    vigencia: '',
    tiempo_entrega: '',
    condiciones_pago: 'Contado',
    notas: '',
  })

  const [lineas, setLineas] = useState<LineaCotizacion[]>([])

  useEffect(() => {
    if (solicitudId) {
      loadSolicitud()
    }
  }, [solicitudId])

  const loadSolicitud = async () => {
    try {
      const data = await proveedorPortalService.getSolicitudesParaCotizar()
      const sol = data.find(s => s.id === Number(solicitudId))
      
      if (!sol) {
        toast.error('Solicitud no encontrada o ya cotizada')
        navigate('/portal/cotizar')
        return
      }

      setSolicitud(sol)
      
      // Inicializar líneas desde los detalles de la solicitud
      const lineasIniciales = sol.detalles.map(det => ({
        detalle_material: det.id,
        concepto: det.concepto,
        descripcion: det.descripcion || '',
        cantidad: det.cantidad,
        unidad: det.unidad,
        precio_unitario: 0,
        subtotal: 0,
      }))
      setLineas(lineasIniciales)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cargar solicitud')
      navigate('/portal/cotizar')
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLineaChange = (index: number, field: keyof LineaCotizacion, value: string | number) => {
    setLineas(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      
      // Recalcular subtotal
      if (field === 'cantidad' || field === 'precio_unitario') {
        const cantidad = field === 'cantidad' ? Number(value) : updated[index].cantidad
        const precio = field === 'precio_unitario' ? Number(value) : updated[index].precio_unitario
        updated[index].subtotal = cantidad * precio
      }
      
      return updated
    })
  }

  const calcularTotales = () => {
    const subtotal = lineas.reduce((sum, l) => sum + l.subtotal, 0)
    const iva = subtotal * 0.16
    const total = subtotal + iva
    return { subtotal, iva, total }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!solicitud) return

    // Validar que todas las líneas tengan precio
    const sinPrecio = lineas.filter(l => l.precio_unitario <= 0)
    if (sinPrecio.length > 0) {
      toast.error('Debe indicar el precio unitario de todos los items')
      return
    }

    setSubmitting(true)
    try {
      // Necesitamos obtener el ID del proveedor
      // El backend asociará automáticamente al proveedor actual
      const response = await proveedorPortalService.getDashboard()
      const proveedorId = response.info_proveedor.id

      const cotizacionData: CreateCotizacionData = {
        solicitud: solicitud.id,
        proveedor: proveedorId,
        fecha: formData.fecha,
        vigencia: formData.vigencia || null,
        tiempo_entrega: formData.tiempo_entrega,
        condiciones_pago: formData.condiciones_pago,
        notas: formData.notas,
        detalles: lineas.map(l => ({
          detalle_material: l.detalle_material,
          concepto: l.concepto,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          unidad: l.unidad,
          precio_unitario: l.precio_unitario,
          subtotal: l.subtotal,
        })),
      }

      await quotationService.createCotizacion(cotizacionData)
      toast.success('Cotización enviada exitosamente')
      navigate('/portal/cotizaciones')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al enviar cotización')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!solicitud) return null

  const totales = calcularTotales()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/portal/cotizar')}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Nueva Cotización</h1>
            <p className="text-gray-500">
              Solicitud {solicitud.numero} - {solicitud.area}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información de la solicitud */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2">Información de la Solicitud</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Número:</span>
              <p className="font-medium text-blue-900">{solicitud.numero}</p>
            </div>
            <div>
              <span className="text-blue-700">Área:</span>
              <p className="font-medium text-blue-900">{solicitud.area}</p>
            </div>
            <div>
              <span className="text-blue-700">Fecha Requerida:</span>
              <p className="font-medium text-blue-900">{solicitud.fecha_requerida || 'No especificada'}</p>
            </div>
            <div>
              <span className="text-blue-700">Total Estimado:</span>
              <p className="font-medium text-blue-900">{formatCurrency(solicitud.total_estimado)}</p>
            </div>
          </div>
          {solicitud.descripcion && (
            <p className="mt-3 text-sm text-blue-800">{solicitud.descripcion}</p>
          )}
        </Card>

        {/* Datos de la cotización */}
        <Card>
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Datos de la Cotización</h3>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Fecha *"
              type="date"
              value={formData.fecha}
              onChange={(e) => handleFieldChange('fecha', e.target.value)}
              required
            />
            <Input
              label="Vigencia"
              type="date"
              value={formData.vigencia}
              onChange={(e) => handleFieldChange('vigencia', e.target.value)}
            />
            <Input
              label="Tiempo de Entrega"
              placeholder="Ej: 5 días hábiles"
              value={formData.tiempo_entrega}
              onChange={(e) => handleFieldChange('tiempo_entrega', e.target.value)}
            />
            <Select
              label="Condiciones de Pago"
              value={formData.condiciones_pago}
              onChange={(e) => handleFieldChange('condiciones_pago', e.target.value)}
              options={[
                { value: 'Contado', label: 'Contado' },
                { value: 'Crédito 15 días', label: 'Crédito 15 días' },
                { value: 'Crédito 30 días', label: 'Crédito 30 días' },
                { value: 'Crédito 45 días', label: 'Crédito 45 días' },
                { value: '50% anticipo', label: '50% anticipo' },
              ]}
            />
          </div>
        </Card>

        {/* Líneas de cotización */}
        <Card>
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Items a Cotizar</h3>
            <p className="text-sm text-gray-500">Ingrese el precio unitario para cada item</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">Cantidad</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">Unidad</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">Precio Unitario *</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">Subtotal</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lineas.map((linea, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{linea.concepto}</p>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={linea.descripcion}
                        onChange={(e) => handleLineaChange(index, 'descripcion', e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Descripción adicional"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-900">{linea.cantidad}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-500">{linea.unidad}</span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={linea.precio_unitario || ''}
                        onChange={(e) => handleLineaChange(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                        className="w-full text-sm text-right border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        placeholder="0.00"
                        required
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(linea.subtotal)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(totales.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">IVA (16%):</span>
                  <span className="font-medium">{formatCurrency(totales.iva)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-300">
                  <span>Total:</span>
                  <span className="text-primary-600">{formatCurrency(totales.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Notas */}
        <Card className="p-4">
          <TextArea
            label="Notas Adicionales"
            value={formData.notas}
            onChange={(e) => handleFieldChange('notas', e.target.value)}
            rows={3}
            placeholder="Incluya cualquier información adicional relevante para esta cotización..."
          />
        </Card>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/portal/cotizar')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting}
          >
            <DocumentCheckIcon className="h-5 w-5 mr-2" />
            {submitting ? 'Enviando...' : 'Enviar Cotización'}
          </Button>
        </div>
      </form>
    </div>
  )
}
