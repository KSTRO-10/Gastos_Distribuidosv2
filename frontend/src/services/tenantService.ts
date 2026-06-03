import api from './api'

export interface TenantSettings {
  lema_anual?: string
  [key: string]: unknown
}

export interface Tenant {
  id: number
  schema_name: string
  name: string
  rfc: string
  settings: TenantSettings
  is_active: boolean
  created_at: string
  updated_at: string
}

export const tenantService = {
  getCurrent: async (): Promise<Tenant> => {
    const response = await api.get('/tenants/current/')
    return response.data
  },
  updateSettings: async (settings: TenantSettings): Promise<Tenant> => {
    const response = await api.patch('/tenants/current/', { settings })
    return response.data
  },
}
