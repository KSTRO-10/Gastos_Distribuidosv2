import api from './api'

export interface Proveedor {
  id: number
  razon_social: string
  nombre_comercial?: string
  rfc: string
  curp?: string
  email: string
  telefono: string
  telefono_secundario?: string
  direccion?: string
  codigo_postal?: string
  ciudad?: string
  estado?: string
  pais?: string
  contacto_nombre?: string
  contacto_email?: string
  contacto_telefono?: string
  giro?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateProveedorData {
  razon_social: string
  nombre_comercial?: string
  rfc: string
  contacto_email: string
  contacto_telefono?: string
  contacto_nombre?: string
  direccion?: string
}

// Helper para manejar respuestas paginadas o arrays directos
const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}

export const proveedorService = {
  getProveedores: async (): Promise<Proveedor[]> => {
    const response = await api.get('/companies/proveedores/')
    return extractData(response.data)
  },

  getProveedor: async (id: number): Promise<Proveedor> => {
    const response = await api.get(`/companies/proveedores/${id}/`)
    return response.data
  },

  createProveedor: async (data: CreateProveedorData): Promise<Proveedor> => {
    const response = await api.post('/companies/proveedores/', data)
    return response.data
  },

  updateProveedor: async (id: number, data: Partial<CreateProveedorData>): Promise<Proveedor> => {
    const response = await api.patch(`/companies/proveedores/${id}/`, data)
    return response.data
  },

  deleteProveedor: async (id: number): Promise<void> => {
    await api.delete(`/companies/proveedores/${id}/`)
  },

  toggleActive: async (id: number, isActive: boolean): Promise<Proveedor> => {
    const response = await api.patch(`/companies/proveedores/${id}/`, { is_active: isActive })
    return response.data
  },

  /** Actualizar proveedor con logo (usa FormData para multipart) */
  updateProveedorWithLogo: async (id: number, data: Partial<CreateProveedorData> & { logo?: File }): Promise<Proveedor> => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value instanceof File ? value : String(value))
      }
    })
    const response = await api.patch(`/companies/proveedores/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}
