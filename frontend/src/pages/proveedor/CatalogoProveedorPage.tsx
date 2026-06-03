import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  ArrowUpTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'
import { Button, Modal, PageHeader, CogCombobox } from '@/components/ui'
import { catalogoProveedorService, ProductoProveedor, CreateProductoData, CsvUploadResult } from '@/services/catalogoProveedorService'
import { procurementService, Cog } from '@/services/procurementService'

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value))

export default function CatalogoProveedorPage() {
  const [productos, setProductos] = useState<ProductoProveedor[]>([])
  const [cogs, setCogs] = useState<Cog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal de formulario
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<CreateProductoData>({
    cog: 0,
    nombre: '',
    descripcion: '',
    unidad: '',
    precio_unitario: 0,
    marca: '',
    modelo: '',
  })
  const [saving, setSaving] = useState(false)

  // Modal CSV
  const [showCsv, setShowCsv] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [csvResult, setCsvResult] = useState<CsvUploadResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modal eliminar
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [productosData, cogsData] = await Promise.all([
        catalogoProveedorService.getProductos(),
        procurementService.getCogs(),
      ])
      setProductos(productosData)
      setCogs(cogsData)
    } catch {
      toast.error('Error al cargar el catálogo')
    } finally {
      setLoading(false)
    }
  }

  const filteredProductos = productos.filter(p => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      p.nombre.toLowerCase().includes(term) ||
      p.cog_codigo.toLowerCase().includes(term) ||
      p.cog_descripcion.toLowerCase().includes(term) ||
      p.marca.toLowerCase().includes(term) ||
      p.descripcion.toLowerCase().includes(term)
    )
  })

  // ─── Formulario ─────────────────────────
  const openCreate = () => {
    setEditingId(null)
    setFormData({ cog: 0, nombre: '', descripcion: '', unidad: '', precio_unitario: 0, marca: '', modelo: '' })
    setShowForm(true)
  }

  const openEdit = (p: ProductoProveedor) => {
    setEditingId(p.id)
    setFormData({
      cog: p.cog,
      nombre: p.nombre,
      descripcion: p.descripcion,
      unidad: p.unidad,
      precio_unitario: Number(p.precio_unitario),
      marca: p.marca,
      modelo: p.modelo,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.cog || !formData.nombre.trim() || !formData.unidad.trim() || formData.precio_unitario <= 0) {
      toast.error('Llene todos los campos obligatorios (COG, nombre, unidad, precio > 0)')
      return
    }
    try {
      setSaving(true)
      if (editingId) {
        await catalogoProveedorService.updateProducto(editingId, formData)
        toast.success('Producto actualizado')
      } else {
        await catalogoProveedorService.createProducto(formData)
        toast.success('Producto agregado al catálogo')
      }
      setShowForm(false)
      await loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al guardar el producto')
    } finally {
      setSaving(false)
    }
  }

  // ─── CSV ────────────────────────────────
  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast.error('Seleccione un archivo CSV')
      return
    }
    try {
      setUploading(true)
      const result = await catalogoProveedorService.uploadCsv(csvFile)
      setCsvResult(result)
      if (result.total_procesados > 0) {
        toast.success(`Se procesaron ${result.total_procesados} productos`)
      }
      await loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al cargar el CSV')
    } finally {
      setUploading(false)
    }
  }

  const closeCsv = () => {
    setShowCsv(false)
    setCsvFile(null)
    setCsvResult(null)
  }

  // ─── Eliminar ───────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return
    try {
      setDeleting(true)
      await catalogoProveedorService.deleteProducto(deleteId)
      toast.success('Producto eliminado')
      setDeleteId(null)
      await loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  // ─── Descargar plantilla ────────────────
  const downloadTemplate = () => {
    const header = 'cog_codigo,nombre,descripcion,unidad,precio_unitario,marca,modelo'
    const example = '2110,Papel bond carta,Paquete de 500 hojas,Paquete,85.50,HP,Premium'
    const blob = new Blob([`${header}\n${example}\n`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_catalogo.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Catálogo de Productos"
        subtitle={`${productos.length} producto${productos.length !== 1 ? 's' : ''} registrado${productos.length !== 1 ? 's' : ''}`}
      />

      {/* Barra de acciones */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Búsqueda */}
        <div className="relative w-full sm:w-96">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, COG, marca..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" title="Limpiar búsqueda">
              <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setShowCsv(true)} variant="secondary">
            <ArrowUpTrayIcon className="h-5 w-5 mr-1" />
            Cargar CSV
          </Button>
          <Button onClick={openCreate}>
            <PlusIcon className="h-5 w-5 mr-1" />
            Agregar Producto
          </Button>
        </div>
      </div>

      {/* Tabla */}
      {filteredProductos.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-3 text-lg font-medium text-gray-900">
            {search ? 'Sin resultados' : 'Catálogo vacío'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {search
              ? 'Intente con otro término de búsqueda.'
              : 'Agregue productos manualmente o cargue un archivo CSV.'}
          </p>
          {!search && (
            <div className="mt-6 flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => setShowCsv(true)}>
                <ArrowUpTrayIcon className="h-5 w-5 mr-1" />
                Cargar CSV
              </Button>
              <Button onClick={openCreate}>
                <PlusIcon className="h-5 w-5 mr-1" />
                Agregar Producto
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">COG</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProductos.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-blue-600">{p.cog_codigo}</span>
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">{p.cog_descripcion}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{p.nombre}</p>
                      {p.descripcion && (
                        <p className="text-xs text-gray-500 truncate max-w-[250px]">{p.descripcion}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.unidad}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(p.precio_unitario)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {p.marca}
                      {p.modelo && <span className="text-gray-400"> / {p.modelo}</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar producto"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar producto"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Modal: Formulario de Producto ──────── */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Editar Producto' : 'Agregar Producto'}
        size="lg"
      >
        <div className="space-y-4">
          <CogCombobox
            label="Clasificación COG *"
            options={cogs.map(c => ({
              id: c.id,
              codigo: c.codigo,
              descripcion: c.descripcion,
              capitulo: c.capitulo,
              concepto: c.concepto,
              partida_generica: c.partida_generica,
              palabras_clave: c.palabras_clave,
            }))}
            value={formData.cog || null}
            onChange={val => setFormData({ ...formData, cog: val || 0 })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del producto *</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Papel bond carta"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={formData.descripcion || ''}
              onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Descripción detallada del producto"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de medida *</label>
              <input
                type="text"
                value={formData.unidad}
                onChange={e => setFormData({ ...formData, unidad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Pieza, Paquete, Litro"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio unitario *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.precio_unitario || ''}
                onChange={e => setFormData({ ...formData, precio_unitario: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <input
                type="text"
                value={formData.marca || ''}
                onChange={e => setFormData({ ...formData, marca: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: HP, Samsung"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
              <input
                type="text"
                value={formData.modelo || ''}
                onChange={e => setFormData({ ...formData, modelo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Premium, X200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Modal: Carga CSV ──────────────────── */}
      <Modal isOpen={showCsv} onClose={closeCsv} title="Cargar Catálogo desde CSV" size="lg">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Formato requerido</h4>
            <p className="text-sm text-blue-700 mb-2">
              El archivo CSV debe contener las siguientes columnas (las <strong>negritas</strong> son obligatorias):
            </p>
            <code className="block text-xs bg-blue-100 rounded p-2 text-blue-900">
              <strong>cog_codigo</strong>, <strong>nombre</strong>, descripcion, <strong>unidad</strong>, <strong>precio_unitario</strong>, marca, modelo
            </code>
            <button
              onClick={downloadTemplate}
              className="mt-3 inline-flex items-center text-sm text-blue-700 hover:text-blue-900 font-medium"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              Descargar plantilla CSV
            </button>
          </div>

          {!csvResult ? (
            <>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <ArrowUpTrayIcon className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  {csvFile ? csvFile.name : 'Haga clic para seleccionar un archivo CSV'}
                </p>
                {csvFile && (
                  <p className="text-xs text-gray-400 mt-1">
                    {(csvFile.size / 1024).toFixed(1)} KB
                  </p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => setCsvFile(e.target.files?.[0] || null)}
                  aria-label="Seleccionar archivo CSV"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={closeCsv}>
                  Cancelar
                </Button>
                <Button onClick={handleCsvUpload} disabled={!csvFile || uploading}>
                  {uploading ? 'Cargando...' : 'Cargar Archivo'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{csvResult.creados}</p>
                    <p className="text-xs text-green-600">Creados</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{csvResult.actualizados}</p>
                    <p className="text-xs text-blue-600">Actualizados</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{csvResult.errores.length}</p>
                    <p className="text-xs text-red-600">Errores</p>
                  </div>
                </div>

                {csvResult.errores.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <h5 className="font-medium text-red-800 mb-1 text-sm">Errores:</h5>
                    <ul className="text-xs text-red-700 space-y-0.5">
                      {csvResult.errores.map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={closeCsv}>Cerrar</Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ─── Modal: Confirmar eliminación ──────── */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Eliminar Producto"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          ¿Está seguro de eliminar este producto de su catálogo? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
