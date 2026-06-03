import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  ReceiptPercentIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline'
import { Button, Card } from '@/components/ui'
import { proveedorPortalService } from '@/services/proveedorPortalService'

interface Factura {
  id: number
  folio: string
  uuid_cfdi: string
  fecha_emision: string
  subtotal: string
  iva: string
  total: string
  status: string
  status_display: string
  created_at: string
}

const statusColors: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  procesada: 'bg-blue-100 text-blue-800',
  distribuida: 'bg-green-100 text-green-800',
  rechazada: 'bg-red-100 text-red-800',
}

export default function MisFacturasPage() {
  const navigate = useNavigate()
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<string>('')

  useEffect(() => {
    loadFacturas()
  }, [])

  const loadFacturas = async () => {
    try {
      const data = await proveedorPortalService.getMisFacturas()
      setFacturas(data)
    } catch (error: any) {
      toast.error('Error al cargar facturas')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num || 0)
  }

  const facturasFiltradas = filtroStatus
    ? facturas.filter(f => f.status === filtroStatus)
    : facturas

  // Estadísticas
  const stats = {
    total: facturas.length,
    pendientes: facturas.filter(f => f.status === 'pendiente').length,
    procesadas: facturas.filter(f => f.status === 'procesada' || f.status === 'distribuida').length,
    totalMonto: facturas
      .filter(f => f.status !== 'rechazada')
      .reduce((sum, f) => sum + parseFloat(f.total || '0'), 0),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/portal')}>
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Mis Facturas</h1>
            <p className="text-gray-500">Historial de facturas emitidas</p>
          </div>
        </div>
        <Link to="/facturas/subir">
          <Button>
            <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
            Subir Factura
          </Button>
        </Link>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card 
          className={`p-4 cursor-pointer transition-all ${filtroStatus === '' ? 'ring-2 ring-primary-500' : ''}`}
          onClick={() => setFiltroStatus('')}
        >
          <p className="text-sm text-gray-500">Total Facturas</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
        </Card>
        <Card 
          className={`p-4 cursor-pointer transition-all ${filtroStatus === 'pendiente' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setFiltroStatus(filtroStatus === 'pendiente' ? '' : 'pendiente')}
        >
          <p className="text-sm text-gray-500">Pendientes</p>
          <p className="text-2xl font-semibold text-yellow-600">{stats.pendientes}</p>
        </Card>
        <Card 
          className={`p-4 cursor-pointer transition-all ${filtroStatus === 'procesada' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setFiltroStatus(filtroStatus === 'procesada' ? '' : 'procesada')}
        >
          <p className="text-sm text-gray-500">Procesadas</p>
          <p className="text-2xl font-semibold text-green-600">{stats.procesadas}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Total Facturado</p>
          <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.totalMonto)}</p>
        </Card>
      </div>

      {/* Lista de facturas */}
      {facturasFiltradas.length === 0 ? (
        <Card className="p-12 text-center">
          <ReceiptPercentIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {facturas.length === 0 ? 'No hay facturas' : 'No hay facturas con este filtro'}
          </h3>
          <p className="text-gray-500">
            {facturas.length === 0 
              ? 'Aún no ha subido ninguna factura.'
              : 'Pruebe cambiando el filtro para ver otras facturas.'}
          </p>
          {facturas.length === 0 && (
            <Link to="/facturas/subir">
              <Button className="mt-4">
                <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                Subir Primera Factura
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folio / UUID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {facturasFiltradas.map((factura) => (
                <tr key={factura.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{factura.folio || 'Sin folio'}</p>
                      {factura.uuid_cfdi && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">
                          {factura.uuid_cfdi}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {factura.fecha_emision || factura.created_at?.split('T')[0]}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(factura.total)}</p>
                    <p className="text-xs text-gray-400">IVA: {formatCurrency(factura.iva)}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[factura.status]}`}>
                      {factura.status === 'pendiente' && <ClockIcon className="h-3 w-3 mr-1" />}
                      {factura.status === 'distribuida' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
                      {factura.status_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      to={`/facturas/${factura.id}`}
                      className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800"
                    >
                      <EyeIcon className="h-4 w-4" />
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Información adicional */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">Información sobre el proceso de facturación</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Pendiente:</strong> La factura está en revisión por el equipo de tesorería.</li>
          <li>• <strong>Procesada:</strong> La factura ha sido validada y está en proceso de distribución de gastos.</li>
          <li>• <strong>Distribuida:</strong> Los gastos han sido distribuidos a las áreas correspondientes.</li>
          <li>• <strong>Rechazada:</strong> La factura tiene errores o no cumple con los requisitos.</li>
        </ul>
      </Card>
    </div>
  )
}
