export type EstadoDevolucion = 'pendiente' | 'completada' | 'rechazada'
export type MotivoAjuste = 'dano' | 'robo' | 'caducidad' | 'error' | 'perdida' | 'admin' | 'otro'
export type TipoAjuste = 'suma' | 'resta'
export type EstadoArticulo = 'disponible' | 'danado' | 'en_garantia' | 'baja'

export interface IDevolucionDetalle {
  id?: number
  articulo: number
  articulo_nombre?: string
  cantidad: number
}

export interface IDevolucionInterna {
  id: number
  numero: string
  area_origen: number
  area_origen_nombre?: string
  almacen_destino: number
  almacen_destino_nombre?: string
  salida_origen?: number | null
  solicitante: number
  solicitante_nombre?: string
  recibido_por: number | null
  recibido_por_nombre?: string
  fecha_solicitud: string
  fecha_recepcion: string | null
  estado: EstadoDevolucion
  notas: string
  detalles: IDevolucionDetalle[]
}

export interface ICreateDevolucionInterna {
  area_origen: number
  almacen_destino: number
  salida_origen?: number | null
  notas?: string
  detalles: IDevolucionDetalle[]
}

export interface IAjusteDetalle {
  id?: number
  articulo: number
  articulo_nombre?: string
  cantidad: number
  tipo: TipoAjuste
}

export interface IAjusteInventario {
  id: number
  numero: string
  almacen: number
  almacen_nombre?: string
  solicitante: number
  solicitante_nombre?: string
  autorizador: number | null
  autorizador_nombre?: string
  estado: EstadoDevolucion // Reusing similar state (pendiente, aprobado, rechazado)
  motivo_general: MotivoAjuste
  evidencia: string | null
  justificacion: string
  fecha_solicitud: string
  fecha_autorizacion: string | null
  detalles: IAjusteDetalle[]
}

export interface ICreateAjusteInventario {
  almacen: number
  motivo_general: MotivoAjuste
  justificacion: string
  detalles: IAjusteDetalle[]
}
