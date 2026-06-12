import api from './api'

// Helper para manejar respuestas paginadas o arrays directos
const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}

export interface EntregaDetalle {
  id?: number
  detalle_orden: number
  concepto?: string
  articulo?: number
  articulo_nombre?: string
  cantidad_recibida: number
  notas?: string
  condicion_buena: boolean
  observaciones_condicion?: string
}

export interface EvidenciaEntrega {
  id: number
  imagen: string
  descripcion: string
  created_at: string
}

export interface EntregaBienes {
  id: number
  numero: string
  orden: number
  orden_numero: string
  factura: number | null
  fecha_recepcion: string
  notas: string
  recibido_por: number
  recibido_por_nombre: string
  completa: boolean
  detalles: EntregaDetalle[]
  evidencias: EvidenciaEntrega[]
  created_at: string
  updated_at: string
}

export interface SalidaDetalle {
  id?: number
  articulo: number
  articulo_nombre?: string
  descripcion?: string
  cantidad: number
}

export interface SalidaBienes {
  id: number
  numero: string
  almacen: number
  almacen_nombre: string
  destino_area: number
  destino_nombre: string
  fecha: string
  referencia: string
  notas: string
  responsable: number
  responsable_nombre: string
  confirmada: boolean
  confirmada_por: number | null
  fecha_confirmacion: string | null
  detalles: SalidaDetalle[]
  created_at: string
  updated_at: string
}

export interface CreateEntregaData {
  orden: number
  factura?: number | null
  fecha_recepcion: string
  notas?: string
  completa: boolean
  detalles: {
    detalle_orden: number
    cantidad_recibida: number
    notas?: string
    condicion_buena: boolean
    observaciones_condicion?: string
  }[]
}

export interface CreateSalidaData {
  almacen: number
  destino_area: number
  fecha: string
  referencia?: string
  notas?: string
  detalles: {
    articulo: number
    descripcion?: string
    cantidad: number
  }[]
}

export interface Articulo {
  id: number
  codigo: string
  nombre: string
  descripcion: string
  unidad_medida: string
  cog: number
  cog_descripcion?: string
  costo_promedio: number
  is_active: boolean
}

export interface Stock {
  id: number
  almacen: number
  almacen_nombre?: string
  articulo: number
  articulo_nombre?: string
  articulo_codigo?: string
  cantidad: number
  cantidad_reservada: number
  updated_at: string
}

export interface AuditoriaDetalle {
  id?: number
  auditoria?: number
  articulo: number
  articulo_nombre?: string
  existencia_sistema: number
  existencia_fisica: number
  diferencia?: number
  justificacion?: string
}

export interface Auditoria {
  id: number
  numero: string
  almacen: number
  almacen_nombre?: string
  fecha_inicio: string
  fecha_cierre?: string
  estado: string
  creada_por: number
  creada_por_nombre?: string
  autorizada_por?: number
  autorizada_por_nombre?: string
  notas: string
  detalles: AuditoriaDetalle[]
}

export const inventoryService = {
  // Entregas de Bienes
  getEntregas: async (): Promise<EntregaBienes[]> => {
    const response = await api.get('/inventory/entregas/')
    return extractData(response.data)
  },

  getEntrega: async (id: number): Promise<EntregaBienes> => {
    const response = await api.get(`/inventory/entregas/${id}/`)
    return response.data
  },

  createEntrega: async (data: CreateEntregaData): Promise<EntregaBienes> => {
    const response = await api.post('/inventory/entregas/', data)
    return response.data
  },

  updateEntrega: async (id: number, data: Partial<CreateEntregaData>): Promise<EntregaBienes> => {
    const response = await api.patch(`/inventory/entregas/${id}/`, data)
    return response.data
  },

  deleteEntrega: async (id: number): Promise<void> => {
    await api.delete(`/inventory/entregas/${id}/`)
  },

  uploadEvidence: async (entregaId: number, imagen: File, descripcion?: string): Promise<EvidenciaEntrega> => {
    const formData = new FormData()
    formData.append('imagen', imagen)
    if (descripcion) formData.append('descripcion', descripcion)
    
    const response = await api.post(`/inventory/entregas/${entregaId}/upload_evidence/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  createEntregaWithEvidence: async (data: CreateEntregaData, imagenes: File[]): Promise<EntregaBienes> => {
    // Paso 1: Crear la entrega
    const response = await api.post('/inventory/entregas/', data)
    const entrega: EntregaBienes = response.data
    
    // Paso 2: Subir todas las imágenes de evidencia
    for (const imagen of imagenes) {
      const formData = new FormData()
      formData.append('imagen', imagen)
      formData.append('descripcion', 'Evidencia de recepción')
      await api.post(`/inventory/entregas/${entrega.id}/upload_evidence/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }
    
    // Paso 3: Retornar la entrega con evidencias
    const updated = await api.get(`/inventory/entregas/${entrega.id}/`)
    return updated.data
  },

  // Salidas de Bienes
  getSalidas: async (): Promise<SalidaBienes[]> => {
    const response = await api.get('/inventory/salidas/')
    return extractData(response.data)
  },

  getSalida: async (id: number): Promise<SalidaBienes> => {
    const response = await api.get(`/inventory/salidas/${id}/`)
    return response.data
  },

  createSalida: async (data: CreateSalidaData): Promise<SalidaBienes> => {
    const response = await api.post('/inventory/salidas/', data)
    return response.data
  },

  updateSalida: async (id: number, data: Partial<CreateSalidaData>): Promise<SalidaBienes> => {
    const response = await api.patch(`/inventory/salidas/${id}/`, data)
    return response.data
  },

  deleteSalida: async (id: number): Promise<void> => {
    await api.delete(`/inventory/salidas/${id}/`)
  },

  confirmSalida: async (id: number): Promise<SalidaBienes> => {
    const response = await api.post(`/inventory/salidas/${id}/confirm/`)
    return response.data
  },

  // Articulos
  getArticulos: async (): Promise<Articulo[]> => {
    const response = await api.get('/inventory/articulos/')
    return extractData(response.data)
  },

  createArticulo: async (data: Partial<Articulo>): Promise<Articulo> => {
    const response = await api.post('/inventory/articulos/', data)
    return response.data
  },

  // Stock
  getStock: async (almacenId?: number): Promise<Stock[]> => {
    const params = almacenId ? { almacen: almacenId } : {}
    const response = await api.get('/inventory/stock/', { params })
    return extractData(response.data)
  },

  // Auditorias
  getAuditorias: async (): Promise<Auditoria[]> => {
    const response = await api.get('/inventory/auditorias/')
    return extractData(response.data)
  },

  createAuditoria: async (data: Partial<Auditoria>): Promise<Auditoria> => {
    const response = await api.post('/inventory/auditorias/', data)
    return response.data
  },

  aprobarAuditoria: async (id: number): Promise<Auditoria> => {
    const response = await api.post(`/inventory/auditorias/${id}/aprobar/`)
    return response.data
  },
  
  completarEntrega: async (id: number, almacenId: number): Promise<EntregaBienes> => {
    const response = await api.post(`/inventory/entregas/${id}/completar/`, { almacen_id: almacenId })
    return response.data
  }
}
