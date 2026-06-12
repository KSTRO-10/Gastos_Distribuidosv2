import api from './api';
import { extractData } from './api';
import { Factura, CreateFacturaDto, ValidacionDto, ProgramacionPagoDto } from '@/types/facturacion';

export const facturacionService = {
  getFacturas: async (params?: any) => {
    const response = await api.get('/invoices/', { params });
    return extractData<Factura>(response.data);
  },

  getFactura: async (id: number) => {
    const response = await api.get(`/invoices/${id}/`);
    return response.data as Factura;
  },

  createFactura: async (data: CreateFacturaDto) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'lineas') {
        formData.append(key, JSON.stringify(value));
      } else if (value !== undefined && value !== null) {
        formData.append(key, value as string | Blob);
      }
    });

    const response = await api.post('/invoices/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as Factura;
  },

  validarFactura: async (id: number, data: ValidacionDto) => {
    const response = await api.post(`/invoices/${id}/validar/`, data);
    return response.data as Factura;
  },

  programarPagos: async (data: ProgramacionPagoDto) => {
    const response = await api.post('/invoices/programar_pago_masivo/', data);
    return response.data;
  },

  registrarPago: async (id: number, comprobantePdf: File) => {
    const formData = new FormData();
    formData.append('comprobante', comprobantePdf);
    const response = await api.post(`/invoices/${id}/registrar_pago/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as Factura;
  }
};
