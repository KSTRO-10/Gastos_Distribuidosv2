import React from 'react'
import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  gradient?: 'none' | 'primary' | 'success' | 'purple' | 'warning' | 'danger' | 'teal' | 'glass'
  shadow?: 'sm' | 'md' | 'lg' | 'xl'
  onClick?: () => void
}

// Gradientes premium con estilo consistente al login
const gradientClasses = {
  none: 'bg-white/80 backdrop-blur-sm border border-gray-200/50',
  primary: 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white',
  success: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white',
  purple: 'bg-gradient-to-br from-purple-500 via-violet-500 to-indigo-600 text-white',
  warning: 'bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white',
  danger: 'bg-gradient-to-br from-rose-500 via-red-500 to-pink-600 text-white',
  teal: 'bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-600 text-white',
  glass: 'bg-white/70 backdrop-blur-xl border border-white/20',
}

// Sombras con color para más profundidad
const shadowClasses = {
  sm: 'shadow-sm',
  md: 'shadow-md shadow-gray-200/50',
  lg: 'shadow-lg shadow-gray-300/30',
  xl: 'shadow-xl shadow-gray-300/40',
}

// Sombras coloreadas para gradientes
const gradientShadows: Record<string, string> = {
  primary: 'shadow-lg shadow-indigo-500/30',
  success: 'shadow-lg shadow-emerald-500/30',
  purple: 'shadow-lg shadow-purple-500/30',
  warning: 'shadow-lg shadow-orange-500/30',
  danger: 'shadow-lg shadow-rose-500/30',
  teal: 'shadow-lg shadow-cyan-500/30',
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = false,
  gradient = 'none',
  shadow = 'md',
  onClick
}) => {
  const isGradient = gradient !== 'none' && gradient !== 'glass'

  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-2xl p-6 transition-all duration-300',
        gradientClasses[gradient],
        isGradient ? gradientShadows[gradient] : shadowClasses[shadow],
        hover && 'hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02]',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  gradient?: CardProps['gradient']
  subtitle?: string
  onClick?: () => void
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  gradient = 'none',
  subtitle,
  onClick
}) => {
  const isGradient = gradient !== 'none' && gradient !== 'glass'

  return (
    <Card gradient={gradient} hover shadow="lg" className="relative overflow-hidden group" onClick={onClick}>
      {/* Decorative animated circles for gradient cards */}
      {isGradient && (
        <>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute top-1/2 right-4 w-16 h-16 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors duration-500" />
        </>
      )}

      {/* Glass effect overlay for gradient cards */}
      {isGradient && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
      )}

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={clsx(
            'text-sm font-semibold tracking-wide uppercase',
            isGradient ? 'text-white/90' : 'text-gray-500'
          )}>
            {title}
          </p>
          <p className={clsx(
            'text-4xl font-bold mt-3 tracking-tight',
            isGradient ? 'text-white drop-shadow-sm' : 'text-gray-900'
          )}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className={clsx(
              'text-sm mt-2 font-medium',
              isGradient ? 'text-white/80' : 'text-gray-400'
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center mt-3">
              <span className={clsx(
                'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold',
                trend.isPositive
                  ? (isGradient ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700')
                  : (isGradient ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700')
              )}>
                <span className="mr-1">{trend.isPositive ? '↑' : '↓'}</span>
                {Math.abs(trend.value)}%
              </span>
              <span className={clsx(
                'ml-2 text-xs',
                isGradient ? 'text-white/60' : 'text-gray-400'
              )}>
                vs mes anterior
              </span>
            </div>
          )}
        </div>

        {icon && (
          <div className={clsx(
            'flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 group-hover:scale-110',
            isGradient
              ? 'bg-white/20 backdrop-blur-sm shadow-lg shadow-black/10'
              : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200/50'
          )}>
            <span className={clsx(
              'w-6 h-6',
              isGradient ? 'text-white' : 'text-gray-600'
            )}>
              {icon}
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}
