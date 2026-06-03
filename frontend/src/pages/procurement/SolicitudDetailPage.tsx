import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  PaperAirplaneIcon,
  XCircleIcon,
  PrinterIcon,
  DocumentArrowUpIcon,
  MagnifyingGlassIcon,
  TableCellsIcon,
  IdentificationIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { Button, Modal } from '@/components/ui'
import { procurementService, SolicitudMaterial } from '@/services/procurementService'
import { documentService } from '@/services/documentService'
import { orderService } from '@/services/orderService'
import { useAuthStore } from '@/stores/authStore'

const estadoColors: Record<string, string> = {
  pendiente_verificacion: 'bg-amber-100 text-amber-800',
  ine_rechazada: 'bg-red-100 text-red-800',
  borrador: 'bg-gray-100 text-gray-800',
  enviado: 'bg-blue-100 text-blue-800',
  en_cotizacion: 'bg-yellow-100 text-yellow-800',
  cotizado: 'bg-purple-100 text-purple-800',
  en_autorizacion: 'bg-orange-100 text-orange-800',
  autorizado: 'bg-green-100 text-green-800',
  en_orden: 'bg-indigo-100 text-indigo-800',
  parcial: 'bg-cyan-100 text-cyan-800',
  entregado: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-red-100 text-red-800',
}

