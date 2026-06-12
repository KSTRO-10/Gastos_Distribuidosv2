import { useState, useEffect } from 'react'
import { PlusIcon, EyeIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { inventoryService, Auditoria, Stock } from '@/services/inventoryService'
import { areaService, Area } from '@/services/areaService'
import { PageHeader, Button, Table, Modal, Select, Input } from '@/components/ui'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'

export default function AuditoriasPage() {
  const [auditorias, setAuditorias] = useState<Auditoria[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  
  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedAlmacen, setSelectedAlmacen] = useState<string>('')
  const [stockActual, setStockActual] = useState<Stock[]>([])
  const [fisicoData, setFisicoData] = useState<Record<number, { cantidad: number, justificacion: string }>>({})
  const [submitting, setSubmitting] = useState(false)

  // View/Approve Modal
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedAuditoria, setSelectedAuditoria] = useState<Auditoria | null>(null)

  const { user } = useAuthStore()

  const loadData = async () => {
    try {
      setLoading(true)
      const [auds, areasData] = await Promise.all([
        inventoryService.getAuditorias(),
        areaService.getAreas()
      ])
      setAuditorias(auds)
      setAreas(areasData)
    } catch (error) {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Cargar artículos y stock cuando selecciona almacén
  useEffect(() => {
    if (selectedAlmacen) {
      Promise.all([
        inventoryService.getArticulos(),
        inventoryService.getStock(Number(selectedAlmacen))
      ]).then(([articulos, stockData]) => {
        // Crear un mapa del stock actual
        const stockMap = new Map(stockData.map(s => [s.articulo, s.cantidad]))
        
        // Formar la lista combinada (todos los artículos, con stock 0 si no existen)
        const combinedStock = articulos.map(a => ({
          id: a.id, // dummy id
          almacen: Number(selectedAlmacen),
          articulo: a.id,
          articulo_nombre: a.nombre,
          articulo_codigo: a.codigo,
          cantidad: stockMap.get(a.id) || 0,
          cantidad_reservada: 0,
          updated_at: ''
        }))
        
        setStockActual(combinedStock)
        const initialFisico: Record<number, any> = {}
        combinedStock.forEach(s => {
          initialFisico[s.articulo] = { cantidad: s.cantidad, justificacion: '' }
        })
        setFisicoData(initialFisico)
      })
    } else {
      setStockActual([])
    }
  }, [selectedAlmacen])

  const handleCreate = async () => {
    if (!selectedAlmacen) return toast.error('Selecciona un almacén')
    
    // Preparar detalles
    const detalles = stockActual.map(s => ({
      articulo: s.articulo,
      existencia_sistema: s.cantidad,
      existencia_fisica: fisicoData[s.articulo]?.cantidad || 0,
      justificacion: fisicoData[s.articulo]?.justificacion || ''
    }))

    // Validar que si hay diferencia, haya justificación
    const diferenciasSinJustificar = detalles.filter(d => 
      d.existencia_sistema !== d.existencia_fisica && !d.justificacion.trim()
    )

    if (diferenciasSinJustificar.length > 0) {
      return toast.error('Debes escribir una justificación para las diferencias de stock.')
    }

    try {
      setSubmitting(true)
      await inventoryService.createAuditoria({
        almacen: Number(selectedAlmacen),
        notas: 'Auditoría física de inventario',
        detalles
      } as any)
      toast.success('Auditoría registrada (Pendiente de Autorización)')
      setCreateModalOpen(false)
      setSelectedAlmacen('')
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar auditoría')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedAuditoria) return
    try {
      setSubmitting(true)
      await inventoryService.aprobarAuditoria(selectedAuditoria.id)
      toast.success('Auditoría autorizada y stock ajustado')
      setViewModalOpen(false)
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al autorizar')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    { key: 'numero', header: 'Folio', className: 'font-mono text-sm' },
    { key: 'almacen_nombre', header: 'Almacén', className: 'font-medium' },
    { key: 'fecha_inicio', header: 'Fecha', render: (a: Auditoria) => new Date(a.fecha_inicio).toLocaleDateString() },
    { key: 'creada_por_nombre', header: 'Auditor' },
    { 
      key: 'estado', 
      header: 'Estado', 
      render: (a: Auditoria) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          a.estado === 'borrador' ? 'bg-gray-100 text-gray-800' :
          a.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {a.estado === 'borrador' ? 'En Proceso' : a.estado === 'pendiente' ? 'Pendiente Autorizar' : 'Cerrada'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (a: Auditoria) => (
        <button
          onClick={() => { setSelectedAuditoria(a); setViewModalOpen(true); }}
          className="text-blue-600 hover:text-blue-900"
          title="Ver Detalle"
        >
          <EyeIcon className="h-5 w-5" />
        </button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditorías de Inventario"
        subtitle="Verificación física y ajuste de diferencias de stock"
        gradient="blue"
        actions={
          <Button onClick={() => setCreateModalOpen(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Nueva Auditoría
          </Button>
        }
      />

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <Table
          columns={columns}
          data={auditorias}
          keyExtractor={(a) => a.id}
          loading={loading}
          emptyMessage="No hay auditorías registradas."
        />
      </div>

      {/* Modal Nueva Auditoría */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Registrar Conteo Físico"
        size="xl"
      >
        <div className="space-y-4">
          <Select
            label="Almacén a auditar *"
            value={selectedAlmacen}
            onChange={(e) => setSelectedAlmacen(e.target.value)}
            options={areas.map(a => ({ value: a.id, label: a.nombre }))}
            placeholder="Seleccione almacén..."
          />

          {stockActual.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="font-medium mb-3">Conteo por Artículo</h3>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {stockActual.map(s => {
                  const cantFisica = fisicoData[s.articulo]?.cantidad ?? s.cantidad
                  const diff = cantFisica - s.cantidad
                  return (
                    <div key={s.id} className="grid grid-cols-12 gap-3 items-center bg-gray-50 p-3 rounded">
                      <div className="col-span-4">
                        <p className="text-sm font-medium">{s.articulo_nombre || s.articulo_codigo}</p>
                        <p className="text-xs text-gray-500">Sistema: {s.cantidad}</p>
                      </div>
                      <div className="col-span-3">
                        <Input
                          label="Físico"
                          type="number"
                          step="0.01"
                          value={cantFisica}
                          onChange={(e) => setFisicoData({
                            ...fisicoData, 
                            [s.articulo]: { ...fisicoData[s.articulo], cantidad: Number(e.target.value) }
                          })}
                        />
                      </div>
                      <div className="col-span-2 text-center">
                        <span className={`text-sm font-bold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </span>
                      </div>
                      <div className="col-span-3">
                        <Input
                          label="Justificación"
                          placeholder="Si hay diff..."
                          value={fisicoData[s.articulo]?.justificacion || ''}
                          onChange={(e) => setFisicoData({
                            ...fisicoData, 
                            [s.articulo]: { ...fisicoData[s.articulo], justificacion: e.target.value }
                          })}
                          disabled={diff === 0}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={submitting} disabled={!selectedAlmacen || stockActual.length === 0}>
              Finalizar Conteo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Ver Detalle / Autorizar */}
      {selectedAuditoria && (
        <Modal
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title={`Auditoría ${selectedAuditoria.numero}`}
          size="xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
              <div><span className="font-medium text-gray-500">Almacén:</span> {selectedAuditoria.almacen_nombre}</div>
              <div><span className="font-medium text-gray-500">Auditor:</span> {selectedAuditoria.creada_por_nombre}</div>
              <div><span className="font-medium text-gray-500">Fecha:</span> {new Date(selectedAuditoria.fecha_inicio).toLocaleDateString()}</div>
              <div><span className="font-medium text-gray-500">Estado:</span> {selectedAuditoria.estado.toUpperCase()}</div>
            </div>

            <div className="mt-4">
              <h4 className="font-medium mb-2">Diferencias Encontradas</h4>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr>
                    <th className="text-left font-medium text-gray-500">Artículo</th>
                    <th className="text-right font-medium text-gray-500">Sistema</th>
                    <th className="text-right font-medium text-gray-500">Físico</th>
                    <th className="text-right font-medium text-gray-500">Diferencia</th>
                    <th className="text-left font-medium text-gray-500 pl-4">Justificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedAuditoria.detalles.map(d => (
                    <tr key={d.id} className={d.diferencia !== 0 ? (d.diferencia! < 0 ? 'bg-red-50' : 'bg-green-50') : ''}>
                      <td className="py-2">{d.articulo_nombre}</td>
                      <td className="py-2 text-right">{d.existencia_sistema}</td>
                      <td className="py-2 text-right font-bold">{d.existencia_fisica}</td>
                      <td className={`py-2 text-right font-bold ${d.diferencia! < 0 ? 'text-red-600' : d.diferencia! > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {d.diferencia! > 0 ? '+' : ''}{d.diferencia}
                      </td>
                      <td className="py-2 pl-4 text-gray-600 text-xs">{d.justificacion || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedAuditoria.estado === 'pendiente' && (user?.role === 'admin' || user?.role === 'tesoreria') && (
              <div className="bg-yellow-50 p-4 rounded-lg mt-6 flex items-center justify-between border border-yellow-200">
                <div className="text-sm text-yellow-800">
                  <strong className="block mb-1">Autorización Pendiente</strong>
                  Al autorizar, el stock se ajustará forzosamente para igualar el conteo físico.
                </div>
                <Button onClick={handleApprove} loading={submitting}>
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  Autorizar Ajuste
                </Button>
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <Button variant="secondary" onClick={() => setViewModalOpen(false)}>Cerrar</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
