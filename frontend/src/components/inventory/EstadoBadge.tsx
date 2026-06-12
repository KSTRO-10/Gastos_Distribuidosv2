import { clsx } from 'clsx'
import { EstadoDevolucion, EstadoArticulo } from '../../types/inventory'

interface EstadoBadgeProps {
  estado: EstadoDevolucion | EstadoArticulo | string
  className?: string
}

export default function EstadoBadge({ estado, className }: EstadoBadgeProps) {
  const getStyle = () => {
    switch (estado.toLowerCase()) {
      case 'completada':
      case 'disponible':
      case 'aprobado':
      case 'autorizado':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pendiente':
      case 'borrador':
      case 'en_garantia':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'rechazada':
      case 'danado':
      case 'cancelado':
      case 'baja':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatText = (text: string) => {
    return text.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getStyle(),
        className
      )}
    >
      {formatText(estado)}
    </span>
  )
}
