export enum FacturaStatus {
  BORRADOR = 'BORRADOR',
  PENDIENTE = 'PENDIENTE',
  VALIDANDO = 'VALIDANDO',
  RECHAZADA = 'RECHAZADA',
  AUTORIZADA = 'AUTORIZADA',
  PROGRAMADA = 'PROGRAMADA',
  PAGADA = 'PAGADA'
}

export interface FacturaLinea {
  id: number;
  factura: number;
  orden_linea?: number;
  recepcion_linea?: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Factura {
  id: number;
  folio: string;
  proveedor: number;
  proveedor_nombre?: string;
  orden_compra?: number;
  orden_compra_folio?: string;
  recepcion?: number;
  recepcion_folio?: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  subtotal: number;
  iva: number;
  total: number;
  uuid?: string;
  rfc_emisor?: string;
  status: FacturaStatus;
  archivo_xml?: string;
  archivo_pdf?: string;
  comentarios?: string;
  creado_por?: number;
  creado_en: string;
  lineas: FacturaLinea[];
}

export interface ValidacionDto {
  aprobado: boolean;
  comentarios: string;
}

export interface ProgramacionPagoDto {
  factura_ids: number[];
  fecha_pago: string;
  cuenta_origen: string;
}

export interface CreateFacturaDto {
  proveedor: number;
  orden_compra?: number;
  recepcion?: number;
  fecha_emision: string;
  fecha_vencimiento: string;
  subtotal: number;
  iva: number;
  total: number;
  uuid?: string;
  rfc_emisor?: string;
  lineas: Omit<FacturaLinea, 'id' | 'factura'>[];
  archivo_xml?: File;
  archivo_pdf?: File;
}
