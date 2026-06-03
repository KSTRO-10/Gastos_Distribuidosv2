import api from './api'

// Interfaces para el Portal del Proveedor - Fase 9

export interface InfoProveedor {
  id: number
  razon_social: string
  nombre_comercial: string
  rfc: string
  email: string
  telefono: string
  estado_cuenta: 'pendiente' | 'activo' | 'suspendido'
}

export interface EstadisticasProveedor {
  cotizaciones_pendientes: number
  cotizaciones_recibidas: number
  cotizaciones_seleccionadas: number
  ordenes_nuevas: number
  ordenes_confirmadas: number
  ordenes_parciales: number
  ordenes_entregadas: number
  facturas_pendientes: number
  facturas_procesadas: number
  total_facturado_mes: number
  total_facturado_historico: number
}

export interface OrdenReciente {
  id: number
  numero: string
  fecha_emision: string
  fecha_entrega: string
  total: number
  estado: string
  estado_display: string
}

export interface SolicitudAbierta {
  id: number
  numero: string
  descripcion: string
  area: string
  fecha: string
  total_estimado: number
}

export interface ProveedorDashboardData {
  info_proveedor: InfoProveedor
  estadisticas: EstadisticasProveedor
  ordenes_recientes: OrdenReciente[]
  solicitudes_abiertas: SolicitudAbierta[]
}

export interface DetalleSolicitudCotizar {
  id: number
  concepto: string
  descripcion: string
  cantidad: number
  unidad: string
  precio_estimado: number
}

export interface SolicitudParaCotizar {
  id: number
  numero: string
  descripcion: string
  area: string
  fecha_solicitud: string
  fecha_requerida: string
  total_estimado: number
  detalles: DetalleSolicitudCotizar[]
}

export const proveedorPortalService = {
  /**
   * Obtiene el dashboard exclusivo del proveedor
   */
  getDashboard: async (): Promise<ProveedorDashboardData> => {
    const response = await api.get('/reports/proveedor/dashboard/')
    return response.data
  },

  /**
   * Obtiene las solicitudes abiertas para cotizar
   */
  getSolicitudesParaCotizar: async (): Promise<SolicitudParaCotizar[]> => {
    const response = await api.get('/reports/proveedor/solicitudes-para-cotizar/')
    return response.data
  },

  /**
   * Obtiene las cotizaciones del proveedor (usa el servicio existente con filtrado automático)
   */
  getMisCotizaciones: async () => {
    const response = await api.get('/quotations/cotizaciones/')
    // El backend ya filtra por proveedor automáticamente
    if (Array.isArray(response.data)) return response.data
    if (response.data?.results) return response.data.results
    return []
  },

  /**
   * Obtiene las órdenes asignadas al proveedor
   */
  getMisOrdenes: async () => {
    const response = await api.get('/orders/')
    // El backend ya filtra por proveedor automáticamente
    if (Array.isArray(response.data)) return response.data
    if (response.data?.results) return response.data.results
    return []
  },

  /**
   * Confirma una orden de compra
   */
  confirmarOrden: async (ordenId: number, referenciaExterna?: string) => {
    const response = await api.post(`/orders/${ordenId}/confirm/`, {
      referencia_externa: referenciaExterna || ''
    })
    return response.data
  },

  /**
   * Obtiene las facturas del proveedor
   */
  getMisFacturas: async () => {
    const response = await api.get('/invoices/')
    // El backend ya filtra por proveedor automáticamente
    if (Array.isArray(response.data)) return response.data
    if (response.data?.results) return response.data.results
    return []
  },

  /**
   * Sube una factura para una orden
   */
  subirFactura: async (ordenId: number, formData: FormData) => {
    formData.append('orden', ordenId.toString())
    const response = await api.post('/invoices/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  /**
   * Actualiza el perfil del proveedor autenticado (nombre comercial, contacto, logo)
   */
  updateMiPerfil: async (proveedorId: number, data: Record<string, unknown>) => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value instanceof File ? value : String(value))
      }
    })
    const response = await api.patch(`/companies/proveedores/${proveedorId}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}