export default function SolicitudDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuthStore()
  const [solicitud, setSolicitud] = useState<SolicitudMaterial | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [buscandoCatalogo, setBuscandoCatalogo] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingAutPdf, setDownloadingAutPdf] = useState(false)
  const [showResubirIneModal, setShowResubirIneModal] = useState(false)
  const [showRechazarIneModal, setShowRechazarIneModal] = useState(false)
  const [ineFile, setIneFile] = useState<File | null>(null)
  const [inePreview, setInePreview] = useState<string | null>(null)
  const [rechazoMotivo, setRechazoMotivo] = useState('')

  // Permisos según rol
  const isArea = user?.role === 'area'
  const isAdquisiciones = user?.role === 'adquisiciones'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    const loadData = async () => {
      if (!id) return
      setLoading(true)
      try {
        const data = await procurementService.getSolicitud(parseInt(id))
        setSolicitud(data)
      } catch (error) {
        toast.error('Error al cargar la solicitud')
        navigate('/solicitudes')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [id, navigate])

  const handleEnviar = async () => {
    if (!solicitud) return
    setSubmitting(true)
    try {
      const updated = await procurementService.enviarSolicitud(solicitud.id)
      setSolicitud(updated)
      toast.success('Solicitud enviada correctamente')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al enviar la solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEnviarACotizacion = async () => {
    if (!solicitud) return
    setSubmitting(true)
    try {
      const updated = await procurementService.enviarACotizacion(solicitud.id)
      setSolicitud(updated)
      toast.success('Solicitud enviada a cotización. Los proveedores ahora pueden cotizar.')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al enviar a cotización')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelar = async () => {
    if (!solicitud) return
    setSubmitting(true)
    try {
      const updated = await procurementService.cancelarSolicitud(solicitud.id)
      setSolicitud(updated)
      toast.success('Solicitud cancelada')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al cancelar la solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBuscarCatalogo = async () => {
    if (!solicitud) return
    setBuscandoCatalogo(true)
    try {
      const result = await procurementService.buscarCotizacionesCatalogo(solicitud.id)
      if (result.cotizaciones_creadas > 0) {
        toast.success(`Se generaron ${result.cotizaciones_creadas} cotización(es) automática(s)`)
      } else if (result.proveedores_parciales.length > 0) {
        const parciales = result.proveedores_parciales
          .map(p => `${p.proveedor_nombre} (${p.items_cubiertos}/${p.items_total})`)
          .join(', ')
        toast(`Proveedores con cobertura parcial: ${parciales}`, { icon: '⚠️', duration: 6000 })
      } else {
        toast('No se encontraron coincidencias en los catálogos de proveedores.', { icon: 'ℹ️' })
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al buscar en catálogos')
    } finally {
      setBuscandoCatalogo(false)
    }
  }

  const handleDescargarPdf = async () => {
    if (!solicitud) return
    setDownloadingPdf(true)
    try {
      await documentService.downloadSolicitudPdf(solicitud.id, solicitud.numero)
      toast.success('PDF descargado correctamente')
    } catch (error) {
      toast.error('Error al generar el PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleDescargarSolAutPdf = async () => {
    if (!solicitud) return
    setDownloadingAutPdf(true)
    try {
      const autorizaciones = await orderService.getAutorizaciones()
      const aut = autorizaciones.find(a => a.solicitud === solicitud.id)
      if (!aut) {
        toast.error('No se encontró una solicitud de autorización para esta solicitud')
        return
      }
      const documentId = await documentService.generateSolicitudAutorizacionPdf(aut.id)
      if (documentId) {
        await documentService.downloadPdf(documentId, `SolicitudAut_${aut.numero}.pdf`)
      } else {
        toast.success('PDF en proceso. El documento estará disponible en breve.')
      }
    } catch (error) {
      toast.error('Error al generar el PDF de solicitud de autorización')
    } finally {
      setDownloadingAutPdf(false)
    }
  }

  const handleAprobarIne = async () => {
    if (!solicitud) return
    setSubmitting(true)
    try {
      const updated = await procurementService.verificarIne(solicitud.id, true)
      setSolicitud(updated)
      toast.success('INE aprobada. La solicitud pasa a estado Borrador.')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al aprobar la INE')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRechazarIne = async () => {
    if (!solicitud || !rechazoMotivo.trim()) {
      toast.error('Debes indicar el motivo del rechazo')
      return
    }
    setSubmitting(true)
    try {
      const updated = await procurementService.verificarIne(solicitud.id, false, rechazoMotivo)
      setSolicitud(updated)
      setShowRechazarIneModal(false)
      setRechazoMotivo('')
      toast.success('INE rechazada. El usuario deberá subir una nueva.')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al rechazar la INE')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResubirIne = async () => {
    if (!solicitud || !ineFile) return
    setSubmitting(true)
    try {
      const updated = await procurementService.resubirIne(solicitud.id, ineFile)
      setSolicitud(updated)
      setShowResubirIneModal(false)
      setIneFile(null)
      setInePreview(null)
      toast.success('INE reenviada. Espera la verificación del administrador.')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al resubir la INE')
    } finally {
      setSubmitting(false)
    }
  }

  const handleIneFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIneFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setInePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return '$0.00'
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
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

  if (!solicitud) {
    return <div>Solicitud no encontrada</div>
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
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{solicitud.numero}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Creada el {formatDate(solicitud.created_at)} por {solicitud.created_by_name}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${estadoColors[solicitud.estado] || 'bg-gray-100 text-gray-800'}`}>
              {solicitud.estado_display}
            </span>
            
            {solicitud.urgente && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                Urgente
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="mb-6 flex flex-wrap gap-2">
        {/* Solo Área o Admin pueden editar/enviar borradores */}
        {solicitud.estado === 'borrador' && (isArea || isAdmin) && (
          <>
            <Button onClick={() => navigate(`/solicitudes/${solicitud.id}/editar`)}>
              <PencilIcon className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button onClick={handleEnviar} loading={submitting}>
              <PaperAirplaneIcon className="h-4 w-4 mr-2" />
              Enviar Solicitud
            </Button>
          </>
        )}

        {/* Adquisiciones o Admin pueden enviar a cotización */}
        {solicitud.estado === 'enviado' && (isAdquisiciones || isAdmin) && (
          <Button onClick={handleEnviarACotizacion} loading={submitting}>
            <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
            Enviar a Cotización
          </Button>
        )}

        {/* Buscar en catálogos de proveedores */}
        {['en_cotizacion', 'cotizado'].includes(solicitud.estado) && (isAdquisiciones || isAdmin) && (
          <Button onClick={handleBuscarCatalogo} loading={buscandoCatalogo} variant="secondary">
            <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
            Buscar en Catálogos
          </Button>
        )}

        {/* Ver comparativa de cotizaciones */}
        {['en_cotizacion', 'cotizado'].includes(solicitud.estado) && (isAdquisiciones || isAdmin) && (
          <Button variant="secondary" onClick={() => navigate(`/cotizaciones/comparar/${solicitud.id}`)}>
            <TableCellsIcon className="h-4 w-4 mr-2" />
            Ver Comparativa
          </Button>
        )}
        
        {/* Solo Área o Admin pueden cancelar */}
        {['enviado', 'en_cotizacion'].includes(solicitud.estado) && (isArea || isAdmin) && (
          <Button variant="danger" onClick={handleCancelar} loading={submitting}>
            <XCircleIcon className="h-4 w-4 mr-2" />
            Cancelar Solicitud
          </Button>
        )}
        
        {['en_autorizacion', 'autorizado', 'en_orden', 'parcial', 'entregado'].includes(solicitud.estado) && (
          <Button variant="secondary" onClick={handleDescargarSolAutPdf} loading={downloadingAutPdf}>
            <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
            Solicitud de Autorización
          </Button>
        )}

        <Button variant="secondary" onClick={handleDescargarPdf} loading={downloadingPdf}>
          <PrinterIcon className="h-4 w-4 mr-2" />
          Descargar PDF
        </Button>
      </div>

      {/* Banner: Pendiente de verificación INE */}
      {solicitud.estado === 'pendiente_verificacion' && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start">
            <IdentificationIcon className="h-6 w-6 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800">Solicitud en espera de verificación de INE</h3>
              <p className="mt-1 text-sm text-amber-700">
                Un administrador debe verificar tu identificación antes de que esta solicitud pueda ser procesada.
              </p>
              
              {/* Admin: show INE document and approve/reject buttons */}
              {isAdmin && solicitud.ine_documento && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Documento INE del solicitante:</p>
                  <a href={solicitud.ine_documento} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline mb-4 inline-block">
                    Ver PDF del documento
                  </a>
                  <div className="flex space-x-3 mt-2">
                    <Button size="sm" onClick={handleAprobarIne} loading={submitting}>
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Aprobar INE
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setShowRechazarIneModal(true)}>
                      <XCircleIcon className="h-4 w-4 mr-1" />
                      Rechazar INE
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Banner: INE Rechazada */}
      {solicitud.estado === 'ine_rechazada' && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationCircleIcon className="h-6 w-6 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Tu INE fue rechazada</h3>
              {solicitud.ine_rechazo_motivo && (
                <p className="mt-1 text-sm text-red-700">
                  <span className="font-medium">Motivo:</span> {solicitud.ine_rechazo_motivo}
                </p>
              )}
              {solicitud.created_by === user?.id && (
                <Button size="sm" className="mt-3" onClick={() => setShowResubirIneModal(true)}>
                  <IdentificationIcon className="h-4 w-4 mr-1" />
                  Volver a subir INE
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Datos generales */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Datos Generales</h2>
        
        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <dt className="text-sm font-medium text-gray-500">Área Solicitante</dt>
            <dd className="mt-1 text-sm text-gray-900">{solicitud.area_name}</dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Fecha de Solicitud</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(solicitud.fecha_solicitud)}</dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Fecha Requerida</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {solicitud.fecha_requerida ? formatDate(solicitud.fecha_requerida) : '-'}
            </dd>
          </div>
          
          <div className="md:col-span-2 lg:col-span-3">
            <dt className="text-sm font-medium text-gray-500">Descripción</dt>
            <dd className="mt-1 text-sm text-gray-900">{solicitud.descripcion || '-'}</dd>
          </div>
          
          <div className="md:col-span-2 lg:col-span-3">
            <dt className="text-sm font-medium text-gray-500">Justificación</dt>
            <dd className="mt-1 text-sm text-gray-900">{solicitud.justificacion || '-'}</dd>
          </div>

          <div className="md:col-span-2 lg:col-span-3 mt-4 border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Clasificación Presupuestaria</h3>
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <dt className="text-xs font-medium text-gray-500">Eje Rector</dt>
                <dd className="mt-1 text-sm text-gray-900">{solicitud.eje_rector || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Programa Presupuestario</dt>
                <dd className="mt-1 text-sm text-gray-900">{solicitud.programa_presupuestario || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Actividad</dt>
                <dd className="mt-1 text-sm text-gray-900">{solicitud.actividad || '-'}</dd>
              </div>
            </dl>
          </div>
        </dl>
      </div>

      {/* Detalle de materiales */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Materiales Solicitados</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">COG</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio Est.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {solicitud.detalles.map((detalle, index) => (
                <tr key={detalle.id || index}>
                  <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div>{detalle.concepto}</div>
                    {detalle.descripcion && (
                      <div className="text-xs text-gray-500">{detalle.descripcion}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{detalle.cog_codigo}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{detalle.cantidad}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{detalle.unidad}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(detalle.precio_estimado)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(detalle.subtotal_estimado || detalle.cantidad * detalle.precio_estimado)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={6} className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                  Total Estimado:
                </td>
                <td className="px-4 py-3 text-right text-lg font-bold text-gray-900">
                  {formatCurrency(solicitud.total_estimado)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal: Rechazar INE */}
      <Modal
        isOpen={showRechazarIneModal}
        onClose={() => { setShowRechazarIneModal(false); setRechazoMotivo('') }}
        title="Rechazar INE"
        size="md"
      >
        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            Indica el motivo del rechazo. El usuario podrá volver a subir su INE.
          </p>
          <textarea
            value={rechazoMotivo}
            onChange={(e) => setRechazoMotivo(e.target.value)}
            rows={3}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Ej: La imagen no es legible, sube una foto más clara..."
          />
          <div className="flex justify-end space-x-3 mt-4">
            <Button variant="secondary" onClick={() => { setShowRechazarIneModal(false); setRechazoMotivo('') }}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleRechazarIne} loading={submitting} disabled={!rechazoMotivo.trim()}>
              Confirmar Rechazo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Resubir INE */}
      <Modal
        isOpen={showResubirIneModal}
        onClose={() => { setShowResubirIneModal(false); setIneFile(null); setInePreview(null) }}
        title="Volver a subir INE"
        size="md"
      >
        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            Sube tu documento INE en formato PDF. Asegúrate de que sea claro y legible.
          </p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {inePreview ? (
              <div className="space-y-3">
                <div className="bg-gray-100 p-3 rounded text-sm text-gray-700 border border-gray-200">
                  {ineFile?.name}
                </div>
                <p className="text-sm text-green-600 font-medium">Documento seleccionado</p>
                <button
                  type="button"
                  onClick={() => { setIneFile(null); setInePreview(null) }}
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
                    accept=".pdf"
                    onChange={handleIneFileChange}
                    className="hidden"
                  />
                </label>
                <p className="mt-1 text-xs text-gray-500">Documento PDF</p>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <Button variant="secondary" onClick={() => { setShowResubirIneModal(false); setIneFile(null); setInePreview(null) }}>
              Cancelar
            </Button>
            <Button onClick={handleResubirIne} loading={submitting} disabled={!ineFile}>
              Enviar INE
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
