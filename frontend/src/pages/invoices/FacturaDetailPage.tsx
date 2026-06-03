import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { facturaService, Factura } from '../../services/facturaService'
import { areaService, Area } from '../../services/areaService'
import {
  treasuryService,
  ItemSolicitudGastoForm,
  SolicitudGastoForm,
  SolicitudPagoForm,
  SolicitudGastoDetail,
} from '../../services/treasuryService'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

const statusColors: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-800',
  procesando: 'bg-blue-100 text-blue-800',
  procesada: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800',
  distribuida: 'bg-purple-100 text-purple-800',
}

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente de procesar',
  procesando: 'Procesando...',
  procesada: 'Procesada correctamente',
  error: 'Error en procesamiento',
  distribuida: 'Distribuida a áreas',
}

const emptyGastoItem = (): ItemSolicitudGastoForm => ({
  area: 0,
  clave_presupuestaria: '',
  concepto_bien: '',
  descripcion_adquirido: '',
  cantidad: 0,
  precio_unitario: 0,
  costo_total: 0,
  unidad: 'Pieza',
})

const emptyGastoForm = (facturaId: number): SolicitudGastoForm => ({
  factura: facturaId,
  fondo_programa: '',
  tipo_material: '',
  items: [emptyGastoItem()],
})

const emptyPagoForm = (solicitudGastoId: number): SolicitudPagoForm => ({
  solicitud_gasto: solicitudGastoId,
  banco: '',
  numero_cuenta: '',
  cog_clave: '',
  cog_nombre: '',
  items: [],
})

