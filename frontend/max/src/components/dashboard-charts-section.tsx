'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  IconCalendar,
  IconTrendingUp,
  IconTrendingDown,
  IconUsers,
  IconFileDescription,
  IconMessageCircle,
  IconTarget,
  IconFilter
} from '@tabler/icons-react'
import { ChartConfig, DashboardCharts } from '@/types'
import { cn } from '@/lib/utils'

interface DashboardChartsSectionProps {
  charts?: DashboardCharts
  isLoading?: boolean
  className?: string
  onDateRangeChange?: (range: string) => void
}

// Mock chart data generator
function generateMockChartData(): DashboardCharts {
  const dates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    return date.toISOString().split('T')[0]
  })

  const conversasTimeline: ChartConfig = {
    type: 'line',
    data: dates.map(date => ({
      date,
      contatos: Math.floor(Math.random() * 20) + 5,
      processos: Math.floor(Math.random() * 15) + 3,
      conversas: Math.floor(Math.random() * 25) + 8
    })),
    options: {
      title: 'Timeline de Conversas',
      xAxis: 'Data',
      yAxis: 'Quantidade',
      colors: ['#3b82f6', '#10b981', '#f59e0b'],
      legend: true,
      grid: true
    },
    responsive: true
  }

  const processosDistribution: ChartConfig = {
    type: 'pie',
    data: [
      { date: 'Novo', contatos: 12, processos: 8, conversas: 0 },
      { date: 'Em Andamento', contatos: 0, processos: 15, conversas: 0 },
      { date: 'Aguardando Cliente', contatos: 0, processos: 6, conversas: 0 },
      { date: 'Finalizado', contatos: 0, processos: 23, conversas: 0 }
    ],
    options: {
      title: 'Distribuição de Processos',
      colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
      legend: true
    },
    responsive: true
  }

  const conversionFunnel: ChartConfig = {
    type: 'bar',
    data: [
      { date: 'Leads', contatos: 100, processos: 0, conversas: 0 },
      { date: 'Contatos', contatos: 75, processos: 0, conversas: 0 },
      { date: 'Consultas', contatos: 45, processos: 0, conversas: 0 },
      { date: 'Clientes', contatos: 28, processos: 0, conversas: 0 }
    ],
    options: {
      title: 'Funil de Conversão',
      xAxis: 'Etapa',
      yAxis: 'Quantidade',
      colors: ['#3b82f6'],
      legend: false,
      grid: true
    },
    responsive: true
  }

  const activityHeatmap: ChartConfig = {
    type: 'heatmap',
    data: Array.from({ length: 24 }, (_, hour) => ({
      date: `${hour}:00`,
      contatos: Math.floor(Math.random() * 10),
      processos: Math.floor(Math.random() * 8),
      conversas: Math.floor(Math.random() * 15)
    })),
    options: {
      title: 'Mapa de Calor - Atividade por Hora',
      xAxis: 'Hora',
      yAxis: 'Atividade',
      colors: ['#dbeafe', '#3b82f6'],
      legend: false
    },
    responsive: true
  }

  const revenueProjection: ChartConfig = {
    type: 'area',
    data: dates.slice(-12).map(date => ({
      date,
      contatos: Math.floor(Math.random() * 50000) + 30000,
      processos: Math.floor(Math.random() * 60000) + 35000,
      conversas: 0
    })),
    options: {
      title: 'Projeção de Receita',
      xAxis: 'Mês',
      yAxis: 'Valor (R$)',
      colors: ['#10b981', '#3b82f6'],
      legend: true,
      grid: true
    },
    responsive: true
  }

  return {
    conversasTimeline,
    processosDistribution,
    conversionFunnel,
    activityHeatmap,
    revenueProjection
  }
}

