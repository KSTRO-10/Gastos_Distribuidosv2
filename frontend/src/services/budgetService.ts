import api from './api'

// Helper para manejar respuestas paginadas o arrays directos
const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}

export interface ItemClavePres {
  id: number
  cog: string
  descripcion: string
  unidad_ejecutora: string
  tipo_gasto: string
  programa_presupuestario: string
  accion: string
  fuente_financiamiento?: string
  entidad_federativa?: string
  created_at: string
}

export interface Plantilla {
  id: number
  nombre: string
  ejercicio_fiscal: number
  entidad_federativa: string
  clasificador_administrativo: string
  no_municipio_ramo: string
  unidad_administrativa: string
  items: ItemClavePres[]
  items_count: number
  created_at: string
  updated_at: string
}

export interface PlantillaCreateData {
  nombre: string
  ejercicio_fiscal: number
  entidad_federativa: string
  clasificador_administrativo: string
  no_municipio_ramo: string
  unidad_administrativa: string
}

export const descargarPlantilla = async (): Promise<void> => {
  const response = await api.get('/budget/plantillas/descargar-plantilla/', {
    responseType: 'blob'
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'PLANTILLA_CLAVES_PRESUPUESTARIAS.xlsx')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export const budgetService = {
  getPlantillas: async (): Promise<Plantilla[]> => {
    const response = await api.get('/budget/plantillas/')
    return extractData(response.data)
  },

  getPlantilla: async (id: number): Promise<Plantilla> => {
    const response = await api.get(`/budget/plantillas/${id}/`)
    return response.data
  },

  createPlantilla: async (data: PlantillaCreateData): Promise<Plantilla> => {
    const response = await api.post('/budget/plantillas/', data)
    return response.data
  },

  updatePlantilla: async (id: number, data: Partial<PlantillaCreateData>): Promise<Plantilla> => {
    const response = await api.put(`/budget/plantillas/${id}/`, data)
    return response.data
  },

  deletePlantilla: async (id: number): Promise<void> => {
    await api.delete(`/budget/plantillas/${id}/`)
  },

  importExcel: async (id: number, file: File): Promise<{ message: string; items_created: number }> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post(`/budget/plantillas/${id}/import-excel/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
}
