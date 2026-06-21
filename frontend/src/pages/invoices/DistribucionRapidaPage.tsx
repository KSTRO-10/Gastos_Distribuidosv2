import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
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

type Phase = 'upload' | 'distribute'

export default function DistribucionRapidaPage() {
  const navigate = useNavigate()

  // Phase control
  const [phase, setPhase] = useState<Phase>('upload')

  // Upload phase
  const [xmlFile, setXmlFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Distribute phase
  const [factura, setFactura] = useState<Factura | null>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const [distribuciones, setDistribuciones] = useState<DistribucionRow[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dragActive, setDragActive] = useState(false)

  // Budget warning modal
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [budgetWarnings, setBudgetWarnings] = useState<BudgetWarning[]>([])
  const [pendingPayload, setPendingPayload] = useState<DistribucionData[] | null>(null)

  // Load areas and reset ALL states on mount
  useEffect(() => {
    if (typeof areaService !== 'undefined' && areaService.getAreas) {
      areaService.getAreas().then(setAreas).catch(console.error);
    }
    
    // Limpieza real y física obligatoria
    if (typeof setUploadError === 'function') setUploadError('');
    if (typeof setError === 'function') setError('');
    if (typeof setXmlFile === 'function') setXmlFile(null);
    if (typeof setPhase === 'function') setPhase('upload');

    console.log('[AUDITORÍA] El componente de Distribución Rápida se ha montado y limpiado correctamente.');
  }, []);

  // --- Drag & drop handlers ---
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.name.toLowerCase().endsWith('.xml')) setXmlFile(file)
      else if (file.name.toLowerCase().endsWith('.pdf')) setPdfFile(file)
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, type: 'xml' | 'pdf') => {
    const file = e.target.files?.[0]
    if (!file) return
    if (type === 'xml') setXmlFile(file)
    else setPdfFile(file)
  }

  // --- Upload & process ---
  const handleUpload = async () => {
    // Cláusula de guarda estricta: No hacer nada si no hay archivo
    if (!xmlFile || xmlFile.size === 0) {
      return;
    }
    
    setUploading(true)
    setUploadError('')

    try {
      const result = await facturaService.uploadAndProcess(xmlFile, pdfFile || undefined)
      const facturaData = result.factura
      setFactura(facturaData)

      // Init distribution rows
      const rows: DistribucionRow[] = facturaData.conceptos.map(c => ({
        concepto_id: c.id,
        concepto_desc: c.descripcion,
        importe: Number(c.importe),
        area_id: '',
        porcentaje: 100,
        monto: Number(c.importe),
        notas: '',
      }))
      setDistribuciones(rows)
      setPhase('distribute')
    } catch (err: unknown) {
      let msg = 'Error al procesar el archivo XML'

      if (axios.isAxiosError(err)) {
        const data = err.response?.data
        if (data) {
          if (typeof data === 'string') {
            msg = data
          } else if (typeof data === 'object') {
            // DRF puede enviar: { detail: "..." }, { error: "..." },
            // { xml_file: ["..."] }, { non_field_errors: ["..."] }, etc.
            if (typeof data.detail === 'string') {
              msg = data.detail
            } else if (typeof data.error === 'string') {
              msg = data.error
            } else {
              // Buscar el primer string útil en cualquier clave del objeto
              for (const value of Object.values(data)) {
                if (typeof value === 'string') {
                  msg = value
                  break
                }
                if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
                  msg = value[0]
                  break
                }
              }
            }
          }
        }
      }

      setUploadError(msg)
    } finally {
      setUploading(false)
    }
  }

  // --- Distribution handlers ---
  const handleAreaChange = (index: number, areaId: string) => {
    setDistribuciones(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], area_id: areaId }
      return updated
    })
  }

  const handlePorcentajeChange = (index: number, porcentaje: number) => {
    setDistribuciones(prev => {
      const updated = [...prev]
      const clamped = Math.min(100, Math.max(0, porcentaje))
      updated[index] = {
        ...updated[index],
        porcentaje: clamped,
        monto: (updated[index].importe * clamped) / 100,
      }
      return updated
    })
  }

  const handleNotasChange = (index: number, notas: string) => {
    setDistribuciones(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], notas }
      return updated
    })
  }

  const handleDistribute = async () => {
    if (!factura) return
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
      notas: d.notas,
    }))

    await runDistribute(payload, false)
  }

  const runDistribute = async (payload: DistribucionData[], force: boolean) => {
    if (!factura) return
    try {
      setSaving(true)
      setError('')

      const result = await facturaService.distributeFactura(factura.id, payload, force)

      if (result.needs_confirmation && result.warnings?.length) {
        setBudgetWarnings(result.warnings)
        setPendingPayload(payload)
        setShowBudgetModal(true)
        return
      }

      setSuccess('¡Distribución completada exitosamente!')
      setTimeout(() => navigate('/facturas'), 2000)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Error al distribuir los gastos')
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

  const handleReset = () => {
    setPhase('upload')
    setXmlFile(null)
    setPdfFile(null)
    setFactura(null)
    setDistribuciones([])
    setUploadError('')
    setError('')
    setSuccess('')
  }

  const totalDistribuido = distribuciones.reduce((sum, d) => sum + d.monto, 0)
  const allAreasSelected = distribuciones.length > 0 && distribuciones.every(d => d.area_id !== '')

  // ===== RENDER =====

  // Loading spinner
  if (uploading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Procesando archivo XML...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Distribución Rápida</h1>
          <p className="text-gray-600">
            {phase === 'upload'
              ? 'Suba un archivo XML de factura CFDI para distribuir gastos directamente'
              : `Factura: ${factura?.uuid_cfdi?.substring(0, 8)}... — ${factura?.nombre_emisor || factura?.proveedor_nombre}`}
          </p>
        </div>
        <div className="flex gap-2">
          {phase === 'distribute' && (
            <Button variant="ghost" onClick={handleReset}>
              Subir otra
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/facturas')}>
            Ir a Facturas
          </Button>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-8">
        <div className={`flex items-center gap-2 ${phase === 'upload' ? 'text-blue-600 font-semibold' : 'text-green-600'}`}>
          <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${phase === 'upload' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
            {phase === 'upload' ? '1' : '✓'}
          </span>
          Subir XML
        </div>
        <div className="h-px w-12 bg-gray-300" />
        <div className={`flex items-center gap-2 ${phase === 'distribute' ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
          <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${phase === 'distribute' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
            2
          </span>
          Distribuir Gastos
        </div>
      </div>

      {/* ===================== PHASE 1: UPLOAD ===================== */}
      {phase === 'upload' && (
        <div className="space-y-6">
          {xmlFile && uploadError && uploadError.includes("UUID") && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md shadow-sm">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{uploadError}</span>
              </div>
            </div>
          )}

          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <svg className="mx-auto h-14 w-14 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-lg font-medium text-gray-700 mb-1">
              Arrastre su archivo XML aquí
            </p>
            <p className="text-sm text-gray-500 mb-4">o selecciónelo manualmente</p>
            <div className="flex justify-center gap-4">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 text-sm font-medium">
                Seleccionar XML *
                <input
                  type="file"
                  accept=".xml"
                  className="hidden"
                  onChange={(e) => handleFileInput(e, 'xml')}
                />
              </label>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 text-sm font-medium">
                Adjuntar PDF (opcional)
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handleFileInput(e, 'pdf')}
                />
              </label>
            </div>
          </div>

          {/* Selected files preview */}
          {(xmlFile || pdfFile) && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Archivos seleccionados</h3>
              <div className="space-y-2">
                {xmlFile && (
                  <div className="flex items-center justify-between bg-blue-50 rounded-md px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 font-mono text-xs bg-blue-100 px-2 py-0.5 rounded">XML</span>
                      <span className="text-sm text-gray-800">{xmlFile.name}</span>
                      <span className="text-xs text-gray-500">({(xmlFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button onClick={() => setXmlFile(null)} className="text-gray-400 hover:text-red-500 text-lg" title="Quitar">&times;</button>
                  </div>
                )}
                {pdfFile && (
                  <div className="flex items-center justify-between bg-gray-50 rounded-md px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 font-mono text-xs bg-red-100 px-2 py-0.5 rounded">PDF</span>
                      <span className="text-sm text-gray-800">{pdfFile.name}</span>
                      <span className="text-xs text-gray-500">({(pdfFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button onClick={() => setPdfFile(null)} className="text-gray-400 hover:text-red-500 text-lg" title="Quitar">&times;</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload button */}
          <div className="flex justify-end">
            <Button onClick={handleUpload} disabled={!xmlFile} loading={uploading}>
              Procesar Factura
            </Button>
          </div>
        </div>
      )}

      {/* ===================== PHASE 2: DISTRIBUTE ===================== */}
      {phase === 'distribute' && factura && (
        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-md">
              {success}
            </div>
          )}

          {/* Factura summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xs font-medium text-gray-500 uppercase">Proveedor</h3>
              <p className="text-sm font-bold text-gray-900 mt-1 truncate" title={factura.nombre_emisor}>
                {factura.nombre_emisor || factura.proveedor_nombre}
              </p>
              <p className="text-xs text-gray-500">{factura.rfc_emisor}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xs font-medium text-gray-500 uppercase">Folio / Serie</h3>
              <p className="text-sm font-bold text-gray-900 mt-1">
                {factura.serie ? `${factura.serie}-` : ''}{factura.folio || 'S/N'}
              </p>
              <p className="text-xs text-gray-500">{factura.fecha || 'Sin fecha'}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xs font-medium text-gray-500 uppercase">Subtotal / IVA</h3>
              <p className="text-sm font-bold text-gray-900 mt-1">
                ${Number(factura.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">
                IVA: ${Number(factura.iva).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xs font-medium text-gray-500 uppercase">Total</h3>
              <p className="text-xl font-bold text-blue-600 mt-1">
                ${Number(factura.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">{factura.conceptos.length} concepto(s)</p>
            </div>
          </div>

          {/* Distribution table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Asignar Áreas a Conceptos</h2>
              <p className="text-sm text-gray-500 mt-1">Seleccione el área responsable de cada concepto de la factura</p>
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
                    <tr key={dist.concepto_id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                        <span title={dist.concepto_desc}>
                          {dist.concepto_desc.length > 60
                            ? dist.concepto_desc.substring(0, 60) + '...'
                            : dist.concepto_desc}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-right font-medium whitespace-nowrap">
                        ${dist.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={dist.area_id}
                          onChange={(e) => handleAreaChange(index, e.target.value)}
                          className={`border rounded-md px-2 py-1.5 text-sm w-full min-w-[160px] ${
                            !dist.area_id ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
                          }`}
                          title="Seleccionar área"
                        >
                          <option value="">Seleccionar área...</option>
                          {areas.filter(a => a.is_active).map(area => (
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
                          className="w-16 text-center border border-gray-300 rounded-md px-1 py-1 text-sm"
                          title="Porcentaje"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-right font-medium text-blue-600 whitespace-nowrap">
                        ${dist.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={dist.notas}
                          onChange={(e) => handleNotasChange(index, e.target.value)}
                          placeholder="Opcional"
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full min-w-[120px]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-4 text-right font-semibold text-gray-700">
                      Total Distribuido:
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-lg text-blue-600 whitespace-nowrap">
                      ${totalDistribuido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <h3 className="font-medium text-amber-800 mb-2">Flujo rápido</h3>
            <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
              <li>Cada concepto debe asignarse a un área</li>
              <li>Ajuste el porcentaje si sólo desea distribuir una parte del importe</li>
              <li>Esta factura se marcará como <span className="font-semibold">distribución rápida</span> para diferenciarla del flujo estándar</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <Button variant="ghost" onClick={handleReset}>
              ← Subir otro XML
            </Button>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => navigate('/facturas')}>
                Cancelar
              </Button>
              <Button
                onClick={handleDistribute}
                loading={saving}
                disabled={!allAreasSelected || !!success}
              >
                Distribuir Gastos
              </Button>
            </div>
          </div>
        </div>
      )}

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