// Simple chart visualization component
function ChartVisualization({ config, isLoading }: { config: ChartConfig; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="h-64 w-full bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-gray-400">Carregando gráfico...</div>
      </div>
    )
  }

  // This is a simplified visualization - in a real app, you'd use a proper charting library
  const { type, data, options } = config

  if (type === 'line') {
    return (
      <div className="h-64 w-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-4 flex flex-col">
        <div className="flex-1 relative">
          <svg className="w-full h-full" viewBox="0 0 400 200">
            {/* Grid lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={i}
                x1="0"
                y1={i * 40}
                x2="400"
                y2={i * 40}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}
            {/* Sample line chart */}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              points={data.slice(0, 10).map((_, i) => `${i * 40},${Math.random() * 160 + 20}`).join(' ')}
            />
          </svg>
        </div>
        <div className="text-xs text-gray-600 mt-2">
          Últimos 30 dias - {data.length} pontos de dados
        </div>
      </div>
    )
  }

  if (type === 'pie') {
    return (
      <div className="h-64 w-full bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-4 flex items-center justify-center">
        <div className="relative">
          <svg className="w-32 h-32" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="#3b82f6" />
            <circle cx="50" cy="50" r="40" fill="#10b981" strokeDasharray="75 25" strokeDashoffset="25" />
            <circle cx="50" cy="50" r="40" fill="#f59e0b" strokeDasharray="50 50" strokeDashoffset="50" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium">{data.length} categorias</span>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'bar') {
    return (
      <div className="h-64 w-full bg-gradient-to-br from-purple-50 to-violet-100 rounded-lg p-4">
        <div className="h-full flex items-end justify-around gap-2">
          {data.map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className="bg-purple-500 rounded-t-sm min-w-[20px]"
                style={{ height: `${(item.contatos / 100) * 150}px` }}
              />
              <span className="text-xs text-gray-600 transform -rotate-45 origin-center">
                {item.date}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'heatmap') {
    return (
      <div className="h-64 w-full bg-gradient-to-br from-yellow-50 to-orange-100 rounded-lg p-4">
        <div className="grid grid-cols-8 gap-1 h-full">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="rounded-sm"
              style={{
                backgroundColor: `rgba(59, 130, 246, ${Math.random() * 0.8 + 0.2})`
              }}
            />
          ))}
        </div>
        <div className="text-xs text-gray-600 mt-2">
          Atividade por hora (24h)
        </div>
      </div>
    )
  }

  if (type === 'area') {
    return (
      <div className="h-64 w-full bg-gradient-to-br from-emerald-50 to-teal-100 rounded-lg p-4 flex flex-col">
        <div className="flex-1 relative">
          <svg className="w-full h-full" viewBox="0 0 400 200">
            {/* Area fill */}
            <path
              d={`M 0,180 ${data.slice(0, 10).map((_, i) => `L ${i * 40},${Math.random() * 120 + 40}`).join(' ')} L 400,180 Z`}
              fill="rgba(16, 185, 129, 0.3)"
            />
            {/* Line */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              points={data.slice(0, 10).map((_, i) => `${i * 40},${Math.random() * 120 + 40}`).join(' ')}
            />
          </svg>
        </div>
        <div className="text-xs text-gray-600 mt-2">
          Projeção baseada em dados históricos
        </div>
      </div>
    )
  }

  return (
    <div className="h-64 w-full bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-gray-500">Tipo de gráfico não suportado: {type}</div>
    </div>
  )
}

export function DashboardChartsSection({ 
  charts, 
  isLoading, 
  className,
  onDateRangeChange 
}: DashboardChartsSectionProps) {
  const [dateRange, setDateRange] = useState('30d')
  const [selectedChart, setSelectedChart] = useState<string | null>(null)

  const mockCharts = generateMockChartData()
  const chartData = charts || mockCharts

  const handleDateRangeChange = (value: string) => {
    setDateRange(value)
    onDateRangeChange?.(value)
  }

  const chartStats = [
    {
      title: 'Conversas Hoje',
      value: '47',
      change: '+12%',
      trend: 'up' as const,
      icon: <IconMessageCircle className="h-4 w-4" />
    },
    {
      title: 'Taxa Conversão',
      value: '28%',
      change: '+5%',
      trend: 'up' as const,
      icon: <IconTarget className="h-4 w-4" />
    },
    {
      title: 'Novos Processos',
      value: '8',
      change: '-2%',
      trend: 'down' as const,
      icon: <IconFileDescription className="h-4 w-4" />
    },
    {
      title: 'Leads Ativos',
      value: '23',
      change: '+18%',
      trend: 'up' as const,
      icon: <IconUsers className="h-4 w-4" />
    }
  ]

  return (
    <div className={cn("space-y-6", className)}>
      {/* Charts Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics & Gráficos</h2>
          <p className="text-muted-foreground">
            Visualize o desempenho do seu escritório em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
              <SelectItem value="1y">1 ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <IconFilter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {chartStats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  {stat.icon}
                </div>
              </div>
              <div className="flex items-center mt-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    stat.trend === 'up' 
                      ? "text-green-600 bg-green-50 border-green-200" 
                      : "text-red-600 bg-red-50 border-red-200"
                  )}
                >
                  {stat.trend === 'up' ? (
                    <IconTrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <IconTrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {stat.change}
                </Badge>
                <span className="text-xs text-muted-foreground ml-2">
                  vs. período anterior
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversas Timeline */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Timeline de Conversas</CardTitle>
                <CardDescription>
                  Evolução de contatos, processos e conversas ao longo do tempo
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedChart(selectedChart === 'timeline' ? null : 'timeline')}
              >
                <IconCalendar className="h-4 w-4 mr-2" />
                {selectedChart === 'timeline' ? 'Ocultar' : 'Expandir'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ChartVisualization config={chartData.conversasTimeline} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Processos Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Processos</CardTitle>
            <CardDescription>
              Processos por status e área jurídica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartVisualization config={chartData.processosDistribution} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Funil de Conversão</CardTitle>
            <CardDescription>
              Taxa de conversão de leads para clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartVisualization config={chartData.conversionFunnel} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Activity Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Calor</CardTitle>
            <CardDescription>
              Horários de maior atividade no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartVisualization config={chartData.activityHeatmap} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Revenue Projection */}
        <Card>
          <CardHeader>
            <CardTitle>Projeção de Receita</CardTitle>
            <CardDescription>
              Estimativa de receita baseada em dados históricos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartVisualization config={chartData.revenueProjection} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Expanded Chart View */}
      {selectedChart && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Visualização Expandida</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChart(null)}
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ChartVisualization 
                config={chartData.conversasTimeline} 
                isLoading={isLoading} 
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}