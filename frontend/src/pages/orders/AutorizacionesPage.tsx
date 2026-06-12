import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { DocumentTextIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { Button, Table, PageHeader, Modal } from '@/components/ui'
import { orderService, SolicitudAutorizacion } from '@/services/orderService'
import { useAuthStore } from '@/stores/authStore'

export default function AutorizacionesPage() {
  const { user } = useAuthStore()
  const [autorizaciones, setAutorizaciones] = useState<SolicitudAutorizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAuth, setSelectedAuth] = useState<SolicitudAutorizacion | null>(null)
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [partidaPresupuestal, setPartidaPresupuestal] = useState('')
  const [observaciones, setObservaciones] = useState('')

  const isTesoreria = user?.role === 'tesoreria'
  const isAdmin = user?.role === 'admin'

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await orderService.getAutorizaciones()
      setAutorizaciones(data)
    } catch (error) {
      toast.error('Error al cargar las autorizaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleApprove = async () => {
    if (!selectedAuth) return
    setSubmitting(true)
    try {
      await orderService.approveAutorizacion(selectedAuth.id, {
        partida_presupuestal: partidaPresupuestal,
        observaciones,
      })
      toast.success('Autorización aprobada')
      setIsApproveModalOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al aprobar la autorización')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async (id: number) => {
    if (!window.confirm('¿Seguro que deseas rechazar esta solicitud de autorización?')) return
    try {
      await orderService.rejectAutorizacion(id)
      toast.success('Autorización rechazada')
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al rechazar')
    }
  }

  const openApproveModal = (auth: SolicitudAutorizacion) => {
    setSelectedAuth(auth)
    setPartidaPresupuestal('')
    setObservaciones('')
    setIsApproveModalOpen(true)
  }

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) : val
    return isNaN(num) ? '$0.00' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num)
  }

  const columns = [
    { key: 'numero', header: 'Folio' },
    { key: 'solicitud_numero', header: 'Solicitud' },
    { key: 'cotizacion_numero', header: 'Cotización', render: (a: SolicitudAutorizacion) => a.cotizacion_numero || '-' },
    { key: 'monto_solicitado', header: 'Monto Solicitado', render: (a: SolicitudAutorizacion) => formatCurrency(a.monto_solicitado) },
    { 
      key: 'estado', 
      header: 'Estado', 
      render: (a: SolicitudAutorizacion) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          a.estado === 'aprobada' ? 'bg-green-100 text-green-800' :
          a.estado === 'rechazada' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {a.estado.toUpperCase()}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (a: SolicitudAutorizacion) => (
        <div className="flex space-x-2">
          {/* Aquí podrías navegar a un Detalle real, por ahora abre las opciones o se queda simple */}
          {a.estado === 'pendiente' && (isTesoreria || isAdmin) && (
            <>
              <button onClick={() => openApproveModal(a)} className="text-green-600 hover:text-green-900" title="Aprobar">
                <CheckCircleIcon className="h-5 w-5" />
              </button>
              <button onClick={() => handleReject(a.id)} className="text-red-600 hover:text-red-900" title="Rechazar">
                <XCircleIcon className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader
        title="Autorizaciones Presupuestales"
        subtitle="Panel de Tesorería para la autorización de compras"
        icon={<DocumentTextIcon className="w-6 h-6" />}
        gradient="blue"
      />

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <Table
          columns={columns}
          data={autorizaciones}
          keyExtractor={(a) => a.id}
          loading={loading}
          emptyMessage="No hay autorizaciones registradas"
        />
      </div>

      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Aprobar Autorización"
        size="md"
      >
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Aprobando solicitud por <strong>{selectedAuth ? formatCurrency(selectedAuth.monto_solicitado) : ''}</strong>.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Partida Presupuestal</label>
            <input
              type="text"
              value={partidaPresupuestal}
              onChange={(e) => setPartidaPresupuestal(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              placeholder="Ej: 2110001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              placeholder="Anotaciones adicionales..."
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={() => setIsApproveModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} loading={submitting}>
              Aprobar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
