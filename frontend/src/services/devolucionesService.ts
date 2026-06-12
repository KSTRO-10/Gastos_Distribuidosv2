import api from './api'
import { IDevolucionInterna, ICreateDevolucionInterna } from '../types/inventory'

const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}

export const devolucionesService = {
  getDevoluciones: async (params?: Record<string, any>): Promise<IDevolucionInterna[]> => {
    const response = await api.get('/inventory/devoluciones/', { params })
    return extractData(response.data)
  },

  getDevolucion: async (id: number): Promise<IDevolucionInterna> => {
    const response = await api.get(`/inventory/devoluciones/${id}/`)
    return response.data
  },

  createDevolucion: async (data: ICreateDevolucionInterna): Promise<IDevolucionInterna> => {
    const response = await api.post('/inventory/devoluciones/', data)
    return response.data
  },

  confirmarRecepcion: async (id: number): Promise<IDevolucionInterna> => {
    const response = await api.post(`/inventory/devoluciones/${id}/confirmar/`)
    return response.data
  }
}
