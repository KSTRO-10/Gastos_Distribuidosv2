import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { facturaService } from '../../services/facturaService'
import { proveedorService, Proveedor } from '../../services/proveedorService'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'

export default function FacturaUploadPage() {
  const navigate = useNavigate()
  const xmlInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [proveedores, setProveedores] = useState<Proveedor[]>([])

  const [proveedor, setProveedor] = useState<string>('')
  const [xmlFile, setXmlFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  useEffect(() => {
    loadProveedores()
  }, [])

  const loadProveedores = async () => {
    try {
      const data = await proveedorService.getProveedores()
      setProveedores(data)
    } catch (err) {
      console.error('Error al cargar proveedores:', err)
    }
  }

  const handleXmlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.toLowerCase().endsWith('.xml')) {
        setError('El archivo debe ser un XML')
        return
      }
      setXmlFile(file)
      setError('')
    }
  }

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('El archivo debe ser un PDF')
        return
      }
      setPdfFile(file)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!xmlFile) {
      setError('Seleccione un archivo XML')
      return
    }

    try {
      setLoading(true)
      setError('')

      const result = await facturaService.uploadFactura({
        proveedor: proveedor ? Number(proveedor) : undefined,
        xml_file: xmlFile,
        pdf_file: pdfFile || undefined
      })

      setSuccess(result.message)

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/facturas')
      }, 2000)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string; error?: string } } }
      setError(error.response?.data?.detail || error.response?.data?.error || 'Error al subir la factura')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Subir Factura CFDI</h1>
        <Button variant="secondary" onClick={() => navigate('/facturas')}>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Información de la Factura</h2>

          <div className="space-y-4">
            <Select
              label="Proveedor (Opcional)"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              placeholder="Auto-detectar del XML"
              options={proveedores.map(p => ({
                value: p.id,
                label: `${p.razon_social} (${p.rfc})`
              }))}
            />
            <p className="text-xs text-gray-500 -mt-2">
              Si no seleccionas un proveedor, se detectará automáticamente del RFC del XML.
            </p>

            {/* XML Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo XML (CFDI) *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  ref={xmlInputRef}
                  accept=".xml"
                  onChange={handleXmlChange}
                  className="hidden"
                  title="Seleccionar archivo XML"
                />
                {xmlFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="font-medium">{xmlFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setXmlFile(null)
                        if (xmlInputRef.current) xmlInputRef.current.value = ''
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => xmlInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Seleccionar archivo XML
                  </button>
                )}
              </div>
            </div>

            {/* PDF Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Archivo PDF (Opcional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  ref={pdfInputRef}
                  accept=".pdf"
                  onChange={handlePdfChange}
                  className="hidden"
                  title="Seleccionar archivo PDF"
                />
                {pdfFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="font-medium">{pdfFile.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPdfFile(null)
                        if (pdfInputRef.current) pdfInputRef.current.value = ''
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Seleccionar archivo PDF
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">Información</h3>
          <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
            <li>El archivo XML debe ser un CFDI 4.0 válido</li>
            <li>El sistema extraerá automáticamente la información del XML</li>
            <li>El proveedor se detectará automáticamente del RFC del emisor</li>
            <li>Si el proveedor no existe, se creará automáticamente</li>
          </ul>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            variant="secondary"
            type="button"
            onClick={() => navigate('/facturas')}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Subir Factura
          </Button>
        </div>
      </form>
    </div>
  )
}
