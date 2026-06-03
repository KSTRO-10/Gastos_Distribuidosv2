import api from './api'

// Helper para manejar respuestas paginadas o arrays directos
const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}

export interface AutorizacionPresupuestal {
  id: number
  monto_autorizado: string
  partida_presupuestal: string
  fecha_aprobacion: string
  observaciones: string
  aprobado_por: number
  aprobado_por_nombre: string
  created_at: string
}

export interface SolicitudAutorizacion {
  id: number
  numero: string
  solicitud: number
  solicitud_numero: string
  cotizacion: number | null
  cotizacion_numero: string | null
  fecha_solicitud: string
  monto_solicitado: string
  justificacion: string
  estado: 'pendiente' | 'aprobada' | 'rechazada'
  solicitante: number
  solicitante_nombre: string
  autorizacion_presupuestal: AutorizacionPresupuestal | null
  created_at: string
  updated_at: string
}

export interface DetalleOrden {
  id?: number
  detalle_material?: number
  concepto: string
  descripcion?: string
  cantidad: number
  unidad: string
  precio_unitario: number
  subtotal: number
  cantidad_recibida?: number
  cantidad_pendiente?: number
}

export interface OrdenCompra {
  id: number
  numero: string
  proveedor: number
  proveedor_nombre: string
  autorizacion: number
  cotizacion: number | null
  fecha_emision: string
  fecha_entrega_esperada: string | null
  subtotal: string
  iva: string
  total: string
  condiciones_pago: string
  lugar_entrega: string
  notas: string
  estado: 'borrador' | 'enviada' | 'confirmada' | 'parcial' | 'entregada' | 'cancelada'
  estado_display: string
  referencia_externa: string
  detalles: DetalleOrden[]
  created_at: string
  updated_at: string
}

export interface CreateOrdenData {
  proveedor: number
  autorizacion?: number | null
  cotizacion?: number | null
  fecha_emision: string
  fecha_entrega_esperada?: string | null
  condiciones_pago?: string
  lugar_entrega?: string
  notas?: string
  detalles: {
    detalle_material?: number
    concepto: string
    descripcion?: string
    cantidad: number
    unidad: string
    precio_unitario: number
  }[]
}

export const orderService = {
  // Solicitudes de Autorización
  getAutorizaciones: async (): Promise<SolicitudAutorizacion[]> => {
    const response = await api.get('/orders/autorizaciones/')
    return extractData(response.data)
  },

  getAutorizacion: async (id: number): Promise<SolicitudAutorizacion> => {
    const response = await api.get(`/orders/autorizaciones/${id}/`)
    return response.data
  },

  createAutorizacion: async (data: {
    solicitud: number
    cotizacion: number
    monto_solicitado: number
    justificacion?: string
  }): Promise<SolicitudAutorizacion> => {
    const response = await api.post('/orders/autorizaciones/', data)
    return response.data
  },

  approveAutorizacion: async (id: number, data: {
    monto_autorizado?: number
    partida_presupuestal?: string
    observaciones?: string
  }): Promise<SolicitudAutorizacion> => {
    const response = await api.post(`/orders/autorizaciones/${id}/approve/`, data)
    return response.data
  },

  rejectAutorizacion: async (id: number): Promise<SolicitudAutorizacion> => {
    const response = await api.post(`/orders/autorizaciones/${id}/reject/`)
    return response.data
  },

  // Órdenes de Compra
  getOrdenes: async (): Promise<OrdenCompra[]> => {
    const response = await api.get('/orders/')
    return extractData(response.data)
  },

  getOrden: async (id: number): Promise<OrdenCompra> => {
    const response = await api.get(`/orders/${id}/`)
    return response.data
  },

  createOrden: async (data: CreateOrdenData): Promise<OrdenCompra> => {
    const response = await api.post('/orders/', data)
    return response.data
  },

  updateOrden: async (id: number, data: Partial<CreateOrdenData>): Promise<OrdenCompra> => {
    const response = await api.patch(`/orders/${id}/`, data)
    return response.data
  },

  deleteOrden: async (id: number): Promise<void> => {
    await api.delete(`/orders/${id}/`)
  },

  // Acciones de órdenes
  sendOrden: async (id: number): Promise<OrdenCompra> => {
    const response = await api.post(`/orders/${id}/send/`)
    return response.data
  },

  confirmOrden: async (id: number): Promise<OrdenCompra> => {
    const response = await api.post(`/orders/${id}/confirm/`)
    return response.data
  },

  cancelOrden: async (id: number): Promise<OrdenCompra> => {
    const response = await api.post(`/orders/${id}/cancel/`)
    return response.data
  },
}
