import api from './api'

// ---------- Interfaces ----------

export interface ItemSolicitudGastoForm {
  area: number
  clave_presupuestaria: string
  concepto_bien: string
  descripcion_adquirido: string
  cantidad: number
  precio_unitario: number
  costo_total: number
  unidad: string
}

export interface SolicitudGastoForm {
  factura: number
  fondo_programa: string
  tipo_material: string
  items: ItemSolicitudGastoForm[]
}

export interface SolicitudGasto {
  id: number
  numero: string
  estado: string
  fecha_solicitud: string
  solicitud_pago_id?: number
}

export interface ItemSolicitudGastoDetail {
  id: number
  area: number
  area_nombre: string
  clave_presupuestaria: string
  concepto_bien: string
  descripcion_adquirido: string
  cantidad: number
  precio_unitario: number
  costo_total: number
}

export interface SolicitudGastoDetail extends SolicitudGasto {
  factura: number
  fondo_programa: string
  tipo_material: string
  items: ItemSolicitudGastoDetail[]
}

export interface ItemSolicitudPagoForm {
  area: number
  clave_presupuestaria: string
  importe: number
}

export interface SolicitudPagoForm {
  solicitud_gasto: number
  banco: string
  numero_cuenta: string
  cog_clave: string
  cog_nombre: string
  items: ItemSolicitudPagoForm[]
}

export interface SolicitudPago {
  id: number
  numero: string
  estado: string
  fecha_solicitud: string
}

// ---------- Helpers ----------

const downloadBlob = (data: Blob, filename: string) => {
  const url = window.URL.createObjectURL(new Blob([data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

// ---------- Service ----------

export const treasuryService = {
  createSolicitudGasto: async (data: SolicitudGastoForm): Promise<SolicitudGastoDetail> => {
    const response = await api.post('/treasury/solicitudes-gasto/', data)
    return response.data
  },

  getSolicitudGasto: async (id: number): Promise<SolicitudGastoDetail> => {
    const response = await api.get(`/treasury/solicitudes-gasto/${id}/`)
    return response.data
  },

  createSolicitudPago: async (data: SolicitudPagoForm): Promise<SolicitudPago> => {
    const response = await api.post('/treasury/solicitudes-pago/', data)
    return response.data
  },

  downloadSolicitudGastoPdf: async (id: number, numero?: string): Promise<void> => {
    const response = await api.get(`/treasury/solicitudes-gasto/${id}/pdf/`, {
      responseType: 'blob',
    })
    downloadBlob(response.data, `solicitud_gasto_${numero ?? id}.pdf`)
  },

  downloadSolicitudPagoPdf: async (id: number, numero?: string): Promise<void> => {
    const response = await api.get(`/treasury/solicitudes-pago/${id}/pdf/`, {
      responseType: 'blob',
    })
    downloadBlob(response.data, `solicitud_pago_${numero ?? id}.pdf`)
  },

  downloadExpedientePdf: async (id: number, numero?: string): Promise<void> => {
    const response = await api.get(`/treasury/solicitudes-gasto/${id}/expediente/`, {
      responseType: 'blob',
    })
    downloadBlob(response.data, `expediente_${numero ?? id}.pdf`)
  },

  downloadDistribucionPdf: async (id: number, numero?: string): Promise<void> => {
    const response = await api.get(`/treasury/solicitudes-gasto/${id}/distribucion/`, {
      responseType: 'blob',
    })
    downloadBlob(response.data, `distribucion_${numero ?? id}.pdf`)
  },

  downloadExpedienteCompleto: async (id: number, numero?: string): Promise<void> => {
    const response = await api.get(`/treasury/solicitudes-gasto/${id}/expediente-completo/`, {
      responseType: 'blob',
    })
    downloadBlob(response.data, `expediente_completo_${numero ?? id}.pdf`)
  },
}
