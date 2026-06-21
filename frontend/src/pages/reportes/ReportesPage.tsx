import React, { useState, useEffect, useRef } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
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
  const barChartRef = useRef<HTMLDivElement>(null)
  const lineChartRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

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

  const handleExportPDF = async () => {
    try {
      setIsExporting(true)
      
      // Asegurarnos de estar en modo gráficos para capturarlos
      const prevViewMode = viewMode
      if (viewMode !== 'charts') {
        setViewMode('charts')
        await new Promise(resolve => setTimeout(resolve, 300))
      } else {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      
      // 1. ENCABEZADO
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(30, 41, 59)
      pdf.text('REPORTE DE CONTROL DE GASTOS Y PRESUPUESTOS', pageWidth / 2, 40, { align: 'center' })
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100, 116, 139)
      const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
      pdf.text(`Fecha de emisión: ${fecha}`, 40, 60)
      
      const lblArea = selectedArea === 'all' ? 'Todas las áreas' : selectedArea
      pdf.text(`Área: ${lblArea}`, 40, 75)
      
      const lblPeriodo = periodOptions.find(p => p.value === selectedPeriod)?.label || selectedPeriod
      pdf.text(`Período: ${lblPeriodo}`, pageWidth - 40, 60, { align: 'right' })

      pdf.setDrawColor(226, 232, 240)
      pdf.setLineWidth(1)
      pdf.line(40, 85, pageWidth - 40, 85)

      // 2. MÉTRICAS CLAVE
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(30, 41, 59)
      pdf.text('Resumen Ejecutivo', 40, 110)

      const metricsY = 125
      const boxWidth = (pageWidth - 100) / 3
      
      // Total Gastado
      pdf.setFillColor(239, 246, 255)
      pdf.roundedRect(40, metricsY, boxWidth, 50, 4, 4, 'F')
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(37, 99, 235)
      pdf.text('TOTAL GASTADO', 40 + boxWidth/2, metricsY + 20, { align: 'center' })
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(29, 78, 216)
      pdf.text(formatCurrency(totalGastado), 40 + boxWidth/2, metricsY + 40, { align: 'center' })

      // Presupuesto Total
      pdf.setFillColor(236, 253, 245)
      pdf.roundedRect(50 + boxWidth, metricsY, boxWidth, 50, 4, 4, 'F')
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(5, 150, 105)
      pdf.text('PRESUPUESTO TOTAL', 50 + boxWidth + boxWidth/2, metricsY + 20, { align: 'center' })
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(4, 120, 87)
      pdf.text(formatCurrency(totalPresupuesto), 50 + boxWidth + boxWidth/2, metricsY + 40, { align: 'center' })

      // % Utilizado
      pdf.setFillColor(250, 245, 255)
      pdf.roundedRect(60 + boxWidth*2, metricsY, boxWidth, 50, 4, 4, 'F')
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(147, 51, 234)
      pdf.text('% UTILIZADO', 60 + boxWidth*2 + boxWidth/2, metricsY + 20, { align: 'center' })
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(126, 34, 206)
      pdf.text(`${porcentajeTotal.toFixed(1)}%`, 60 + boxWidth*2 + boxWidth/2, metricsY + 40, { align: 'center' })

      let currentY = 210

      // 3. TABLA: DESGLOSE POR ÁREA
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(30, 41, 59)
      pdf.text('Desglose de Gastos por Área', 40, currentY)
      
      const areaBody = gastosPorArea.map(a => [
        a.area,
        formatCurrency(a.gastado),
        formatCurrency(a.presupuesto),
        formatCurrency(a.presupuesto - a.gastado),
        `${a.porcentaje.toFixed(1)}%`
      ])
      
      autoTable(pdf, {
        startY: currentY + 15,
        head: [['Área', 'Gastado', 'Presupuesto', 'Disponible', '% Utilizado']],
        body: areaBody,
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 5, textColor: [51, 65, 85] },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'center', fontStyle: 'bold' }
        },
        margin: { left: 40, right: 40 },
        didDrawPage: () => {
          const str = 'Página ' + (pdf.internal as any).getNumberOfPages()
          pdf.setFontSize(8)
          pdf.setTextColor(150)
          pdf.text(str, pageWidth - 40, pageHeight - 20, { align: 'right' })
        }
      })
      
      currentY = (pdf as any).lastAutoTable.finalY + 30

      // 4. TABLA: DETALLE MENSUAL
      if (currentY > pageHeight - 150) {
        pdf.addPage()
        currentY = 40
      }

      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(30, 41, 59)
      pdf.text('Detalle Mensual de Ejecución', 40, currentY)

      const mensualBody = gastosMensuales.map(m => {
        const dif = m.presupuestado - m.gastado
        return [
          m.mes,
          formatCurrency(m.gastado),
          formatCurrency(m.presupuestado),
          `${dif < 0 ? '-' : '+'}${formatCurrency(Math.abs(dif))}`,
          dif < 0 ? 'Excedido' : 'En presupuesto'
        ]
      })

      autoTable(pdf, {
        startY: currentY + 15,
        head: [['Mes', 'Gastado', 'Presupuestado', 'Diferencia', 'Estado']],
        body: mensualBody,
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 5, textColor: [51, 65, 85] },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'center' }
        },
        margin: { left: 40, right: 40 }
      })

      currentY = (pdf as any).lastAutoTable.finalY + 30

      // 5. GRÁFICOS
      if (barChartRef.current && lineChartRef.current) {
        if (currentY > pageHeight - 250) {
          pdf.addPage()
          currentY = 40
        }

        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(30, 41, 59)
        pdf.text('Análisis Gráfico', 40, currentY)
        currentY += 20

        const canvasOptions = { scale: 2, backgroundColor: '#ffffff', logging: false }
        
        const canvasBar = await html2canvas(barChartRef.current, canvasOptions)
        const imgBar = canvasBar.toDataURL('image/png')
        const chartWidth = (pageWidth - 90) / 2
        const chartHeight = (canvasBar.height * chartWidth) / canvasBar.width
        
        pdf.addImage(imgBar, 'PNG', 40, currentY, chartWidth, chartHeight)

        const canvasLine = await html2canvas(lineChartRef.current, canvasOptions)
        const imgLine = canvasLine.toDataURL('image/png')
        const chartHeightL = (canvasLine.height * chartWidth) / canvasLine.width

        pdf.addImage(imgLine, 'PNG', 50 + chartWidth, currentY, chartWidth, chartHeightL)
      }

      if (prevViewMode !== 'charts') {
        setViewMode(prevViewMode)
      }

      const m = new Date().toLocaleString('es-MX', { month: 'long' })
      pdf.save(`Reporte_Ejecutivo_Gastos_${m}.pdf`)
    } catch (error) {
      console.error('Error al generar PDF profesional:', error)
    } finally {
      setIsExporting(false)
    }
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
    <div className="space-y-6 pb-8 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h1>
          <p className="text-gray-500 mt-1">Visualiza y exporta información detallada de gastos</p>
        </div>
        <div className="flex items-center gap-2 print:hidden" data-html2canvas-ignore="true">
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
      <div data-html2canvas-ignore="true">
        <Card className="bg-white print:hidden" shadow="lg">
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
      </div>

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
              <div ref={barChartRef} className="bg-white p-2">
                <ExpenseBarChart data={barChartData} height={320} />
              </div>
            </Card>

            <Card className="bg-white" shadow="lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tendencia Histórica</h3>
              <p className="text-sm text-gray-500 mb-4">Evolución mensual de gastos</p>
              <div ref={lineChartRef} className="bg-white p-2">
                <TrendLineChart data={gastosMensuales} height={320} />
              </div>
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

      {isExporting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900 bg-opacity-50" data-html2canvas-ignore="true">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700 font-medium">Generando PDF de alta calidad...</p>
            <p className="text-gray-500 text-sm mt-1">Por favor espera un momento</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReportesPage
