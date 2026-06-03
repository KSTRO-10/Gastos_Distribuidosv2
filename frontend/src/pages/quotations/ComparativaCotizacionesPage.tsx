import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { Button, PageHeader } from '@/components/ui'
import {
  quotationService,
  ComparativaData,
} from '@/services/quotationService'

const formatCurrency = (value: string | number | null) => {
  if (value === null || value === undefined) return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num)
}

const estadoColors: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  recibida: 'bg-blue-100 text-blue-800',
  seleccionada: 'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
}

export default function ComparativaCotizacionesPage() {
  const navigate = useNavigate()
  const { solicitudId } = useParams()
  const [data, setData] = useState<ComparativaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(false)

  useEffect(() => {
    if (!solicitudId) return
    loadComparativa()
  }, [solicitudId])

  const loadComparativa = async () => {
    try {
      setLoading(true)
      const result = await quotationService.getComparativa(parseInt(solicitudId!))
      setData(result)
    } catch {
      toast.error('Error al cargar la comparativa')
    } finally {
      setLoading(false)
    }
  }

  const handleSeleccionar = async (cotizacionId: number) => {
    try {
      setSelecting(true)
      await quotationService.selectCotizacion(cotizacionId)
      toast.success('Cotización seleccionada como ganadora')
      await loadComparativa()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al seleccionar cotización')
    } finally {
      setSelecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-500">No se encontraron datos.</div>
  }

  const { solicitud, items, proveedores, comparativa, mejores_precios } = data

  const hasCotizaciones = proveedores.length > 0

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate(`/solicitudes/${solicitud.id}`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Volver a solicitud
        </button>

        <PageHeader
          title={`Comparativa — ${solicitud.numero}`}
          subtitle={solicitud.descripcion || 'Comparación de cotizaciones de proveedores'}
        />
      </div>

      {!hasCotizaciones ? (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400" />
          <h3 className="mt-3 text-lg font-medium text-gray-900">Sin cotizaciones</h3>
          <p className="mt-1 text-sm text-gray-500">
            Aún no hay cotizaciones para esta solicitud. Use "Buscar en Catálogos" desde el detalle de la solicitud.
          </p>
          <Button
            className="mt-4"
            onClick={() => navigate(`/solicitudes/${solicitud.id}`)}
          >
            Ir a Solicitud
          </Button>
        </div>
      ) : (
        <>
          {/* Resumen de proveedores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proveedores.map((prov) => {
              const isSelected = prov.estado === 'seleccionada'
              const isRejected = prov.estado === 'rechazada'
              return (
                <div
                  key={prov.id}
                  className={`bg-white shadow rounded-lg p-4 border-2 transition-colors ${
                    isSelected
                      ? 'border-green-500 bg-green-50'
                      : isRejected
                        ? 'border-red-200 opacity-60'
                        : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{prov.nombre}</h3>
                      <p className="text-xs text-gray-500">{prov.cotizacion_numero}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoColors[prov.estado] || 'bg-gray-100'}`}>
                      {prov.estado}
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-bold text-gray-900">{formatCurrency(prov.total)}</p>

                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/cotizaciones/${prov.cotizacion_id}`)}
                    >
                      Ver Detalle
                    </Button>
                    {!isSelected && !isRejected && (
                      <Button
                        size="sm"
                        onClick={() => handleSeleccionar(prov.cotizacion_id)}
                        disabled={selecting}
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Seleccionar
                      </Button>
                    )}
                    {isSelected && (
                      <span className="inline-flex items-center text-sm text-green-700 font-medium">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Ganadora
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Tabla comparativa */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Comparativa por Producto</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Los precios en <span className="text-green-700 font-semibold">verde</span> indican el mejor precio por ítem
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                      Producto
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      COG
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Cant.
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      P. Estimado
                    </th>
                    {proveedores.map(prov => (
                      <th
                        key={prov.id}
                        className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase min-w-[140px]"
                      >
                        {prov.nombre}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item, rowIdx) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 sticky left-0 bg-white z-10">
                        <p className="text-sm font-medium text-gray-900">{item.concepto}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs font-mono text-blue-600">{item.cog_codigo}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-gray-600">
                        {item.cantidad} {item.unidad}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-gray-500">
                        {formatCurrency(item.precio_estimado)}
                      </td>
                      {proveedores.map((_, colIdx) => {
                        const celda = comparativa[rowIdx]?.[colIdx]
                        const isBest = mejores_precios[rowIdx] === colIdx
                        return (
                          <td
                            key={colIdx}
                            className={`px-4 py-3 text-right ${
                              isBest ? 'bg-green-50' : ''
                            }`}
                          >
                            {celda?.tiene_precio ? (
                              <div>
                                <p className={`text-sm font-semibold ${isBest ? 'text-green-700' : 'text-gray-900'}`}>
                                  {formatCurrency(celda.precio_unitario)}
                                </p>
                                <p className="text-xs text-gray-400">
                                  Sub: {formatCurrency(celda.subtotal)}
                                </p>
                                {celda.concepto && (
                                  <p className="text-xs text-gray-400 truncate max-w-[130px]">
                                    {celda.concepto}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-300">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right text-sm text-gray-700 sticky left-0 bg-gray-50 z-10">
                      Total con IVA:
                    </td>
                    {proveedores.map(prov => (
                      <td key={prov.id} className="px-4 py-3 text-right text-sm text-gray-900">
                        {formatCurrency(prov.total)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
