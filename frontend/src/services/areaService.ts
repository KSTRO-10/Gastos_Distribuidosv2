import api from './api'

export interface Area {
  id: number
  nombre: string
  codigo: string
  descripcion: string
  responsable: number | null
  responsable_nombre?: string
  presupuesto_anual: string
  presupuesto_disponible: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateAreaData {
  company: number
  name: string
  code: string
  description?: string
  manager?: number
  presupuesto_anual?: string
}

export interface UpdateAreaData {
  company?: number
  name?: string
  code?: string
  description?: string
  manager?: number
  presupuesto_anual?: string
  is_active?: boolean
}

// Helper para manejar respuestas paginadas o arrays directos
const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}

// Backend devuelve 'name' pero frontend usa 'nombre', mapear campos
interface ApiArea {
  id: number
  name: string
  code: string
  description: string
  manager: number | null
  manager_name?: string
  presupuesto_anual: string
  is_active: boolean
  created_at: string
  updated_at: string
}

const mapAreaFromApi = (apiArea: ApiArea): Area => ({
  id: apiArea.id,
  nombre: apiArea.name,
  codigo: apiArea.code,
  descripcion: apiArea.description,
  responsable: apiArea.manager,
  responsable_nombre: apiArea.manager_name,
  presupuesto_anual: apiArea.presupuesto_anual,
  presupuesto_disponible: apiArea.presupuesto_anual, // Placeholder
  is_active: apiArea.is_active,
  created_at: apiArea.created_at,
  updated_at: apiArea.updated_at,
})

export const areaService = {
  getAreas: async (): Promise<Area[]> => {
    const response = await api.get('/areas/')
    const apiAreas: ApiArea[] = extractData(response.data)
    return apiAreas.map(mapAreaFromApi)
  },

  getArea: async (id: number): Promise<Area> => {
    const response = await api.get(`/areas/${id}/`)
    return response.data
  },

  createArea: async (data: CreateAreaData): Promise<Area> => {
    const response = await api.post('/areas/', data)
    return response.data
  },

  updateArea: async (id: number, data: UpdateAreaData): Promise<Area> => {
    const response = await api.patch(`/areas/${id}/`, data)
    return response.data
  },

  deleteArea: async (id: number): Promise<void> => {
    await api.delete(`/areas/${id}/`)
  },
}
