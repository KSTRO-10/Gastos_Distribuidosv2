import api from './api'

// Helper para manejar respuestas paginadas o arrays directos
const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}

export interface FacturaDetalle {
  id: number
  clave_prod_serv: string
  no_identificacion: string
  cantidad: number
  clave_unidad: string
  unidad: string
  descripcion: string
  valor_unitario: number
  importe: number
  descuento: number
  objeto_imp: string
  impuestos: Record<string, unknown>
}

export interface DistribucionGasto {
  id: number
  concepto: number
  concepto_descripcion: string
  area: number
  area_nombre: string
  solicitud: number | null
  monto: number
  porcentaje: number
  notas: string
  created_at: string
}

export interface SolicitudGastoSummary {
  id: number
  numero: string
  solicitud_pago_id: number | null
}

export interface Factura {
  id: number
  proveedor: number
  proveedor_nombre: string
  xml_file: string
  pdf_file: string | null
  uuid_cfdi: string
  folio: string
  serie: string
  fecha: string | null
  rfc_emisor: string
  nombre_emisor: string
  rfc_receptor: string
  nombre_receptor: string
  subtotal: number
  descuento: number
  iva: number
  isr: number
  iva_retenido: number
  total: number
  forma_pago: string
  metodo_pago: string
  moneda: string
  tipo_cambio: number
  tipo_comprobante: string
  uso_cfdi: string
  status: 'pendiente' | 'procesando' | 'procesada' | 'error' | 'distribuida'
  status_display: string
  error_message: string
  is_quick_flow: boolean
  conceptos: FacturaDetalle[]
  distribuciones: DistribucionGasto[]
  solicitudes_gasto: SolicitudGastoSummary[]
  created_at: string
  updated_at: string
}

export interface UploadFacturaData {
  proveedor?: number  // Optional - will be auto-detected from XML if not provided
  xml_file: File
  pdf_file?: File
}

export interface DistribucionData {
  concepto_id: number
  area_id: number
  monto: number
  porcentaje?: number
  notas?: string
  solicitud_id?: number
}

export interface BudgetWarning {
  area_nombre: string
  presupuesto_mensual: number
  ya_gastado: number
  nuevo_monto: number
  exceso: number
}

export interface DistributeResponse {
  message?: string
  needs_confirmation?: boolean
  warnings?: BudgetWarning[]
}

export const facturaService = {
  getFacturas: async (filters?: { status?: string; proveedor?: number }): Promise<Factura[]> => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.proveedor) params.append('proveedor', String(filters.proveedor))

    const response = await api.get(`/invoices/?${params.toString()}`)
    return extractData(response.data)
  },

  getFactura: async (id: number): Promise<Factura> => {
    const response = await api.get(`/invoices/${id}/`)
    return response.data
  },

  uploadFactura: async (data: UploadFacturaData): Promise<{ id: number; message: string; status: string }> => {
    const formData = new FormData()
    if (data.proveedor) {
      formData.append('proveedor', String(data.proveedor))
    }
    formData.append('xml_file', data.xml_file)
    if (data.pdf_file) formData.append('pdf_file', data.pdf_file)

    const response = await api.post('/invoices/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  deleteFactura: async (id: number): Promise<void> => {
    await api.delete(`/invoices/${id}/`)
  },

  getParsedData: async (id: number): Promise<Record<string, unknown>> => {
    const response = await api.get(`/invoices/${id}/parsed/`)
    return response.data
  },

  distributeFactura: async (id: number, distributions: DistribucionData[], force = false): Promise<DistributeResponse> => {
    const response = await api.post(`/invoices/${id}/distribute/`, { distributions, force })
    return response.data
  },

  reprocessFactura: async (id: number): Promise<{ message: string }> => {
    const response = await api.post(`/invoices/${id}/reprocess/`)
    return response.data
  },

  /**
   * Quick flow: Upload XML + process synchronously in one step.
   * Returns the fully parsed factura with conceptos ready for distribution.
   */
  uploadAndProcess: async (xmlFile: File, pdfFile?: File): Promise<{ message: string; factura: Factura }> => {
    const formData = new FormData()
    formData.append('xml_file', xmlFile)
    if (pdfFile) formData.append('pdf_file', pdfFile)

    const response = await api.post('/invoices/upload-and-process/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  // Detalles de factura
  getDetalles: async (facturaId: number): Promise<FacturaDetalle[]> => {
    const response = await api.get(`/invoices/detalles/?factura=${facturaId}`)
    return extractData(response.data)
  }
}
