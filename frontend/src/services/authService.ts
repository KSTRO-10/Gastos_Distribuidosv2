import api from './api'

export interface LoginCredentials {
  email: string
  password: string
}

export interface User {
  id: number
  email: string
  full_name: string
  role: string
  role_display: string
  permissions: string[]
  avatar?: string | null
  phone?: string
}

export interface LoginResponse {
  access: string
  refresh: string
  user: User
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/token/', credentials)
    return response.data
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout/', { refresh: refreshToken })
  },

  refreshToken: async (refresh: string): Promise<{ access: string }> => {
    const response = await api.post('/auth/token/refresh/', { refresh })
    return response.data
  },

  getProfile: async () => {
    const response = await api.get('/auth/users/me/')
    return response.data
  },
}
