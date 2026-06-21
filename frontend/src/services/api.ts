import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Singleton refresh promise to prevent race conditions when multiple
// requests fail with 401 simultaneously.
let pendingRefresh: Promise<string> | null = null

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    // Clear any previous error toasts on successful response
    toast.dismiss()
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Skip refresh for auth endpoints to avoid loops
    const isAuthEndpoint = originalRequest.url?.includes('/auth/token')

    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true

      const { refreshToken, logout, setAuth } = useAuthStore.getState()

      if (refreshToken) {
        try {
          // Reuse an in-flight refresh request instead of creating a new one
          if (!pendingRefresh) {
            pendingRefresh = axios
              .post(`${import.meta.env.VITE_API_URL || '/api'}/auth/token/refresh/`, { refresh: refreshToken })
              .then((res) => {
                const { access, refresh: newRefresh } = res.data
                const { user } = useAuthStore.getState()
                if (user) {
                  // Save the NEW refresh token returned by rotation
                  setAuth(user, access, newRefresh || refreshToken)
                }
                return access
              })
              .finally(() => {
                pendingRefresh = null
              })
          }

          const newAccess = await pendingRefresh
          originalRequest.headers.Authorization = `Bearer ${newAccess}`
          return api(originalRequest)
        } catch (refreshError) {
          logout()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        logout()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api

// Helper para manejar respuestas paginadas o arrays directos
export const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}