export default function FacturaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [factura, setFactura] = useState<Factura | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Treasury state
  const [areas, setAreas] = useState<Area[]>([])
  const [showGastoModal, setShowGastoModal] = useState(false)
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [gastoLoading, setGastoLoading] = useState(false)
  const [pagoLoading, setPagoLoading] = useState(false)
  const [gastoForm, setGastoForm] = useState<SolicitudGastoForm | null>(null)
  const [pagoForm, setPagoForm] = useState<SolicitudPagoForm | null>(null)
  const [selectedGasto, setSelectedGasto] = useState<SolicitudGastoDetail | null>(null)

  useEffect(() => {
    if (id) {
      loadFactura()
      loadAreas()
    }
  }, [id])

  const loadFactura = async () => {
    try {
      setLoading(true)
      const data = await facturaService.getFactura(Number(id))
      setFactura(data)
    } catch (err) {
      setError('Error al cargar la factura')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadAreas = async () => {
    try {
      const data = await areaService.getAreas()
      setAreas(data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleReprocess = async () => {
    if (!factura || !confirm('¿Reprocesar esta factura?')) return

    try {
      setActionLoading(true)
      await facturaService.reprocessFactura(factura.id)
      await loadFactura()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error || 'Error al reprocesar')
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadGasto = async (gastoId: number, numero: string) => {
    try {
      setPdfLoading(`gasto-${gastoId}`)
      await treasuryService.downloadSolicitudGastoPdf(gastoId, numero)
      toast.success('PDF descargado correctamente')
    } catch (err) {
      toast.error('Error al descargar la solicitud de gasto')
      console.error(err)
    } finally {
      setPdfLoading(null)
    }
  }

  const handleDownloadPago = async (pagoId: number, numero: string) => {
    try {
      setPdfLoading(`pago-${pagoId}`)
      await treasuryService.downloadSolicitudPagoPdf(pagoId, numero)
      toast.success('PDF descargado correctamente')
    } catch (err) {
      toast.error('Error al descargar la solicitud de pago')
      console.error(err)
    } finally {
      setPdfLoading(null)
    }
  }

  const handleDownloadExpediente = async (gastoId: number, numero: string) => {
    try {
      setPdfLoading(`expediente-${gastoId}`)
      await treasuryService.downloadExpedientePdf(gastoId, numero)
      toast.success('Expediente descargado correctamente')
    } catch (err) {
      toast.error('Error al descargar el expediente')
      console.error(err)
    } finally {
      setPdfLoading(null)
    }
  }

  const handleDownloadDistribucion = async (gastoId: number, numero: string) => {
    try {
      setPdfLoading(`distribucion-${gastoId}`)
      await treasuryService.downloadDistribucionPdf(gastoId, numero)
      toast.success('Distribución descargada correctamente')
    } catch (err) {
      toast.error('Error al descargar la distribución')
      console.error(err)
    } finally {
      setPdfLoading(null)
    }
  }

  const handleDownloadExpedienteCompleto = async (gastoId: number, numero: string) => {
    try {
      setPdfLoading(`expediente-completo-${gastoId}`)
      await treasuryService.downloadExpedienteCompleto(gastoId, numero)
      toast.success('Expediente completo del ciclo descargado correctamente')
    } catch (err) {
      toast.error('Error al descargar el expediente completo del ciclo')
      console.error(err)
    } finally {
      setPdfLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!factura) return

    if (factura.status === 'distribuida') {
      setError('No se puede eliminar una factura que ya fue distribuida')
      return
    }

    const confirmed = confirm(
      `¿Estás seguro de eliminar esta factura?\n\nUUID: ${factura.uuid_cfdi || 'Pendiente'}\nProveedor: ${factura.proveedor_nombre}\nTotal: $${Number(factura.total).toLocaleString('es-MX')}\n\nEsta acción no se puede deshacer.`
    )

    if (!confirmed) return

    try {
      setActionLoading(true)
      await facturaService.deleteFactura(factura.id)
      navigate('/facturas')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error || 'Error al eliminar la factura')
      console.error(err)
    } finally {
      setActionLoading(false)
    }
  }

  // ── Solicitud de Gasto ────────────────────────────────────────────────────

  const openGastoModal = () => {
    if (!factura) return
    setGastoForm(emptyGastoForm(factura.id))
    setShowGastoModal(true)
  }

  const closeGastoModal = () => {
    setShowGastoModal(false)
    setGastoForm(null)
  }

  const updateGastoField = <K extends keyof SolicitudGastoForm>(
    key: K,
    value: SolicitudGastoForm[K]
  ) => {
    setGastoForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const updateGastoItem = (index: number, patch: Partial<ItemSolicitudGastoForm>) => {
    setGastoForm((prev) => {
      if (!prev) return prev
      const items = prev.items.map((item, i) => {
        if (i !== index) return item
        const merged = { ...item, ...patch }
        merged.costo_total =
          Number(merged.cantidad || 0) * Number(merged.precio_unitario || 0)
        return merged
      })
      return { ...prev, items }
    })
  }

  const addGastoItem = () => {
    setGastoForm((prev) =>
      prev ? { ...prev, items: [...prev.items, emptyGastoItem()] } : prev
    )
  }

  const removeGastoItem = (index: number) => {
    setGastoForm((prev) => {
      if (!prev || prev.items.length <= 1) return prev
      return { ...prev, items: prev.items.filter((_, i) => i !== index) }
    })
  }

  const handleSubmitGasto = async () => {
    if (!gastoForm) return
    if (!gastoForm.fondo_programa.trim() || !gastoForm.tipo_material.trim()) {
      toast.error('Completa Fondo / Programa y Tipo de material')
      return
    }
    if (gastoForm.items.some((it) => !it.area || !it.concepto_bien.trim())) {
      toast.error('Cada ítem requiere Área y Concepto del bien')
      return
    }

    try {
      setGastoLoading(true)
      await treasuryService.createSolicitudGasto(gastoForm)
      toast.success('Solicitud de gasto creada correctamente')
      closeGastoModal()
      await loadFactura()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      toast.error(e.response?.data?.detail || 'Error al crear la solicitud de gasto')
      console.error(err)
    } finally {
      setGastoLoading(false)
    }
  }

  // ── Solicitud de Pago ─────────────────────────────────────────────────────

  const openPagoModal = async (gastoId: number) => {
    setShowPagoModal(true)
    setSelectedGasto(null)
    setPagoForm(emptyPagoForm(gastoId))

    try {
      setPagoLoading(true)
      const detail = await treasuryService.getSolicitudGasto(gastoId)
      setSelectedGasto(detail)

      // Group items by area, summing costo_total → importe
      const grouped = new Map<
        number,
        { area: number; clave_presupuestaria: string; importe: number }
      >()
      for (const it of detail.items) {
        const existing = grouped.get(it.area)
        if (existing) {
          existing.importe += Number(it.costo_total)
        } else {
          grouped.set(it.area, {
            area: it.area,
            clave_presupuestaria: it.clave_presupuestaria,
            importe: Number(it.costo_total),
          })
        }
      }

      const form = emptyPagoForm(gastoId)
      form.items = Array.from(grouped.values())
      setPagoForm(form)
    } catch (err) {
      closePagoModal()
      toast.error('Error al cargar la solicitud de gasto')
      console.error(err)
    } finally {
      setPagoLoading(false)
    }
  }

  const closePagoModal = () => {
    setShowPagoModal(false)
    setPagoForm(null)
    setSelectedGasto(null)
  }

  const updatePagoField = <K extends keyof SolicitudPagoForm>(
    key: K,
    value: SolicitudPagoForm[K]
  ) => {
    setPagoForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const updatePagoItem = (
    index: number,
    patch: Partial<{ clave_presupuestaria: string; importe: number }>
  ) => {
    setPagoForm((prev) => {
      if (!prev) return prev
      const items = prev.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      )
      return { ...prev, items }
    })
  }

  const handleSubmitPago = async () => {
    if (!pagoForm) return
    if (
      !pagoForm.banco.trim() ||
      !pagoForm.numero_cuenta.trim() ||
      !pagoForm.cog_clave.trim() ||
      !pagoForm.cog_nombre.trim()
    ) {
      toast.error('Completa todos los datos bancarios y de COG')
      return
    }

    try {
      setPagoLoading(true)
      await treasuryService.createSolicitudPago(pagoForm)
      toast.success('Solicitud de pago creada correctamente')
      closePagoModal()
      await loadFactura()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      toast.error(e.response?.data?.detail || 'Error al crear la solicitud de pago')
      console.error(err)
    } finally {
      setPagoLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!factura) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          Factura no encontrada
        </div>
      </div>
    )
  }

  const solicitudesGasto = factura.solicitudes_gasto || []
  const hasSolicitudGasto = solicitudesGasto.length > 0
  const gastoSinPago = solicitudesGasto.find((sg) => !sg.solicitud_pago_id)
  const areaOptions = areas.map((a) => ({ value: a.id, label: a.nombre }))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {factura.uuid_cfdi || 'Factura Pendiente'}
          </h1>
          <p className="text-gray-600">Factura CFDI</p>
        </div>
        <div className="flex gap-2">
          {factura.status === 'procesada' && (
            <Button onClick={() => navigate(`/facturas/${factura.id}/distribuir`)}>
              Distribuir Gastos
            </Button>
          )}
          {factura.status === 'error' && (
            <Button
              onClick={handleReprocess}
              loading={actionLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Reprocesar
            </Button>
          )}
          {factura.status !== 'distribuida' && (
            <Button
              onClick={handleDelete}
              loading={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/facturas')}>
            Volver
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">{error}</div>
      )}

      {/* Error Message */}
      {factura.status === 'error' && factura.error_message && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md mb-6">
          <h3 className="font-semibold text-red-800 mb-2">Error de Procesamiento</h3>
          <p className="text-red-700">{factura.error_message}</p>
        </div>
      )}

      {/* Status Banner */}
      <div
        className={`p-4 rounded-lg mb-6 ${statusColors[factura.status]
          ?.replace('text-', 'border-')
          .replace('bg-', 'border-l-4 bg-')}`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[factura.status]}`}
          >
            {statusLabels[factura.status]}
          </span>
        </div>
      </div>

      {/* CFDI Information */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Información del CFDI</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <label className="text-sm text-gray-500">UUID</label>
              <p className="font-mono text-sm">{factura.uuid_cfdi || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Folio</label>
              <p className="font-medium">{factura.folio || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Serie</label>
              <p className="font-medium">{factura.serie || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Fecha</label>
              <p className="font-medium">
                {factura.fecha ? new Date(factura.fecha).toLocaleString('es-MX') : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Emisor / Receptor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Emisor</h2>
          </div>
          <div className="p-6 space-y-3">
            <div>
              <label className="text-sm text-gray-500">RFC</label>
              <p className="font-medium">{factura.rfc_emisor || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Nombre</label>
              <p className="font-medium">
                {factura.nombre_emisor || factura.proveedor_nombre}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Receptor</h2>
          </div>
          <div className="p-6 space-y-3">
            <div>
              <label className="text-sm text-gray-500">RFC</label>
              <p className="font-medium">{factura.rfc_receptor || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Nombre</label>
              <p className="font-medium">{factura.nombre_receptor || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Uso CFDI</label>
              <p className="font-medium">{factura.uso_cfdi || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Amounts */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Importes</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            <div>
              <label className="text-sm text-gray-500">Subtotal</label>
              <p className="font-medium">
                ${Number(factura.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Descuento</label>
              <p className="font-medium">
                ${Number(factura.descuento).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">IVA</label>
              <p className="font-medium">
                ${Number(factura.iva).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">ISR Retenido</label>
              <p className="font-medium">
                ${Number(factura.isr).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">IVA Retenido</label>
              <p className="font-medium">
                ${Number(factura.iva_retenido).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <label className="text-sm text-blue-600">Total</label>
              <p className="font-bold text-xl text-blue-800">
                ${Number(factura.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conceptos */}
      {factura.conceptos && factura.conceptos.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Conceptos ({factura.conceptos.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clave</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unidad</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">P. Unitario</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Importe</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {factura.conceptos.map((concepto) => (
                  <tr key={concepto.id}>
                    <td className="px-4 py-4 text-sm text-gray-600">{concepto.clave_prod_serv}</td>
                    <td className="px-4 py-4 text-sm text-gray-900 max-w-md truncate">{concepto.descripcion}</td>
                    <td className="px-4 py-4 text-sm text-center">{concepto.cantidad}</td>
                    <td className="px-4 py-4 text-sm text-center">{concepto.unidad || concepto.clave_unidad}</td>
                    <td className="px-4 py-4 text-sm text-right">
                      ${Number(concepto.valor_unitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 text-sm text-right font-medium">
                      ${Number(concepto.importe).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Distribuciones */}
      {factura.distribuciones && factura.distribuciones.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Distribución de Gastos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">%</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {factura.distribuciones.map((dist) => (
                  <tr key={dist.id}>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{dist.area_nombre}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate">{dist.concepto_descripcion}</td>
                    <td className="px-4 py-4 text-sm text-center">{dist.porcentaje}%</td>
                    <td className="px-4 py-4 text-sm text-right font-medium">
                      ${Number(dist.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">{dist.notas || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Documentos de Tesorería ── always visible ── */}
      <div className="bg-white rounded-lg shadow mt-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Documentos de Tesorería</h2>
          <div className="flex gap-2">
            {!hasSolicitudGasto && (
              <Button onClick={openGastoModal}>
                + Solicitud de Gasto
              </Button>
            )}
            {gastoSinPago && (
              <Button
                variant="secondary"
                onClick={() => openPagoModal(gastoSinPago.id)}
                loading={pagoLoading && !showPagoModal}
              >
                + Solicitud de Pago
              </Button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {!hasSolicitudGasto && (
            <p className="text-sm text-gray-500">
              Aún no se ha generado una solicitud de gasto para esta factura.
            </p>
          )}

          {solicitudesGasto.map((sg) => (
            <div
              key={sg.id}
              className="flex items-center justify-between border border-gray-200 rounded-md p-4"
            >
              <div>
                <p className="font-medium text-gray-900">{sg.numero}</p>
                <p className="text-sm text-gray-500">
                  {sg.solicitud_pago_id
                    ? 'Solicitud de pago disponible'
                    : 'Sin solicitud de pago asociada'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleDownloadGasto(sg.id, sg.numero)}
                  loading={pdfLoading === `gasto-${sg.id}`}
                >
                  📄 Descargar Solicitud de Gasto
                </Button>
                <Button
                  variant="secondary"
                  loading={pdfLoading === `distribucion-${sg.id}`}
                  onClick={() => handleDownloadDistribucion(sg.id, sg.numero)}
                >
                  📊 Descargar Distribución
                </Button>
                <Button
                  variant="secondary"
                  disabled={!sg.solicitud_pago_id}
                  loading={
                    sg.solicitud_pago_id
                      ? pdfLoading === `pago-${sg.solicitud_pago_id}`
                      : false
                  }
                  onClick={() =>
                    sg.solicitud_pago_id &&
                    handleDownloadPago(sg.solicitud_pago_id, sg.numero)
                  }
                >
                  📄 Descargar Solicitud de Pago
                </Button>
                <Button
                  disabled={!sg.solicitud_pago_id}
                  loading={pdfLoading === `expediente-${sg.id}`}
                  onClick={() => handleDownloadExpediente(sg.id, sg.numero)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  📦 Descargar Expediente Completo
                </Button>
                <Button
                  loading={pdfLoading === `expediente-completo-${sg.id}`}
                  onClick={() => handleDownloadExpedienteCompleto(sg.id, sg.numero)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                  title="Incluye todos los documentos del ciclo de compra"
                >
                  📋 Expediente Completo del Ciclo
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Files */}
      <div className="mt-6 flex gap-4">
        {factura.xml_file && (
          <a
            href={factura.xml_file}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            📄 Descargar XML
          </a>
        )}
        {factura.pdf_file && (
          <a
            href={factura.pdf_file}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            📑 Ver PDF
          </a>
        )}
      </div>

      {/* ── Modal: Nueva Solicitud de Gasto ── */}
      <Modal
        isOpen={showGastoModal}
        onClose={closeGastoModal}
        title="Nueva Solicitud de Gasto"
        size="xl"
      >
        {gastoForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Fondo / Programa"
                value={gastoForm.fondo_programa}
                onChange={(e) => updateGastoField('fondo_programa', e.target.value)}
              />
              <Input
                label="Tipo de material"
                value={gastoForm.tipo_material}
                onChange={(e) => updateGastoField('tipo_material', e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700">Ítems</h4>
                <Button type="button" variant="secondary" onClick={addGastoItem}>
                  + Agregar ítem
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {gastoForm.items.map((item, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-md p-3 space-y-2 relative"
                  >
                    <button
                      type="button"
                      onClick={() => removeGastoItem(index)}
                      disabled={gastoForm.items.length <= 1}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-600 disabled:opacity-30 text-lg leading-none"
                      title="Quitar ítem"
                      aria-label="Quitar ítem"
                    >
                      ×
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Select
                        label="Área"
                        options={areaOptions}
                        placeholder="Selecciona un área"
                        value={item.area || ''}
                        onChange={(e) =>
                          updateGastoItem(index, { area: Number(e.target.value) })
                        }
                      />
                      <Input
                        label="Clave presupuestaria"
                        value={item.clave_presupuestaria}
                        onChange={(e) =>
                          updateGastoItem(index, { clave_presupuestaria: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input
                        label="Concepto del bien"
                        value={item.concepto_bien}
                        onChange={(e) =>
                          updateGastoItem(index, { concepto_bien: e.target.value })
                        }
                      />
                      <Input
                        label="Descripción"
                        value={item.descripcion_adquirido}
                        onChange={(e) =>
                          updateGastoItem(index, { descripcion_adquirido: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Input
                        label="Cantidad"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.cantidad}
                        onChange={(e) =>
                          updateGastoItem(index, { cantidad: Number(e.target.value) })
                        }
                      />
                      <Input
                        label="Precio unitario"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precio_unitario}
                        onChange={(e) =>
                          updateGastoItem(index, {
                            precio_unitario: Number(e.target.value),
                          })
                        }
                      />
                      <Input
                        label="Unidad"
                        value={item.unidad}
                        onChange={(e) =>
                          updateGastoItem(index, { unidad: e.target.value })
                        }
                      />
                      <Input
                        label="Costo total"
                        type="number"
                        value={item.costo_total.toFixed(2)}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={closeGastoModal} disabled={gastoLoading}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitGasto} loading={gastoLoading}>
                Crear Solicitud
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Nueva Solicitud de Pago ── */}
      <Modal
        isOpen={showPagoModal}
        onClose={closePagoModal}
        title="Nueva Solicitud de Pago"
        size="xl"
      >
        {pagoLoading && !selectedGasto && (
          <div className="py-8 text-center text-sm text-gray-500">
            Cargando solicitud de gasto...
          </div>
        )}
        {pagoForm && selectedGasto && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
              Solicitud de gasto:{' '}
              <strong>{selectedGasto.numero}</strong>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Banco"
                value={pagoForm.banco}
                onChange={(e) => updatePagoField('banco', e.target.value)}
              />
              <Input
                label="Número de cuenta"
                value={pagoForm.numero_cuenta}
                onChange={(e) => updatePagoField('numero_cuenta', e.target.value)}
              />
              <Input
                label="Clave COG"
                value={pagoForm.cog_clave}
                onChange={(e) => updatePagoField('cog_clave', e.target.value)}
              />
              <Input
                label="Nombre COG"
                value={pagoForm.cog_nombre}
                onChange={(e) => updatePagoField('cog_nombre', e.target.value)}
              />
            </div>

            {pagoForm.items.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Ítems (agrupados por área)
                </h4>
                <div className="space-y-2">
                  {pagoForm.items.map((item, index) => {
                    const areaName =
                      areas.find((a) => a.id === item.area)?.nombre ||
                      `Área ${item.area}`
                    return (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end border border-gray-200 rounded-md p-3"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Área
                          </label>
                          <p className="px-3 py-2 bg-gray-50 rounded-md text-sm border border-gray-200">
                            {areaName}
                          </p>
                        </div>
                        <Input
                          label="Clave presupuestaria"
                          value={item.clave_presupuestaria}
                          onChange={(e) =>
                            updatePagoItem(index, {
                              clave_presupuestaria: e.target.value,
                            })
                          }
                        />
                        <Input
                          label="Importe"
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.importe}
                          onChange={(e) =>
                            updatePagoItem(index, {
                              importe: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={closePagoModal} disabled={pagoLoading}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitPago} loading={pagoLoading}>
                Crear Solicitud
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
