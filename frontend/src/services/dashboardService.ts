import api from './api'

export interface DashboardStats {
  solicitudes_pendientes: number
  solicitudes_aprobadas: number
  solicitudes_rechazadas: number
  cotizaciones_pendientes: number
  ordenes_activas: number
  ordenes_completadas: number
  facturas_pendientes: number
  facturas_procesadas: number
  total_gastado_mes: number
  total_presupuesto: number
  total_disponible: number
  user_role: string | null
}

export interface GastosPorArea {
  area: string
  gastado: number
  presupuesto: number
  porcentaje: number
}

export interface GastosMensuales {
  mes: string
  gastado: number
  presupuestado: number
}

export interface SolicitudReciente {
  id: number
  numero: string
  area: string
  estado: string
  fecha: string
  total: number
}

export interface ActividadReciente {
  id: number | string
  tipo: 'solicitud' | 'cotizacion' | 'orden' | 'factura' | 'entrega'
  descripcion: string
  fecha: string
  usuario: string
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/reports/dashboard/stats/')
    return response.data
  },

  getGastosPorArea: async (): Promise<GastosPorArea[]> => {
    const response = await api.get('/reports/dashboard/gastos-por-area/')
    return Array.isArray(response.data) ? response.data : []
  },

  getGastosMensuales: async (): Promise<GastosMensuales[]> => {
    const response = await api.get('/reports/dashboard/gastos-mensuales/')
    return Array.isArray(response.data) ? response.data : []
  },

  getSolicitudesRecientes: async (): Promise<SolicitudReciente[]> => {
    const response = await api.get('/reports/dashboard/solicitudes-recientes/')
    return Array.isArray(response.data) ? response.data : []
  },

  getActividadReciente: async (): Promise<ActividadReciente[]> => {
    const response = await api.get('/reports/dashboard/actividad-reciente/')
    return Array.isArray(response.data) ? response.data : []
  },
}
