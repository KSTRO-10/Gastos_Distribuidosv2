import api from './api'

export interface ProductoProveedor {
  id: number
  proveedor: number
  proveedor_nombre: string
  cog: number
  cog_codigo: string
  cog_descripcion: string
  nombre: string
  descripcion: string
  unidad: string
  precio_unitario: string
  marca: string
  modelo: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateProductoData {
  cog: number
  nombre: string
  descripcion?: string
  unidad: string
  precio_unitario: number
  marca?: string
  modelo?: string
  is_active?: boolean
}

export interface CsvUploadResult {
  creados: number
  actualizados: number
  errores: string[]
  total_procesados: number
}

// Helper para manejar respuestas paginadas o arrays directos
const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}

export const catalogoProveedorService = {
  getProductos: async (params?: { proveedor?: number; search?: string; cog?: number; active_only?: string }): Promise<ProductoProveedor[]> => {
    const response = await api.get('/companies/catalogo-productos/', { params })
    return extractData(response.data)
  },

  getProducto: async (id: number): Promise<ProductoProveedor> => {
    const response = await api.get(`/companies/catalogo-productos/${id}/`)
    return response.data
  },

  createProducto: async (data: CreateProductoData): Promise<ProductoProveedor> => {
    const response = await api.post('/companies/catalogo-productos/', data)
    return response.data
  },

  updateProducto: async (id: number, data: Partial<CreateProductoData>): Promise<ProductoProveedor> => {
    const response = await api.patch(`/companies/catalogo-productos/${id}/`, data)
    return response.data
  },

  deleteProducto: async (id: number): Promise<void> => {
    await api.delete(`/companies/catalogo-productos/${id}/`)
  },

  uploadCsv: async (file: File): Promise<CsvUploadResult> => {
    const formData = new FormData()
    formData.append('archivo', file)
    const response = await api.post('/companies/catalogo-productos/upload_csv/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}
