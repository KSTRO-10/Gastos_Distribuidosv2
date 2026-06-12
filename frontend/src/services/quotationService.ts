import api from './api'

export interface Proveedor {
  id: number
  razon_social: string
  rfc: string
  email: string
  telefono: string
  is_active: boolean
}

export interface CotizacionDetalle {
  id?: number
  detalle_material?: number
  concepto: string
  descripcion?: string
  cantidad: number
  unidad: string
  precio_unitario: number
  subtotal: number
}

export interface Cotizacion {
  id: number
  numero: string
  solicitud: number
  solicitud_numero: string
  proveedor: number
  proveedor_nombre: string
  fecha: string
  vigencia: string | null
  subtotal: string
  iva: string
  total: string
  tiempo_entrega: string
  condiciones_pago: string
  notas: string
  estado: string
  estado_display: string
  documento: string | null
  detalles: CotizacionDetalle[]
  tiene_orden?: boolean
  created_at: string
  updated_at: string
}

export interface CreateCotizacionData {
  solicitud: number
  proveedor: number
  fecha: string
  vigencia?: string | null
  tiempo_entrega?: string
  condiciones_pago?: string
  notas?: string
  detalles: {
    detalle_material?: number
    concepto: string
    descripcion?: string
    cantidad: number
    unidad: string
    precio_unitario: number
    subtotal?: number
  }[]
}

export interface ComparativaCelda {
  precio_unitario: string | null
  subtotal: string | null
  concepto: string | null
  tiene_precio: boolean
}

export interface ComparativaItem {
  id: number
  concepto: string
  cantidad: string
  unidad: string
  cog_codigo: string
  precio_estimado: string
}

export interface ComparativaProveedor {
  id: number
  nombre: string
  cotizacion_id: number
  cotizacion_numero: string
  estado: string
  total: string
}

export interface ComparativaData {
  solicitud: {
    id: number
    numero: string
    descripcion: string
  }
  items: ComparativaItem[]
  proveedores: ComparativaProveedor[]
  comparativa: ComparativaCelda[][]
  mejores_precios: (number | null)[]
}

// Helper para manejar respuestas paginadas o arrays directos
const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}

export const quotationService = {
  // Cotizaciones
  getCotizaciones: async (solicitudId?: number): Promise<Cotizacion[]> => {
    const params = solicitudId ? { solicitud: solicitudId } : {}
    const response = await api.get('/quotations/cotizaciones/', { params })
    return extractData(response.data)
  },

  getCotizacion: async (id: number): Promise<Cotizacion> => {
    const response = await api.get(`/quotations/cotizaciones/${id}/`)
    return response.data
  },

  createCotizacion: async (data: CreateCotizacionData): Promise<Cotizacion> => {
    const response = await api.post('/quotations/cotizaciones/', data)
    return response.data
  },

  updateCotizacion: async (id: number, data: Partial<CreateCotizacionData>): Promise<Cotizacion> => {
    const response = await api.patch(`/quotations/cotizaciones/${id}/`, data)
    return response.data
  },

  deleteCotizacion: async (id: number): Promise<void> => {
    await api.delete(`/quotations/cotizaciones/${id}/`)
  },

  // Seleccionar cotización como ganadora
  selectCotizacion: async (id: number): Promise<Cotizacion> => {
    const response = await api.post(`/quotations/cotizaciones/${id}/select/`)
    return response.data
  },

  // Generar orden de compra desde cotización
  createOrder: async (id: number, data?: { fecha_entrega_esperada?: string, condiciones_pago?: string, notas?: string }) => {
    const response = await api.post(`/quotations/cotizaciones/${id}/create_order/`, data || {})
    return response.data
  },

  // Proveedores
  getProveedores: async (): Promise<Proveedor[]> => {
    const response = await api.get('/companies/proveedores/')
    return extractData(response.data)
  },

  getProveedor: async (id: number): Promise<Proveedor> => {
    const response = await api.get(`/companies/proveedores/${id}/`)
    return response.data
  },

  // Comparativa de cotizaciones por solicitud
  getComparativa: async (solicitudId: number): Promise<ComparativaData> => {
    const response = await api.get(`/quotations/cotizaciones/comparar/${solicitudId}/`)
    return response.data
  },
}
