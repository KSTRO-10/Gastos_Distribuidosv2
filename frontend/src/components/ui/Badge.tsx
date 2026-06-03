import React from 'react'
import clsx from 'clsx'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  purple: 'bg-purple-500',
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className
}) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        variantClasses[variant],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
    >
      {dot && (
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          dotColors[variant]
        )} />
      )}
      {children}
    </span>
  )
}

// Estado de solicitudes/órdenes
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
    pendiente: { variant: 'warning', label: 'Pendiente' },
    en_revision: { variant: 'info', label: 'En Revisión' },
    en_proceso: { variant: 'info', label: 'En Proceso' },
    aprobada: { variant: 'success', label: 'Aprobada' },
    aprobado: { variant: 'success', label: 'Aprobado' },
    rechazada: { variant: 'danger', label: 'Rechazada' },
    rechazado: { variant: 'danger', label: 'Rechazado' },
    completada: { variant: 'success', label: 'Completada' },
    completado: { variant: 'success', label: 'Completado' },
    cancelada: { variant: 'danger', label: 'Cancelada' },
    cancelado: { variant: 'danger', label: 'Cancelado' },
    enviada: { variant: 'purple', label: 'Enviada' },
    confirmada: { variant: 'success', label: 'Confirmada' },
    activo: { variant: 'success', label: 'Activo' },
    inactivo: { variant: 'default', label: 'Inactivo' },
    procesada: { variant: 'success', label: 'Procesada' },
    pagada: { variant: 'success', label: 'Pagada' },
  }

  const config = statusMap[status.toLowerCase()] || { variant: 'default', label: status }

  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  )
}
