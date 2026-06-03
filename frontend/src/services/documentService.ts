import api from './api'

export const documentService = {
  downloadSolicitudPdf: async (id: number, numero: string): Promise<void> => {
    const response = await api.get(`/procurement/solicitudes/${id}/generar_pdf/`, {
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `solicitud_${numero}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  downloadOrdenCompraPdf: async (id: number, numero: string): Promise<void> => {
    const response = await api.get(`/orders/${id}/generar_pdf/`, {
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `orden_${numero}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  downloadAutorizacionPdf: async (id: number, referencia: string): Promise<void> => {
    const response = await api.get(`/orders/autorizaciones/${id}/generar_pdf/`, {
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `autorizacion_${referencia}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  generateCotizacionPdf: async (id: number): Promise<number | null> => {
    const response = await api.post('/documents/pdf/generate/', {
      document_type: 'cotizacion',
      object_id: id,
    })
    return response.data.document_id ?? null
  },

  downloadPdf: async (documentId: number, filename: string): Promise<void> => {
    const response = await api.get(`/documents/pdf/${documentId}/download/`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  generateEntregaPdf: async (id: number): Promise<number | null> => {
    const response = await api.post('/documents/pdf/generate/', {
      document_type: 'entrega_bienes',
      object_id: id,
    })
    return response.data.document_id ?? null
  },

  generateSalidaPdf: async (id: number): Promise<number | null> => {
    const response = await api.post('/documents/pdf/generate/', {
      document_type: 'salida_almacen',
      object_id: id,
    })
    return response.data.document_id ?? null
  },

  generateOrdenCompraPdf: async (id: number): Promise<number | null> => {
    const response = await api.post('/documents/pdf/generate/', {
      document_type: 'orden_compra',
      object_id: id,
    })
    return response.data.document_id ?? null
  },

  generateAutorizacionPdf: async (id: number): Promise<number | null> => {
    const response = await api.post('/documents/pdf/generate/', {
      document_type: 'autorizacion',
      object_id: id,
    })
    return response.data.document_id ?? null
  },

  generateSolicitudAutorizacionPdf: async (id: number): Promise<number | null> => {
    const response = await api.post('/documents/pdf/generate/', {
      document_type: 'solicitud_autorizacion',
      object_id: id,
    })
    return response.data.document_id ?? null
  },

  downloadSolicitudGastoPdf: async (id: number, numero: string): Promise<void> => {
    const response = await api.get(`/documents/solicitud-gasto/${id}/pdf/`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `solicitud_gasto_${numero}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  downloadSolicitudPagoPdf: async (id: number, numero: string): Promise<void> => {
    const response = await api.get(`/documents/solicitud-pago/${id}/pdf/`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `solicitud_pago_${numero}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}
