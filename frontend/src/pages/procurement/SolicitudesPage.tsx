import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  XCircleIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  PrinterIcon,
  IdentificationIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { Button, Table, Modal, PageHeader } from '@/components/ui'
import { procurementService, SolicitudMaterial } from '@/services/procurementService'
import { documentService } from '@/services/documentService'
import { userService } from '@/services/userService'
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

export default function SolicitudesPage() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  const [solicitudes, setSolicitudes] = useState<SolicitudMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudMaterial | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  // INE management state
  const [showIneModal, setShowIneModal] = useState(false)
  const [ineFoto, setIneFoto] = useState<File | null>(null)
  const [inePreview, setInePreview] = useState<string | null>(null)
  const [uploadingIne, setUploadingIne] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('todos')

  // Determinar permisos según rol
  const isArea = user?.role === 'area'
  const isAdquisiciones = user?.role === 'adquisiciones'
  const isAdmin = user?.role === 'admin'
  const canCreateSolicitud = isArea || isAdmin

  const loadData = async (estado?: string) => {
    setLoading(true)
    try {
      const data = await procurementService.getSolicitudes(estado)
      setSolicitudes(data)
    } catch (error) {
      toast.error('Error al cargar las solicitudes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(filtroEstado)
  }, [filtroEstado])

  // INE handlers
  const handleIneFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIneFoto(file)
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => setInePreview(reader.result as string)
        reader.readAsDataURL(file)
      } else {
        setInePreview(null)
      }
    }
  }

  const handleUploadIne = async () => {
    if (!ineFoto) return
    setUploadingIne(true)
    try {
      const updatedUser = await userService.uploadIne(ineFoto)
      updateUser({
        ine_documento: updatedUser.ine_documento,
        ine_verificada: false,
        ine_rechazada: false,
        ine_rechazo_motivo: '',
      })
      toast.success('INE subida correctamente. Será verificada por un administrador.')
      setShowIneModal(false)
      setIneFoto(null)
      setInePreview(null)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al subir la INE')
    } finally {
      setUploadingIne(false)
    }
  }

  const handleDeleteIne = async () => {
    try {
      await userService.deleteIne()
      updateUser({
        ine_documento: null,
        ine_verificada: false,
        ine_rechazada: false,
        ine_rechazo_motivo: '',
      })
      toast.success('INE eliminada correctamente.')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al eliminar la INE')
    }
  }

  const handleCreate = () => {
    navigate('/solicitudes/nueva')
  }

  const handleView = (solicitud: SolicitudMaterial) => {
    navigate(`/solicitudes/${solicitud.id}`)
  }

  const handleEdit = (solicitud: SolicitudMaterial) => {
    navigate(`/solicitudes/${solicitud.id}/editar`)
  }

  const handleDelete = (solicitud: SolicitudMaterial) => {
    setSelectedSolicitud(solicitud)
    setDeleteModalOpen(true)
  }

  const handleEnviar = async (solicitud: SolicitudMaterial) => {
    try {
      await procurementService.enviarSolicitud(solicitud.id)
      toast.success('Solicitud enviada correctamente')
      loadData(filtroEstado)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al enviar la solicitud')
    }
  }

  const handleEnviarACotizacion = async (solicitud: SolicitudMaterial) => {
    try {
      await procurementService.enviarACotizacion(solicitud.id)
      toast.success('Solicitud enviada a cotización')
      loadData(filtroEstado)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al enviar a cotización')
    }
  }

  const handleCancelar = async (solicitud: SolicitudMaterial) => {
    try {
      await procurementService.cancelarSolicitud(solicitud.id)
      toast.success('Solicitud cancelada')
      loadData(filtroEstado)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al cancelar la solicitud')
    }
  }

  const confirmDelete = async () => {
    if (!selectedSolicitud) return
    setSubmitting(true)
    try {
      await procurementService.deleteSolicitud(selectedSolicitud.id)
      toast.success('Solicitud eliminada correctamente')
      setDeleteModalOpen(false)
      loadData(filtroEstado)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al eliminar la solicitud')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDescargarPdf = async (e: React.MouseEvent, solicitud: SolicitudMaterial) => {
    e.stopPropagation()
    setDownloadingId(solicitud.id)
    try {
      await documentService.downloadSolicitudPdf(solicitud.id, solicitud.numero)
      toast.success('PDF descargado correctamente')
    } catch (error) {
      toast.error('Error al generar el PDF')
    } finally {
      setDownloadingId(null)
    }
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return '$0.00'
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const columns = [
    {
      key: 'numero',
      header: 'Número',
      render: (s: SolicitudMaterial) => (
        <span className="font-medium text-primary-600">{s.numero}</span>
      )
    },
    {
      key: 'fecha_solicitud',
      header: 'Fecha',
      render: (s: SolicitudMaterial) => formatDate(s.fecha_solicitud)
    },
    { key: 'area_name', header: 'Área' },
    {
      key: 'descripcion',
      header: 'Descripción',
      render: (s: SolicitudMaterial) => (
        <span className="max-w-xs truncate block">{s.descripcion || '-'}</span>
      )
    },
    {
      key: 'total_estimado',
      header: 'Total',
      render: (s: SolicitudMaterial) => formatCurrency(s.total_estimado)
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (s: SolicitudMaterial) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoColors[s.estado] || 'bg-gray-100 text-gray-800'}`}>
          {s.estado_display}
        </span>
      )
    },
    {
      key: 'urgente',
      header: '',
      render: (s: SolicitudMaterial) => s.urgente ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          Urgente
        </span>
      ) : null
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (s: SolicitudMaterial) => (
        <div className="flex space-x-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleView(s) }}
            className="p-1 text-gray-500 hover:text-primary-600"
            title="Ver detalle"
          >
            <EyeIcon className="h-5 w-5" />
          </button>

          <button
            onClick={(e) => handleDescargarPdf(e, s)}
            disabled={downloadingId === s.id}
            className={`p-1 ${downloadingId === s.id ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:text-blue-600'}`}
            title="Descargar PDF"
          >
            {downloadingId === s.id ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <PrinterIcon className="h-5 w-5" />
            )}
          </button>

          {/* Solo Área o Admin pueden editar/enviar borradores */}
          {s.estado === 'borrador' && (isArea || isAdmin) && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleEdit(s) }}
                className="p-1 text-gray-500 hover:text-primary-600"
                title="Editar"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleEnviar(s) }}
                className="p-1 text-gray-500 hover:text-green-600"
                title="Enviar solicitud"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(s) }}
                className="p-1 text-gray-500 hover:text-red-600"
                title="Eliminar"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Adquisiciones o Admin pueden enviar a cotización las solicitudes enviadas */}
          {s.estado === 'enviado' && (isAdquisiciones || isAdmin) && (
            <button
              onClick={(e) => { e.stopPropagation(); handleEnviarACotizacion(s) }}
              className="p-1 text-gray-500 hover:text-purple-600"
              title="Enviar a cotización"
            >
              <DocumentArrowUpIcon className="h-5 w-5" />
            </button>
          )}

          {/* Solo quien creó o Admin puede cancelar */}
          {['enviado', 'en_cotizacion'].includes(s.estado) && (isArea || isAdmin) && (
            <button
              onClick={(e) => { e.stopPropagation(); handleCancelar(s) }}
              className="p-1 text-gray-500 hover:text-red-600"
              title="Cancelar solicitud"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader
        title="Solicitudes de Material"
        subtitle={isArea
          ? 'Gestiona tus solicitudes de material'
          : 'Gestiona las solicitudes de material de las áreas'}
        icon={<DocumentTextIcon className="w-6 h-6" />}
        gradient="blue"
        actions={
          canCreateSolicitud ? (
            <Button onClick={handleCreate}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Nueva Solicitud
            </Button>
          ) : undefined
        }
      />

      {/* Sección de gestión de INE - solo para rol area */}
      {isArea && (
        <div className="mb-6">
          {!user?.ine_documento ? (
            // Usuario sin INE registrada
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-4">
              <IdentificationIcon className="h-8 w-8 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-800">INE no registrada</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Necesitas registrar tu INE para poder crear solicitudes. Sube tu identificación oficial en formato PDF.
                </p>
              </div>
              <Button size="sm" onClick={() => setShowIneModal(true)}>
                Subir INE
              </Button>
            </div>
          ) : user?.ine_rechazada ? (
            // INE rechazada
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-4">
              <ExclamationCircleIcon className="h-8 w-8 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800">INE rechazada</h3>
                <p className="text-sm text-red-700 mt-1">
                  {user.ine_rechazo_motivo || 'Tu INE fue rechazada. Por favor sube un nuevo documento.'}
                </p>
                <div className="mt-2">
                  <a href={user.ine_documento} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 hover:underline">Ver documento enviado</a>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="danger" onClick={() => setShowIneModal(true)}>
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  Subir Nueva
                </Button>
                <Button size="sm" variant="secondary" onClick={handleDeleteIne}>
                  Eliminar INE
                </Button>
              </div>
            </div>
          ) : !user?.ine_verificada ? (
            // INE pendiente de verificación
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-4">
              <IdentificationIcon className="h-8 w-8 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-800">INE en verificación</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Tu INE está siendo revisada por un administrador. Puedes seguir creando solicitudes, pero permanecerán en estado de verificación.
                </p>
                <div className="mt-2">
                  <a href={user.ine_documento} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">Ver documento enviado</a>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="secondary" onClick={() => setShowIneModal(true)}>
                  Reemplazar INE
                </Button>
                <Button size="sm" variant="danger" onClick={handleDeleteIne}>
                  Eliminar INE
                </Button>
              </div>
            </div>
          ) : (
            // INE verificada
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-4">
              <CheckCircleIcon className="h-8 w-8 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-green-800">INE verificada</h3>
                <p className="text-sm text-green-700 mt-1">
                  Tu identificación ha sido verificada correctamente.
                </p>
                <div className="mt-2">
                  <a href={user.ine_documento} target="_blank" rel="noopener noreferrer" className="text-sm text-green-600 hover:underline">Ver documento enviado</a>
                </div>
              </div>
              {isAdmin && (
                <Button size="sm" variant="secondary" onClick={() => setShowIneModal(true)}>
                  Actualizar INE (Admin)
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filtros rápidos */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries({
          todos: 'Todos',
          ...(isAdmin ? { pendiente_verificacion: 'Verificar INE' } : {}),
          borrador: 'Borradores',
          enviado: 'Enviados',
          en_cotizacion: 'En Cotización',
          autorizado: 'Autorizados'
        }).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFiltroEstado(key)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              filtroEstado === key
                ? key === 'pendiente_verificacion'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <Table
          columns={columns}
          data={solicitudes}
          keyExtractor={(s) => s.id}
          loading={loading}
          emptyMessage="No hay solicitudes registradas"
          onRowClick={handleView}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Eliminar Solicitud"
        size="sm"
      >
        <p className="text-gray-600">
          ¿Estás seguro de que deseas eliminar la solicitud <strong>{selectedSolicitud?.numero}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={submitting}>
            Eliminar
          </Button>
        </div>
      </Modal>

      {/* INE Upload Modal */}
      <Modal
        isOpen={showIneModal}
        onClose={() => { setShowIneModal(false); setIneFoto(null); setInePreview(null) }}
        title="Subir Identificación (INE)"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Sube el documento PDF o Imagen de tu INE.
          </p>

          {/* Documento actual */}
          {user?.ine_documento && !inePreview && (
            <div>
              <p className="text-xs text-gray-500 mb-2">INE actual:</p>
              <a href={user.ine_documento} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline">
                Ver documento actual (PDF)
              </a>
            </div>
          )}

          {/* Preview de nuevo archivo */}
          {inePreview ? (
            <div>
              <p className="text-xs text-gray-500 mb-2">Nueva imagen lista para subir:</p>
              <img src={inePreview} alt="Preview INE" className="max-h-48 rounded-lg border border-gray-200 object-contain" />
            </div>
          ) : ineFoto && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Nuevo documento listo para subir:</p>
              <div className="bg-gray-100 p-3 rounded text-sm text-gray-700 border border-gray-200 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                {ineFoto.name}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seleccionar archivo (Imagen o PDF)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleIneFileChange}
              aria-label="Seleccionar archivo de INE"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => { setShowIneModal(false); setIneFoto(null); setInePreview(null) }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUploadIne}
              disabled={!ineFoto}
              loading={uploadingIne}
            >
              <IdentificationIcon className="h-4 w-4 mr-1" />
              Subir INE
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
