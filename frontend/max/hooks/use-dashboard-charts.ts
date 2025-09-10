'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardCharts, ChartConfig } from '@/types'

interface UseDashboardChartsOptions {
  dateRange?: string
  refreshInterval?: number
  autoRefresh?: boolean
}

interface UseDashboardChartsReturn {
  charts: DashboardCharts | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  updateDateRange: (range: string) => void
  exportChart: (chartType: keyof DashboardCharts, format: 'png' | 'pdf') => Promise<void>
}

// Enhanced mock data generator with date range support
function generateChartData(dateRange: string): DashboardCharts {
  const getDaysCount = (range: string): number => {
    switch (range) {
      case '7d': return 7
      case '30d': return 30
      case '90d': return 90
      case '1y': return 365
      default: return 30
    }
  }

  const daysCount = getDaysCount(dateRange)
  const dates = Array.from({ length: daysCount }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (daysCount - 1 - i))
    return date.toISOString().split('T')[0]
  })

  // Generate more realistic data based on date range
  const baseMultiplier = daysCount > 30 ? 2 : 1
  
  const conversasTimeline: ChartConfig = {
    type: 'line',
    data: dates.map(date => {
      const dayOfWeek = new Date(date).getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const weekendMultiplier = isWeekend ? 0.3 : 1
      
      return {
        date,
        contatos: Math.floor((Math.random() * 15 + 8) * baseMultiplier * weekendMultiplier),
        processos: Math.floor((Math.random() * 10 + 5) * baseMultiplier * weekendMultiplier),
        conversas: Math.floor((Math.random() * 20 + 12) * baseMultiplier * weekendMultiplier)
      }
    }),
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
      { date: 'Novo', contatos: 0, processos: Math.floor(Math.random() * 15 + 8), conversas: 0 },
      { date: 'Em Andamento', contatos: 0, processos: Math.floor(Math.random() * 25 + 15), conversas: 0 },
      { date: 'Aguardando Cliente', contatos: 0, processos: Math.floor(Math.random() * 12 + 4), conversas: 0 },
      { date: 'Finalizado', contatos: 0, processos: Math.floor(Math.random() * 30 + 20), conversas: 0 },
      { date: 'Arquivado', contatos: 0, processos: Math.floor(Math.random() * 8 + 2), conversas: 0 }
    ],
    options: {
      title: 'Distribuição de Processos por Status',
      colors: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6b7280'],
      legend: true
    },
    responsive: true
  }

  const conversionFunnel: ChartConfig = {
    type: 'bar',
    data: [
      { date: 'Visitantes', contatos: 1000, processos: 0, conversas: 0 },
      { date: 'Leads', contatos: 250, processos: 0, conversas: 0 },
      { date: 'Contatos', contatos: 120, processos: 0, conversas: 0 },
      { date: 'Consultas', contatos: 65, processos: 0, conversas: 0 },
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
    data: Array.from({ length: 24 }, (_, hour) => {
      // Business hours have higher activity
      const isBusinessHour = hour >= 8 && hour <= 18
      const multiplier = isBusinessHour ? 1.5 : 0.3
      
      return {
        date: `${hour.toString().padStart(2, '0')}:00`,
        contatos: Math.floor((Math.random() * 15 + 5) * multiplier),
        processos: Math.floor((Math.random() * 10 + 3) * multiplier),
        conversas: Math.floor((Math.random() * 20 + 8) * multiplier)
      }
    }),
    options: {
      title: 'Mapa de Calor - Atividade por Hora',
      xAxis: 'Hora do Dia',
      yAxis: 'Intensidade',
      colors: ['#dbeafe', '#1e40af'],
      legend: false
    },
    responsive: true
  }

  const revenueProjection: ChartConfig = {
    type: 'area',
    data: dates.slice(-12).map((date, index) => {
      const monthlyGrowth = 1 + (index * 0.05) // 5% monthly growth
      const baseRevenue = 35000
      const seasonalVariation = Math.sin((index / 12) * Math.PI * 2) * 0.2 + 1
      
      return {
        date,
        contatos: Math.floor(baseRevenue * monthlyGrowth * seasonalVariation),
        processos: Math.floor(baseRevenue * monthlyGrowth * seasonalVariation * 1.15), // Projected 15% higher
        conversas: 0
      }
    }),
    options: {
      title: 'Receita Realizada vs Projetada',
      xAxis: 'Período',
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

export function useDashboardCharts(options: UseDashboardChartsOptions = {}): UseDashboardChartsReturn {
  const { dateRange = '30d', refreshInterval = 60000, autoRefresh = true } = options
  
  const [charts, setCharts] = useState<DashboardCharts | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [currentDateRange, setCurrentDateRange] = useState(dateRange)

  const fetchCharts = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      
      // In a real implementation, this would be an API call
      // const response = await apiClient.getDashboardCharts({ dateRange: currentDateRange })
      // setCharts(response.data)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Generate mock data
      const mockCharts = generateChartData(currentDateRange)
      setCharts(mockCharts)
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch charts'))
    } finally {
      setIsLoading(false)
    }
  }, [currentDateRange])

  const refresh = async (): Promise<void> => {
    setIsLoading(true)
    await fetchCharts()
  }

  const updateDateRange = useCallback((range: string): void => {
    setCurrentDateRange(range)
    setIsLoading(true)
  }, [])

  const exportChart = async (chartType: keyof DashboardCharts, format: 'png' | 'pdf'): Promise<void> => {
    try {
      // In a real implementation, this would generate and download the chart
      console.log(`Exporting ${chartType} as ${format}`)
      
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create a mock download
      const link = document.createElement('a')
      link.href = '#'
      link.download = `${chartType}-${new Date().toISOString().split('T')[0]}.${format}`
      link.click()
      
    } catch (err) {
      throw new Error(`Failed to export ${chartType} chart`)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchCharts()
  }, [fetchCharts])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchCharts, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchCharts, autoRefresh, refreshInterval])

  return {
    charts,
    isLoading,
    error,
    refresh,
    updateDateRange,
    exportChart
  }
}

// Hook for real-time chart updates via WebSocket
export function useRealTimeCharts(): UseDashboardChartsReturn {
  const [charts, setCharts] = useState<DashboardCharts | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // In a real implementation, this would connect to WebSocket
    // const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL)
    // 
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data)
    //   if (data.type === 'charts_updated') {
    //     setCharts(data.payload)
    //   }
    // }
    //
    // ws.onerror = (error) => {
    //   setError(new Error('WebSocket connection failed'))
    // }
    //
    // return () => ws.close()

    // Mock real-time updates
    const interval = setInterval(() => {
      setCharts(generateChartData('30d'))
      setIsLoading(false)
    }, 10000) // Update every 10 seconds

    // Initial load
    setTimeout(() => {
      setCharts(generateChartData('30d'))
      setIsLoading(false)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const refresh = async (): Promise<void> => {
    setIsLoading(true)
    setTimeout(() => {
      setCharts(generateChartData('30d'))
      setIsLoading(false)
    }, 500)
  }

  const updateDateRange = (range: string): void => {
    setIsLoading(true)
    setTimeout(() => {
      setCharts(generateChartData(range))
      setIsLoading(false)
    }, 500)
  }

  const exportChart = async (chartType: keyof DashboardCharts, format: 'png' | 'pdf'): Promise<void> => {
    console.log(`Exporting ${chartType} as ${format}`)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return {
    charts,
    isLoading,
    error,
    refresh,
    updateDateRange,
    exportChart
  }
}