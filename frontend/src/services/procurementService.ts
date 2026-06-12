import api from './api'

// COG (Clasificador por Objeto del Gasto)
export interface Cog {
  id: number
  codigo: string
  descripcion: string
  capitulo: string
  concepto: string
  partida_generica: string
  partida_especifica: string
  palabras_clave: string
  is_active: boolean
}

// Detalle de material (línea de solicitud)
export interface DetalleMaterial {
  id?: number
  concepto: string
  descripcion: string
  cantidad: number
  unidad: string
  cog: number
  cog_codigo?: string
  cog_descripcion?: string
  precio_estimado: number
  subtotal_estimado?: number
  notas: string
}

// Solicitud de material
export interface SolicitudMaterial {
  id: number
  numero: string
  area: number
  area_name: string
  area_nombre?: string
  fecha_solicitud: string
  descripcion: string
  justificacion: string
  estado: string
  estado_display: string
  total_estimado: string
  urgente: boolean
  fecha_requerida: string | null
  eje_rector?: string | null
  programa_presupuestario?: string | null
  actividad?: string | null
  created_by: number
  created_by_name: string
  detalles: DetalleMaterial[]
  ine_foto?: string | null
  ine_documento?: string | null
  ine_rechazo_motivo?: string | null
  materiales?: {
    descripcion: string
    unidad_medida: string
    cantidad: number
  }[]
  created_at: string
  updated_at: string
}

// Alias for backwards compatibility
export type Solicitud = SolicitudMaterial

export interface CreateSolicitudData {
  area: number
  fecha_solicitud: string
  descripcion: string
  justificacion: string
  urgente: boolean
  fecha_requerida?: string | null
  eje_rector?: string | null
  programa_presupuestario?: string | null
  actividad?: string | null
  detalles: Omit<DetalleMaterial, 'id' | 'cog_codigo' | 'cog_descripcion' | 'subtotal_estimado'>[]
}

export interface UpdateSolicitudData extends Partial<CreateSolicitudData> {}

// Helper para manejar respuestas paginadas o arrays directos
const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}

export const procurementService = {
  // Solicitudes
  getSolicitudes: async (estado?: string): Promise<SolicitudMaterial[]> => {
    const params = estado && estado !== 'todos' ? { estado } : {}
    const response = await api.get('/procurement/solicitudes/', { params })
    return extractData(response.data)
  },

  getSolicitud: async (id: number): Promise<SolicitudMaterial> => {
    const response = await api.get(`/procurement/solicitudes/${id}/`)
    return response.data
  },

  createSolicitud: async (data: CreateSolicitudData, ineFoto?: File): Promise<SolicitudMaterial> => {
    if (ineFoto) {
      const formData = new FormData()
      formData.append('data', JSON.stringify(data))
      formData.append('ine_documento', ineFoto)
      const response = await api.post('/procurement/solicitudes/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return response.data
    }
    const response = await api.post('/procurement/solicitudes/', data)
    return response.data
  },

  updateSolicitud: async (id: number, data: UpdateSolicitudData): Promise<SolicitudMaterial> => {
    const response = await api.patch(`/procurement/solicitudes/${id}/`, data)
    return response.data
  },

  deleteSolicitud: async (id: number): Promise<void> => {
    await api.delete(`/procurement/solicitudes/${id}/`)
  },

  // Cambiar estado de solicitud
  enviarSolicitud: async (id: number): Promise<SolicitudMaterial> => {
    const response = await api.post(`/procurement/solicitudes/${id}/submit/`)
    return response.data
  },

  cancelarSolicitud: async (id: number): Promise<SolicitudMaterial> => {
    const response = await api.post(`/procurement/solicitudes/${id}/cancel/`)
    return response.data
  },

  enviarACotizacion: async (id: number): Promise<SolicitudMaterial> => {
    const response = await api.post(`/procurement/solicitudes/${id}/send_to_quotation/`)
    return response.data
  },

  buscarCotizacionesCatalogo: async (id: number): Promise<{
    cotizaciones_creadas: number
    cotizaciones_ids: number[]
    proveedores_parciales: { proveedor_id: number; proveedor_nombre: string; items_cubiertos: number; items_total: number }[]
    sin_cobertura: boolean
  }> => {
    const response = await api.post(`/procurement/solicitudes/${id}/buscar_cotizaciones_catalogo/`)
    return response.data
  },

  // INE verification
  verificarIne: async (id: number, aprobado: boolean, motivo?: string): Promise<SolicitudMaterial> => {
    const response = await api.post(`/procurement/solicitudes/${id}/verificar_ine/`, { aprobado, motivo })
    return response.data
  },

  resubirIne: async (id: number, ineFoto: File): Promise<SolicitudMaterial> => {
    const formData = new FormData()
    formData.append('ine_documento', ineFoto)
    const response = await api.post(`/procurement/solicitudes/${id}/resubir_ine/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  // COG
  getCogs: async (): Promise<Cog[]> => {
    const response = await api.get('/procurement/cog/')
    return extractData(response.data)
  },

  getCog: async (id: number): Promise<Cog> => {
    const response = await api.get(`/procurement/cog/${id}/`)
    return response.data
  },

  searchCogs: async (search: string): Promise<Cog[]> => {
    const response = await api.get('/procurement/cog/', { params: { search } })
    return extractData(response.data)
  },
}
