import api from './api'

export interface Notification {
  id: number
  tipo: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  action_url?: string
  read: boolean
  read_at: string | null
  created_at: string
}

// Helper to handle paginated results
const extractData = <T>(data: T[] | { results: T[] }): T[] => {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'results' in data) return data.results
  return []
}

export const notificationService = {
  getNotifications: async (): Promise<Notification[]> => {
    const response = await api.get('/notifications/')
    return extractData(response.data)
  },

  getUnreadNotifications: async (): Promise<Notification[]> => {
    const response = await api.get('/notifications/unread/')
    return extractData(response.data)
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get('/notifications/unread_count/')
    return response.data.count
  },

  markAsRead: async (id: number): Promise<Notification> => {
    const response = await api.post(`/notifications/${id}/mark_read/`)
    return response.data
  },

  markAllAsRead: async (): Promise<{ message: string }> => {
    const response = await api.post('/notifications/mark_all_read/')
    return response.data
  },
}
