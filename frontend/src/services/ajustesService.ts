import api from './api'
import { IAjusteInventario, ICreateAjusteInventario } from '../types/inventory'

const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}

export const ajustesService = {
  getAjustes: async (params?: Record<string, any>): Promise<IAjusteInventario[]> => {
    const response = await api.get('/inventory/ajustes/', { params })
    return extractData(response.data)
  },

  getAjuste: async (id: number): Promise<IAjusteInventario> => {
    const response = await api.get(`/inventory/ajustes/${id}/`)
    return response.data
  },

  createAjuste: async (data: ICreateAjusteInventario): Promise<IAjusteInventario> => {
    const response = await api.post('/inventory/ajustes/', data)
    return response.data
  },

  uploadEvidencia: async (ajusteId: number, imagen: File): Promise<{ status: string }> => {
    const formData = new FormData()
    formData.append('evidencia', imagen)
    
    const response = await api.post(`/inventory/ajustes/${ajusteId}/upload_evidence/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  aprobarAjuste: async (id: number): Promise<IAjusteInventario> => {
    const response = await api.post(`/inventory/ajustes/${id}/aprobar/`)
    return response.data
  }
}
