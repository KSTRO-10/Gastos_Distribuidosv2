import api from './api'
import type { User } from '@/stores/authStore'

export interface CreateUserData {
  email: string
  username: string
  full_name: string
  phone?: string
  role: number
  area?: number
  puesto?: string
  password: string
  password_confirm: string
  ine_documento?: File | null
}

export interface UpdateUserData {
  full_name?: string
  phone?: string
  area?: number
  puesto?: string
  ine_documento?: File | null
  avatar?: File | null
  settings?: Record<string, unknown>
}

export interface Role {
  id: number
  name: string
  description: string
  permissions: string[]
  is_active: boolean
}

// Helper para manejar respuestas paginadas o arrays directos
const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}

export const userService = {
  getUsers: async (): Promise<User[]> => {
    // Usamos page_size grande para obtener todos los usuarios (evitar paginación)
    const response = await api.get('/auth/users/', { params: { page_size: 1000 } })
    return extractData(response.data)
  },

  getUser: async (id: number): Promise<User> => {
    const response = await api.get(`/auth/users/${id}/`)
    return response.data
  },

  createUser: async (data: CreateUserData): Promise<User> => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'ine_documento') {
        formData.append(key, String(value))
      }
    })
    if (data.ine_documento) {
      formData.append('ine_documento', data.ine_documento)
    }
    const response = await api.post('/auth/users/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  updateUser: async (id: number, data: UpdateUserData): Promise<User> => {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'ine_documento' && key !== 'avatar' && key !== 'settings') {
        formData.append(key, String(value))
      }
    })
    if (data.ine_documento) formData.append('ine_documento', data.ine_documento)
    if (data.avatar) formData.append('avatar', data.avatar)
    if (data.settings) formData.append('settings', JSON.stringify(data.settings))
    
    const response = await api.patch(`/auth/users/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  deleteUser: async (id: number): Promise<{ detail?: string } | void> => {
    const response = await api.delete(`/auth/users/${id}/`)
    return response.data
  },

  toggleUserStatus: async (id: number): Promise<User> => {
    const response = await api.post(`/auth/users/${id}/toggle_active/`)
    return response.data
  },

  getRoles: async (): Promise<Role[]> => {
    const response = await api.get('/auth/roles/')
    return extractData(response.data)
  },

  /** Actualizar perfil del usuario autenticado (soporta avatar como File con FormData) */
  updateMyProfile: async (data: UpdateUserData): Promise<User> => {
    const formData = new FormData()
    if (data.full_name !== undefined) formData.append('full_name', data.full_name)
    if (data.phone !== undefined) formData.append('phone', data.phone)
    if (data.area !== undefined && data.area !== null) formData.append('area', String(data.area))
    if (data.puesto !== undefined) formData.append('puesto', data.puesto)
    if (data.ine_documento !== undefined && data.ine_documento !== null) formData.append('ine_documento', data.ine_documento)
    if (data.avatar !== undefined && data.avatar !== null) formData.append('avatar', data.avatar)
    if (data.settings !== undefined) formData.append('settings', JSON.stringify(data.settings))

    const response = await api.put('/auth/users/update_me/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  /** Obtener perfil del usuario autenticado */
  getMyProfile: async (): Promise<User> => {
    const response = await api.get('/auth/users/me/')
    return response.data
  },

  /** Cambiar contraseña del usuario autenticado */
  changePassword: async (data: { old_password: string; new_password: string; new_password_confirm: string }): Promise<{ message: string }> => {
    const response = await api.post('/auth/users/change_password/', data)
    return response.data
  },

  /** Subir o actualizar documento INE del usuario autenticado */
  uploadIne: async (ineDocumento: File): Promise<User> => {
    const formData = new FormData()
    formData.append('ine_documento', ineDocumento)
    const response = await api.post('/auth/users/upload_ine/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  deleteIne: async (): Promise<User> => {
    const response = await api.delete('/auth/users/delete_ine/')
    return response.data
  },

  approveIne: async (id: number): Promise<{ status: string }> => {
    const response = await api.post(`/auth/users/${id}/approve_ine/`)
    return response.data
  },

  rejectIne: async (id: number, motivo: string): Promise<{ status: string, motivo: string }> => {
    const response = await api.post(`/auth/users/${id}/reject_ine/`, { motivo })
    return response.data
  },
}
