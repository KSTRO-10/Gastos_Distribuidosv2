import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { budgetService, descargarPlantilla, Plantilla, ItemClavePres } from '../../services/budgetService'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import { Badge } from '../../components/ui/Badge'
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

export default function PlantillaDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [plantilla, setPlantilla] = useState<Plantilla | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (id) {
      loadPlantilla()
    }
  }, [id])

  const loadPlantilla = async () => {
    try {
      setLoading(true)
      const data = await budgetService.getPlantilla(Number(id))
      setPlantilla(data)
    } catch (err) {
      setError('Error al cargar la plantilla')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleImportExcel = async () => {
    if (!selectedFile || !plantilla) return

    try {
      setImporting(true)
      setImportError('')
      setImportSuccess('')

      const result = await budgetService.importExcel(plantilla.id, selectedFile)

      setImportSuccess(result.message || `Se importaron ${result.items_created} ítems correctamente`)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Recargar datos
      await loadPlantilla()

      // Cerrar modal después de un momento
      setTimeout(() => {
        setShowImportModal(false)
        setImportSuccess('')
      }, 2000)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string; detail?: string } } }
      setImportError(
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Error al importar el archivo Excel'
      )
      console.error(err)
    } finally {
      setImporting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
    setImportError('')
    setImportSuccess('')
  }

  const handleDescargarPlantilla = async () => {
    try {
      setDownloadingTemplate(true)
      await descargarPlantilla()
    } catch (err) {
      setError('Error al descargar la plantilla de Excel')
      console.error(err)
    } finally {
      setDownloadingTemplate(false)
    }
  }

  const itemColumns = [
    {
      key: 'cog',
      header: 'COG',
      render: (item: ItemClavePres) => (
        <span className="font-mono text-sm font-semibold text-indigo-700">{item.cog}</span>
      )
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      render: (item: ItemClavePres) => (
        <span className="text-sm text-gray-900 max-w-md truncate block">{item.descripcion}</span>
      )
    },
    { key: 'unidad_ejecutora', header: 'Unidad Ejecutora' },
    {
      key: 'tipo_gasto',
      header: 'Tipo Gasto',
      render: (item: ItemClavePres) => (
        <Badge variant="info" size="sm">{item.tipo_gasto}</Badge>
      )
    },
    { key: 'programa_presupuestario', header: 'Programa Presupuestario' },
    { key: 'accion', header: 'Acción' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!plantilla) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          Plantilla no encontrada
        </div>
        <Button variant="secondary" onClick={() => navigate('/budget/plantillas')} className="mt-4">
          Regresar
        </Button>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={plantilla.nombre}
        subtitle={`Ejercicio Fiscal ${plantilla.ejercicio_fiscal}`}
        icon={<DocumentTextIcon className="h-7 w-7" />}
        gradient="indigo"
        breadcrumbs={[
          { label: 'Claves Presupuestarias', href: '/budget/plantillas' },
          { label: plantilla.nombre },
        ]}
      />

      <div className="flex justify-end mb-4">
        <Button
          variant="secondary"
          onClick={() => navigate('/budget/plantillas')}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Regresar
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Entidad Federativa</label>
              <p className="font-medium text-gray-900 mt-0.5">{plantilla.entidad_federativa || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Clasificador Administrativo</label>
              <p className="font-medium text-gray-900 mt-0.5">{plantilla.clasificador_administrativo || '—'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">No. Municipio / Ramo</label>
              <p className="font-medium text-gray-900 mt-0.5">{plantilla.no_municipio_ramo || '—'}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Unidad Administrativa</label>
              <p className="font-medium text-gray-900 mt-0.5">{plantilla.unidad_administrativa || '—'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total de Ítems</label>
              <p className="text-3xl font-bold text-indigo-600 mt-0.5">
                {plantilla.items_count ?? plantilla.items?.length ?? 0}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Última actualización</label>
              <p className="font-medium text-gray-900 mt-0.5">
                {plantilla.updated_at
                  ? new Date(plantilla.updated_at).toLocaleDateString('es-MX', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    })
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Ítems de Clave Presupuestal ({plantilla.items?.length ?? 0})
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleDescargarPlantilla}
              loading={downloadingTemplate}
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Descargar Plantilla
            </Button>
            <Button onClick={() => setShowImportModal(true)}>
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              Importar Excel
            </Button>
          </div>
        </div>
        <Table
          columns={itemColumns}
          data={plantilla.items || []}
          keyExtractor={(item) => item.id}
          emptyMessage="No hay ítems registrados. Importa un archivo Excel para agregar claves presupuestales."
        />
      </div>

      {/* Import Excel Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false)
          setImportError('')
          setImportSuccess('')
          setSelectedFile(null)
        }}
        title="Importar Excel de Claves Presupuestales"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Selecciona un archivo <strong>.xlsx</strong> con las claves presupuestales. 
            Los ítems se agregarán a la plantilla <strong>"{plantilla.nombre}"</strong>.
          </p>

          {importError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {importError}
            </div>
          )}

          {importSuccess && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm">
              ✓ {importSuccess}
            </div>
          )}

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
            <ArrowUpTrayIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              aria-label="Seleccionar archivo Excel para importar"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 file:cursor-pointer cursor-pointer"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-indigo-600 font-medium">
                📄 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowImportModal(false)
                setImportError('')
                setImportSuccess('')
                setSelectedFile(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImportExcel}
              loading={importing}
              disabled={!selectedFile}
            >
              Importar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
