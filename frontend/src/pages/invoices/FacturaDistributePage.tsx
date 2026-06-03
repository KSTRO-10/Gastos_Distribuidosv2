import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { facturaService, Factura, DistribucionData, BudgetWarning } from '../../services/facturaService'
import { areaService, Area } from '../../services/areaService'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

interface DistribucionRow {
  concepto_id: number
  concepto_desc: string
  importe: number
  area_id: string
  porcentaje: number
  monto: number
  notas: string
}

export default function FacturaDistributePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [factura, setFactura] = useState<Factura | null>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const [distribuciones, setDistribuciones] = useState<DistribucionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Budget warning modal
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [budgetWarnings, setBudgetWarnings] = useState<BudgetWarning[]>([])
  const [pendingPayload, setPendingPayload] = useState<DistribucionData[] | null>(null)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      const [facturaData, areasData] = await Promise.all([
        facturaService.getFactura(Number(id)),
        areaService.getAreas()
      ])
      
      setFactura(facturaData)
      setAreas(areasData)
      
      // Initialize distributions - one row per concept
      const initialDist = facturaData.conceptos.map(concepto => ({
        concepto_id: concepto.id,
        concepto_desc: concepto.descripcion.substring(0, 50) + (concepto.descripcion.length > 50 ? '...' : ''),
        importe: Number(concepto.importe),
        area_id: '',
        porcentaje: 100,
        monto: Number(concepto.importe),
        notas: ''
      }))
      
      setDistribuciones(initialDist)
    } catch (err) {
      setError('Error al cargar los datos')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAreaChange = (index: number, areaId: string) => {
    const updated = [...distribuciones]
    updated[index].area_id = areaId
    setDistribuciones(updated)
  }

  const handlePorcentajeChange = (index: number, porcentaje: number) => {
    const updated = [...distribuciones]
    updated[index].porcentaje = porcentaje
    updated[index].monto = (updated[index].importe * porcentaje) / 100
    setDistribuciones(updated)
  }

  const handleNotasChange = (index: number, notas: string) => {
    const updated = [...distribuciones]
    updated[index].notas = notas
    setDistribuciones(updated)
  }

  const handleSubmit = async () => {
    // Validate all have area selected
    const incomplete = distribuciones.filter(d => !d.area_id)
    if (incomplete.length > 0) {
      setError('Debe asignar un área a todos los conceptos')
      return
    }

    const payload: DistribucionData[] = distribuciones.map(d => ({
      concepto_id: d.concepto_id,
      area_id: Number(d.area_id),
      monto: d.monto,
      porcentaje: d.porcentaje,
      notas: d.notas
    }))

    await runDistribute(payload, false)
  }

  const runDistribute = async (payload: DistribucionData[], force: boolean) => {
    try {
      setSaving(true)
      setError('')

      const result = await facturaService.distributeFactura(Number(id), payload, force)

      if (result.needs_confirmation && result.warnings?.length) {
        setBudgetWarnings(result.warnings)
        setPendingPayload(payload)
        setShowBudgetModal(true)
        return
      }

      setSuccess('Distribución enviada. Se procesará en segundo plano.')
      setTimeout(() => { navigate('/facturas') }, 2000)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      setError(error.response?.data?.error || 'Error al distribuir')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleForceDistribute = async () => {
    setShowBudgetModal(false)
    if (pendingPayload) {
      await runDistribute(pendingPayload, true)
    }
  }

  const totalDistribuido = distribuciones.reduce((sum, d) => sum + d.monto, 0)

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Distribuir Gastos</h1>
          <p className="text-gray-600">
            Factura: {factura.uuid_cfdi?.substring(0, 8)}... - {factura.proveedor_nombre}
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/facturas/${factura.id}`)}>
          Cancelar
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-md mb-4">
          {success}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Factura</h3>
          <p className="text-2xl font-bold text-gray-900">
            ${Number(factura.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total a Distribuir</h3>
          <p className="text-2xl font-bold text-blue-600">
            ${totalDistribuido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Conceptos</h3>
          <p className="text-2xl font-bold text-gray-900">{factura.conceptos.length}</p>
        </div>
      </div>

      {/* Distribution Table */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Asignación de Gastos por Área</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Importe</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área *</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">%</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {distribuciones.map((dist, index) => (
                <tr key={dist.concepto_id}>
                  <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                    {dist.concepto_desc}
                  </td>
                  <td className="px-4 py-4 text-sm text-right font-medium">
                    ${dist.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={dist.area_id}
                      onChange={(e) => handleAreaChange(index, e.target.value)}
                      className="border rounded-md px-2 py-1 text-sm w-full min-w-[150px]"
                      title="Seleccionar área"
                    >
                      <option value="">Seleccionar...</option>
                      {areas.map(area => (
                        <option key={area.id} value={area.id}>{area.nombre}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={dist.porcentaje}
                      onChange={(e) => handlePorcentajeChange(index, Number(e.target.value))}
                      className="w-16 text-center border rounded-md px-1 py-1 text-sm"
                      title="Porcentaje"
                    />
                  </td>
                  <td className="px-4 py-4 text-sm text-right font-medium text-blue-600">
                    ${dist.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4">
                    <input
                      type="text"
                      value={dist.notas}
                      onChange={(e) => handleNotasChange(index, e.target.value)}
                      placeholder="Opcional"
                      className="border rounded-md px-2 py-1 text-sm w-full min-w-[120px]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-4 py-4 text-right font-semibold">
                  Total Distribuido:
                </td>
                <td className="px-4 py-4 text-right font-bold text-lg text-blue-600">
                  ${totalDistribuido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-medium text-blue-800 mb-2">Información</h3>
        <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>Asigne cada concepto de la factura a un área específica</li>
          <li>Puede distribuir parcialmente ajustando el porcentaje</li>
          <li>Los gastos se registrarán en el presupuesto del área seleccionada</li>
          <li>Esta acción no se puede deshacer fácilmente</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button 
          variant="secondary" 
          onClick={() => navigate(`/facturas/${factura.id}`)}
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          loading={saving}
          disabled={distribuciones.some(d => !d.area_id)}
        >
          Confirmar Distribución
        </Button>
      </div>

      {/* Modal de advertencia de presupuesto */}
      <Modal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        title="Advertencia de presupuesto"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-sm text-amber-800">
              Una o más áreas superarán su presupuesto mensual con esta distribución.
            </p>
          </div>

          <ul className="space-y-3">
            {budgetWarnings.map((w, i) => (
              <li key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-semibold text-gray-800">{w.area_nombre}</p>
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-600">
                  <span>Presupuesto mensual:</span>
                  <span className="text-right">${w.presupuesto_mensual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  <span>Ya gastado:</span>
                  <span className="text-right">${w.ya_gastado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  <span>Monto a distribuir:</span>
                  <span className="text-right">${w.nuevo_monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  <span className="font-medium text-red-600">Exceso:</span>
                  <span className="text-right font-medium text-red-600">${w.exceso.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowBudgetModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleForceDistribute}
              loading={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Distribuir de todas formas
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
