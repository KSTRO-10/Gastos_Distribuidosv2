import React from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

interface Breadcrumb {
    label: string
    href?: string
}

interface PageHeaderProps {
    /** Título principal de la página */
    title: string
    /** Subtítulo o descripción (opcional) */
    subtitle?: string
    /** Ícono de la sección (componente React) */
    icon?: React.ReactNode
    /** Breadcrumbs para navegación (opcional) */
    breadcrumbs?: Breadcrumb[]
    /** Acciones a mostrar (botones, etc.) */
    actions?: React.ReactNode
    /** Variante de estilo */
    variant?: 'default' | 'gradient' | 'minimal'
    /** Color del gradiente (solo para variant="gradient") */
    gradient?: 'blue' | 'purple' | 'green' | 'orange' | 'indigo'
    /** Contenido adicional debajo del header (stats, filtros, etc.) */
    children?: React.ReactNode
    /** Clase CSS adicional */
    className?: string
}

const gradientColors = {
    blue: 'from-blue-600 via-blue-700 to-indigo-800',
    purple: 'from-purple-600 via-purple-700 to-indigo-800',
    green: 'from-emerald-600 via-emerald-700 to-teal-800',
    orange: 'from-orange-500 via-orange-600 to-red-700',
    indigo: 'from-indigo-600 via-indigo-700 to-purple-800',
}

const iconColors = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-emerald-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    indigo: 'from-indigo-500 to-indigo-600',
}

export default function PageHeader({
    title,
    subtitle,
    icon,
    breadcrumbs,
    actions,
    variant = 'default',
    gradient = 'blue',
    children,
    className,
}: PageHeaderProps) {

    // Renderizar breadcrumbs
    const renderBreadcrumbs = () => {
        if (!breadcrumbs || breadcrumbs.length === 0) return null

        return (
            <nav className="flex items-center gap-2 text-sm mb-2" aria-label="Breadcrumb">
                {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && (
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        )}
                        {crumb.href ? (
                            <Link
                                to={crumb.href}
                                className={clsx(
                                    'hover:underline',
                                    variant === 'gradient' ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                                )}
                            >
                                {crumb.label}
                            </Link>
                        ) : (
                            <span className={variant === 'gradient' ? 'text-white/90 font-medium' : 'text-gray-700 font-medium'}>
                                {crumb.label}
                            </span>
                        )}
                    </React.Fragment>
                ))}
            </nav>
        )
    }

    // Variante con gradiente (estilo premium)
    if (variant === 'gradient') {
        return (
            <div className={clsx('mb-6', className)}>
                <div className={clsx(
                    'relative overflow-hidden rounded-2xl p-6 md:p-8 text-white shadow-xl',
                    'bg-gradient-to-r',
                    gradientColors[gradient]
                )}>
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />

                    <div className="relative">
                        {renderBreadcrumbs()}

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                {icon && (
                                    <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm">
                                        <span className="text-white">{icon}</span>
                                    </div>
                                )}
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
                                    {subtitle && (
                                        <p className="mt-1 text-white/80 text-sm md:text-base">{subtitle}</p>
                                    )}
                                </div>
                            </div>

                            {actions && (
                                <div className="flex items-center gap-3">
                                    {actions}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {children}
            </div>
        )
    }

    // Variante minimal (solo título, sin decoración)
    if (variant === 'minimal') {
        return (
            <div className={clsx('mb-6', className)}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                    {actions && (
                        <div className="flex items-center gap-3">
                            {actions}
                        </div>
                    )}
                </div>
                {children}
            </div>
        )
    }

    // Variante default (estilo mejorado pero compatible)
    return (
        <div className={clsx('mb-6', className)}>
            {/* Header principal con fondo sutil */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-50 to-gray-100 rounded-xl p-5 md:p-6 border border-gray-200/60 shadow-sm">
                {/* Decoración sutil */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/4" />

                <div className="relative">
                    {renderBreadcrumbs()}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-4">
                            {icon && (
                                <div className={clsx(
                                    'flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br shadow-lg',
                                    iconColors[gradient]
                                )}>
                                    <span className="text-white">{icon}</span>
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
                                {subtitle && (
                                    <p className="mt-1 text-gray-500 text-sm">{subtitle}</p>
                                )}
                            </div>
                        </div>

                        {actions && (
                            <div className="flex items-center gap-3 sm:flex-shrink-0">
                                {actions}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {children}
        </div>
    )
}
