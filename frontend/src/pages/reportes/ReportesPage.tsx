import React, { useState, useEffect } from 'react'
import { Card, Button, Select, LoadingOverlay, ProgressBar } from '@/components/ui'
import { ExpenseBarChart, TrendLineChart, DistributionPieChart } from '@/components/charts/Charts'
import { dashboardService, type GastosPorArea, type GastosMensuales } from '@/services/dashboardService'
import {
  FunnelIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  TableCellsIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import clsx from 'clsx'

type ViewMode = 'charts' | 'table'
type PeriodType = 'month' | 'quarter' | 'year'

const ReportesPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('charts')
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month')
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [gastosPorArea, setGastosPorArea] = useState<GastosPorArea[]>([])
  const [gastosMensuales, setGastosMensuales] = useState<GastosMensuales[]>([])

  useEffect(() => {
    loadReportData()
  }, [selectedPeriod, selectedArea])

  const loadReportData = async () => {
    try {
      setLoading(true)
      const [areasData, mensualesData] = await Promise.all([
        dashboardService.getGastosPorArea(),
        dashboardService.getGastosMensuales(),
      ])
      setGastosPorArea(areasData)
      setGastosMensuales(mensualesData)
    } catch (error) {
      console.error('Error cargando reportes:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const handleExportCSV = () => {
    // Generar CSV
    const headers = ['Área', 'Gastado', 'Presupuesto', '% Utilizado']
    const rows = gastosPorArea.map(area => [
      area.area,
      area.gastado.toString(),
      area.presupuesto.toString(),
      area.porcentaje.toFixed(2) + '%'
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `reporte_gastos_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportPDF = () => {
    // Por ahora solo abrimos ventana de impresión
    window.print()
  }

  // Calcular totales
  const totalGastado = gastosPorArea.reduce((sum, area) => sum + area.gastado, 0)
  const totalPresupuesto = gastosPorArea.reduce((sum, area) => sum + area.presupuesto, 0)
  const porcentajeTotal = totalPresupuesto > 0 ? (totalGastado / totalPresupuesto) * 100 : 0

  // Datos para gráficos
  const barChartData = gastosPorArea.map(area => ({
    name: area.area,
    gastado: area.gastado,
    presupuesto: area.presupuesto,
  }))

  const pieChartData = gastosPorArea.map(area => ({
    name: area.area,
    value: area.gastado,
  }))

  const periodOptions = [
    { value: 'month', label: 'Mes actual' },
    { value: 'quarter', label: 'Trimestre' },
    { value: 'year', label: 'Año' },
  ]

  const areaOptions = [
    { value: 'all', label: 'Todas las áreas' },
    ...gastosPorArea.map(a => ({ value: a.area, label: a.area }))
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingOverlay message="Generando reportes..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h1>
          <p className="text-gray-500 mt-1">Visualiza y exporta información detallada de gastos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="primary" onClick={handleExportPDF}>
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="bg-white" shadow="lg">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-gray-500 mr-4">
            <FunnelIcon className="w-5 h-5" />
            <span className="font-medium">Filtros</span>
          </div>
          
          <div className="w-48">
            <Select
              label="Período"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as PeriodType)}
              options={periodOptions}
            />
          </div>

          <div className="w-56">
            <Select
              label="Área"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              options={areaOptions}
            />
          </div>

          <div className="flex-1" />

          {/* Toggle de vista */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('charts')}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'charts'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <ChartBarIcon className="w-4 h-4" />
              Gráficos
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <TableCellsIcon className="w-4 h-4" />
              Tabla
            </button>
          </div>
        </div>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100" shadow="lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-200 flex items-center justify-center">
              <CurrencyDollarIcon className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <p className="text-sm text-blue-600">Total Gastado</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(totalGastado)}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100" shadow="lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-200 flex items-center justify-center">
              <CalendarDaysIcon className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm text-emerald-600">Presupuesto Total</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(totalPresupuesto)}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100" shadow="lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-200 flex items-center justify-center">
              <BuildingOfficeIcon className="w-6 h-6 text-purple-700" />
            </div>
            <div>
              <p className="text-sm text-purple-600">% Utilizado</p>
              <p className="text-2xl font-bold text-purple-700 mt-1">{porcentajeTotal.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {viewMode === 'charts' ? (
        <>
          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white" shadow="lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Gastos vs Presupuesto</h3>
              <p className="text-sm text-gray-500 mb-4">Comparativa por área</p>
              <ExpenseBarChart data={barChartData} height={320} />
            </Card>

            <Card className="bg-white" shadow="lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tendencia Histórica</h3>
              <p className="text-sm text-gray-500 mb-4">Evolución mensual de gastos</p>
              <TrendLineChart data={gastosMensuales} height={320} />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-white" shadow="lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Desglose por Área</h3>
              <div className="space-y-4">
                {gastosPorArea.map((area, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-gray-700 truncate">{area.area}</div>
                    <div className="flex-1">
                      <ProgressBar
                        value={area.gastado}
                        max={area.presupuesto}
                        size="md"
                        color="auto"
                        animated={false}
                      />
                    </div>
                    <div className="w-24 text-right text-sm">
                      <span className="font-medium text-gray-900">{formatCurrency(area.gastado)}</span>
                    </div>
                    <div className="w-16 text-right">
                      <span className={clsx(
                        'text-sm font-medium',
                        area.porcentaje >= 90 ? 'text-red-600' :
                        area.porcentaje >= 75 ? 'text-amber-600' : 'text-emerald-600'
                      )}>
                        {area.porcentaje.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-white" shadow="lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Distribución</h3>
              <p className="text-sm text-gray-500 mb-4">Por área</p>
              <DistributionPieChart data={pieChartData} height={280} showLegend={false} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                {pieChartData.slice(0, 4).map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][index] }}
                    />
                    <span className="text-gray-600 truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : (
        /* Vista de tabla */
        <Card className="bg-white" shadow="lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900">Área</th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-900">Gastado</th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-900">Presupuesto</th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-900">Disponible</th>
                  <th className="text-right py-4 px-4 text-sm font-semibold text-gray-900">% Utilizado</th>
                  <th className="py-4 px-4 text-sm font-semibold text-gray-900 w-40">Progreso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gastosPorArea.map((area, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'][index % 5] }}
                        />
                        <span className="font-medium text-gray-900">{area.area}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(area.gastado)}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-600">
                      {formatCurrency(area.presupuesto)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={clsx(
                        'font-medium',
                        area.presupuesto - area.gastado < 0 ? 'text-red-600' : 'text-emerald-600'
                      )}>
                        {formatCurrency(area.presupuesto - area.gastado)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={clsx(
                        'px-2 py-1 rounded-full text-sm font-medium',
                        area.porcentaje >= 90 ? 'bg-red-100 text-red-700' :
                        area.porcentaje >= 75 ? 'bg-amber-100 text-amber-700' : 
                        'bg-emerald-100 text-emerald-700'
                      )}>
                        {area.porcentaje.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <ProgressBar
                        value={area.porcentaje}
                        max={100}
                        size="sm"
                        color="auto"
                        animated={false}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="py-4 px-4 font-bold text-gray-900">Total</td>
                  <td className="py-4 px-4 text-right font-bold text-gray-900">
                    {formatCurrency(totalGastado)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-gray-900">
                    {formatCurrency(totalPresupuesto)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-emerald-600">
                    {formatCurrency(totalPresupuesto - totalGastado)}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-gray-900">
                    {porcentajeTotal.toFixed(1)}%
                  </td>
                  <td className="py-4 px-4">
                    <ProgressBar
                      value={porcentajeTotal}
                      max={100}
                      size="sm"
                      color="auto"
                      animated={false}
                    />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Tabla de datos mensuales */}
      <Card className="bg-white print:shadow-none" shadow="lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalle Mensual</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Mes</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Gastado</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Presupuestado</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Diferencia</th>
                <th className="py-3 px-4 text-sm font-semibold text-gray-900 w-32">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gastosMensuales.map((mes, index) => {
                const diferencia = mes.presupuestado - mes.gastado
                const excedido = diferencia < 0
                return (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">{mes.mes}</td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {formatCurrency(mes.gastado)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {formatCurrency(mes.presupuestado)}
                    </td>
                    <td className={clsx(
                      'py-3 px-4 text-right font-medium',
                      excedido ? 'text-red-600' : 'text-emerald-600'
                    )}>
                      {excedido ? '-' : '+'}{formatCurrency(Math.abs(diferencia))}
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        excedido 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      )}>
                        {excedido ? 'Excedido' : 'En presupuesto'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default ReportesPage
