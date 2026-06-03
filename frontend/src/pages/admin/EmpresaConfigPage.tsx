import { useState, useEffect, FormEvent } from 'react'
import { toast } from 'react-hot-toast'
import PageHeader from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import {
  companyService,
  Company,
  firmanteService,
  Firmante,
  FIRMANTE_TIPO_CHOICES,
} from '@/services/companyService'
import { tenantService } from '@/services/tenantService'

interface FirmanteFormState {
  id?: number
  tipo_documento: string
  nombre: string
  cargo: string
  orden: number
  sello_imagen: File | null
  current_sello_url?: string | null
}

const emptyFirmanteForm: FirmanteFormState = {
  tipo_documento: FIRMANTE_TIPO_CHOICES[0].value,
  nombre: '',
  cargo: '',
  orden: 1,
  sello_imagen: null,
  current_sello_url: null,
}

export default function EmpresaConfigPage() {
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Image files
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [membreteFile, setMembreteFile] = useState<File | null>(null)
  const [piePaginaFile, setPiePaginaFile] = useState<File | null>(null)

  // Datos institucionales
  const [municipio, setMunicipio] = useState('')
  const [lemaAnual, setLemaAnual] = useState('')
  const [originalMunicipio, setOriginalMunicipio] = useState('')
  const [originalLemaAnual, setOriginalLemaAnual] = useState('')

  // Firmantes
  const [firmantes, setFirmantes] = useState<Firmante[]>([])
  const [firmantesLoading, setFirmantesLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSaving, setModalSaving] = useState(false)
  const [firmanteForm, setFirmanteForm] = useState<FirmanteFormState>(emptyFirmanteForm)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      setLoading(true)
      const [companies, tenant] = await Promise.all([
        companyService.getCompanies(),
        tenantService.getCurrent().catch(() => null),
      ])
      if (companies && companies.length > 0) {
        const c = companies[0]
        setCompany(c)
        setMunicipio(c.municipio || '')
        setOriginalMunicipio(c.municipio || '')
        await loadFirmantes(c.id)
      }
      const lema = (tenant?.settings?.lema_anual as string) || ''
      setLemaAnual(lema)
      setOriginalLemaAnual(lema)
    } catch (error) {
      console.error('Error fetching config:', error)
      toast.error('Error al cargar la configuración')
    } finally {
      setLoading(false)
    }
  }

  const loadFirmantes = async (companyId: number) => {
    try {
      setFirmantesLoading(true)
      const data = await firmanteService.list(companyId)
      setFirmantes(data)
    } catch (error) {
      console.error('Error loading firmantes:', error)
      toast.error('Error al cargar firmantes')
    } finally {
      setFirmantesLoading(false)
    }
  }

  const hasFileChanges = !!(logoFile || membreteFile || piePaginaFile)
  const hasTextChanges =
    municipio !== originalMunicipio || lemaAnual !== originalLemaAnual
  const canSave = hasFileChanges || hasTextChanges

  const handleSave = async () => {
    if (!company) return

    try {
      setSaving(true)

      // Company update (text + files combined into one PATCH if needed)
      const municipioChanged = municipio !== originalMunicipio
      if (hasFileChanges || municipioChanged) {
        const formData = new FormData()
        if (logoFile) formData.append('logo', logoFile)
        if (membreteFile) formData.append('membrete', membreteFile)
        if (piePaginaFile) formData.append('pie_pagina', piePaginaFile)
        if (municipioChanged) formData.append('municipio', municipio)
        await companyService.updateCompany(company.id, formData)
      }

      // Tenant settings update
      if (lemaAnual !== originalLemaAnual) {
        await tenantService.updateSettings({ lema_anual: lemaAnual })
      }

      toast.success('Configuración actualizada correctamente')

      // Reset and reload
      setLogoFile(null)
      setMembreteFile(null)
      setPiePaginaFile(null)
      await loadAll()
    } catch (error) {
      console.error('Error saving config:', error)
      toast.error('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  // ----- Firmante modal handlers -----
  const openCreateModal = () => {
    setFirmanteForm(emptyFirmanteForm)
    setModalOpen(true)
  }

  const openEditModal = (f: Firmante) => {
    setFirmanteForm({
      id: f.id,
      tipo_documento: f.tipo_documento,
      nombre: f.nombre || '',
      cargo: f.cargo || '',
      orden: f.orden,
      sello_imagen: null,
      current_sello_url: f.sello_imagen,
    })
    setModalOpen(true)
  }

  const handleSubmitFirmante = async (e: FormEvent) => {
    e.preventDefault()
    if (!company) return
    try {
      setModalSaving(true)
      const formData = new FormData()
      formData.append('company', String(company.id))
      formData.append('tipo_documento', firmanteForm.tipo_documento)
      formData.append('nombre', firmanteForm.nombre)
      formData.append('cargo', firmanteForm.cargo)
      formData.append('orden', String(firmanteForm.orden))
      if (firmanteForm.sello_imagen) {
        formData.append('sello_imagen', firmanteForm.sello_imagen)
      }

      if (firmanteForm.id) {
        await firmanteService.update(firmanteForm.id, formData)
        toast.success('Firmante actualizado')
      } else {
        await firmanteService.create(formData)
        toast.success('Firmante creado')
      }
      setModalOpen(false)
      await loadFirmantes(company.id)
    } catch (error: any) {
      console.error('Error saving firmante:', error)
      const detail =
        error?.response?.data &&
        (typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data))
      toast.error(`Error al guardar firmante${detail ? `: ${detail}` : ''}`)
    } finally {
      setModalSaving(false)
    }
  }

  const handleDeleteFirmante = async (f: Firmante) => {
    if (!company) return
    if (!confirm(`¿Eliminar el firmante "${f.nombre_completo_display || f.cargo}"?`)) return
    try {
      await firmanteService.remove(f.id)
      toast.success('Firmante eliminado')
      await loadFirmantes(company.id)
    } catch (error) {
      console.error('Error deleting firmante:', error)
      toast.error('Error al eliminar firmante')
    }
  }

  // ----- Render helpers -----
  const renderFilePreview = (
    currentUrl: string | null,
    selectedFile: File | null,
    label: string,
    setFile: (file: File | null) => void,
    accept: string = 'image/*'
  ) => {
    const previewUrl = selectedFile ? URL.createObjectURL(selectedFile) : currentUrl

    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md relative group min-h-[150px]">
          {previewUrl ? (
            <div className="absolute inset-0 flex items-center justify-center p-2">
              <img
                src={previewUrl}
                alt={label}
                className="max-h-full max-w-full object-contain"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-sm">Haz clic o arrastra para cambiar</p>
                <input
                  type="file"
                  accept={accept}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-center flex flex-col items-center justify-center w-full h-full absolute inset-0">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                  <span>Sube un archivo</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept={accept}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
                <p className="pl-1">o arrastra y suelta</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 5MB</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
        No se encontró información de la empresa. Por favor configure una empresa en el sistema.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración de Documentos (PDFs)"
        subtitle={`Empresa: ${company.razon_social}`}
      />

      {/* SECCIÓN 1: Datos Institucionales */}
      <Card>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
              Datos Institucionales
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Información que aparece en el encabezado y firmas de los documentos generados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Municipio
              </label>
              <input
                type="text"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                placeholder="Ej: H. Ayuntamiento de..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Aparece como "lugar" en la fecha de los documentos.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lema del año (aparece en todos los documentos)
              </label>
              <input
                type="text"
                value={lemaAnual}
                onChange={(e) => setLemaAnual(e.target.value)}
                placeholder='Ej: "2025, Año del Bicentenario..."'
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Texto institucional que aparece en el encabezado de cada documento PDF.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* SECCIÓN 2: Imágenes */}
      <Card>
        <div className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Logotipo de la Empresa</h3>
              <p className="text-sm text-gray-500 mb-4">Aparecerá en reportes y formato estándar de las vistas.</p>
              {renderFilePreview(company.logo, logoFile, 'Logo Principal', setLogoFile)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-200">
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Membrete de PDF</h3>
              <p className="text-sm text-gray-500 mb-4">Imagen para la cabecera (Header) de los documentos oficiales (solicitudes, órdenes de compra).</p>
              {renderFilePreview(company.membrete, membreteFile, 'Imagen de Membrete', setMembreteFile)}
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Pie de Página de PDF</h3>
              <p className="text-sm text-gray-500 mb-4">Imagen para el footer de los documentos oficiales.</p>
              {renderFilePreview(company.pie_pagina, piePaginaFile, 'Imagen de Pie de Página', setPiePaginaFile)}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 flex justify-end items-center bg-gray-50 p-4 rounded-lg">
            <Button onClick={handleSave} disabled={saving || !canSave}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </Card>

      {/* SECCIÓN 3: Firmantes */}
      <Card>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Firmantes de Documentos</h3>
              <p className="text-sm text-gray-500 mt-1">
                Configure los firmantes que aparecen al pie de cada tipo de documento.
              </p>
            </div>
            <Button onClick={openCreateModal}>+ Agregar Firmante</Button>
          </div>

          {firmantesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : firmantes.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No hay firmantes configurados. Agregue uno para que aparezca al pie de los documentos.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {firmantes.map((f) => (
                <div
                  key={f.id}
                  className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-primary-100 text-primary-800 rounded">
                      {f.tipo_documento_display}
                    </span>
                    <span className="text-xs text-gray-500">Orden: {f.orden}</span>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-900">
                      {f.nombre_completo_display || '(sin nombre)'}
                    </p>
                    <p className="text-xs text-gray-600">{f.cargo}</p>
                  </div>

                  {f.sello_imagen && (
                    <div className="mb-3 border border-gray-100 rounded p-2 bg-gray-50 flex justify-center">
                      <img
                        src={f.sello_imagen}
                        alt="Sello"
                        className="max-h-16 object-contain"
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => openEditModal(f)}
                      className="flex-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFirmante(f)}
                      className="flex-1 text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Modal Firmante */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={firmanteForm.id ? 'Editar Firmante' : 'Agregar Firmante'}
        size="lg"
      >
        <form onSubmit={handleSubmitFirmante} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Documento
            </label>
            <select
              value={firmanteForm.tipo_documento}
              onChange={(e) =>
                setFirmanteForm({ ...firmanteForm, tipo_documento: e.target.value })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
              required
            >
              {FIRMANTE_TIPO_CHOICES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={firmanteForm.nombre}
                onChange={(e) =>
                  setFirmanteForm({ ...firmanteForm, nombre: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Nombre completo del firmante"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
              <input
                type="text"
                value={firmanteForm.cargo}
                onChange={(e) =>
                  setFirmanteForm({ ...firmanteForm, cargo: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Ej: Tesorero(a) Municipal"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
              <input
                type="number"
                min={1}
                value={firmanteForm.orden}
                onChange={(e) =>
                  setFirmanteForm({
                    ...firmanteForm,
                    orden: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Posición de izquierda a derecha (1, 2, 3...)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sello / Firma (imagen)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setFirmanteForm({
                    ...firmanteForm,
                    sello_imagen: e.target.files?.[0] || null,
                  })
                }
                className="w-full text-sm"
                title="Imagen del sello"
              />
              {firmanteForm.current_sello_url && !firmanteForm.sello_imagen && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={firmanteForm.current_sello_url}
                    alt="Sello actual"
                    className="h-12 object-contain border rounded"
                  />
                  <span className="text-xs text-gray-500">Sello actual</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={modalSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={modalSaving}>
              {modalSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
