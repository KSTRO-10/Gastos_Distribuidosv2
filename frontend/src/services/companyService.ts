import api from './api'

export interface Company {
  id: number
  rfc: string
  razon_social: string
  nombre_comercial: string
  calle: string
  numero_exterior: string
  numero_interior: string
  colonia: string
  municipio: string
  estado: string
  codigo_postal: string
  direccion_completa: string
  telefono: string
  email: string
  logo: string | null
  membrete: string | null
  pie_pagina: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}

export const companyService = {
  getCompanies: async (): Promise<Company[]> => {
    const response = await api.get('/companies/empresas/')
    return extractData(response.data)
  },

  getCompany: async (id: number): Promise<Company> => {
    const response = await api.get(`/companies/empresas/${id}/`)
    return response.data
  },

  updateCompany: async (id: number, data: Partial<Company> | FormData): Promise<Company> => {
    // Determine content type based on data type
    const isFormData = data instanceof FormData
    const response = await api.patch(`/companies/empresas/${id}/`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    })
    return response.data
  },
}

export interface Firmante {
  id: number
  company: number
  tipo_documento: string
  tipo_documento_display: string
  cargo: string
  nombre: string
  user: number | null
  usuario_nombre: string
  nombre_completo_display: string
  sello_imagen: string | null
  orden: number
  created_at: string
  updated_at: string
}

export const FIRMANTE_TIPO_CHOICES: Array<{ value: string; label: string }> = [
  { value: 'solicitud', label: 'Solicitud de Materiales' },
  { value: 'cotizacion', label: 'Cotización' },
  { value: 'solicitud_autorizacion', label: 'Solicitud de Autorización' },
  { value: 'autorizacion', label: 'Autorización Presupuestal' },
  { value: 'orden_compra', label: 'Orden de Compra' },
  { value: 'entrega', label: 'Entrega/Recepción' },
  { value: 'salida', label: 'Salida de Almacén' },
  { value: 'solicitud_gasto', label: 'Solicitud del Gasto' },
  { value: 'solicitud_pago', label: 'Solicitud de Pago' },
  { value: 'distribucion_gasto', label: 'Distribución del Gasto' },
]

export const firmanteService = {
  list: async (companyId?: number): Promise<Firmante[]> => {
    const params = companyId ? { company: companyId } : {}
    const response = await api.get('/companies/firmantes/', { params })
    return extractData(response.data)
  },
  create: async (data: FormData): Promise<Firmante> => {
    const response = await api.post('/companies/firmantes/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  update: async (id: number, data: FormData): Promise<Firmante> => {
    const response = await api.patch(`/companies/firmantes/${id}/`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  remove: async (id: number): Promise<void> => {
    await api.delete(`/companies/firmantes/${id}/`)
  },
}
