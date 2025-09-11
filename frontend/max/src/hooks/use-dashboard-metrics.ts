'use client'

import { useState, useEffect } from 'react'
import { DashboardMetricsEnhanced } from '@/types'

interface UseDashboardMetricsOptions {
  refreshInterval?: number
  dateRange?: {
    start: Date
    end: Date
  }
}

interface UseDashboardMetricsReturn {
  metrics: DashboardMetricsEnhanced | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

// Mock data generator for development
function generateMockMetrics(): DashboardMetricsEnhanced {
  const baseDate = new Date()
  const randomVariation = (base: number, variation: number) => 
    base + (Math.random() - 0.5) * variation

  return {
    // Base metrics
    totalContatos: Math.floor(randomVariation(156, 20)),
    contatosHoje: Math.floor(randomVariation(12, 5)),
    processosAtivos: Math.floor(randomVariation(23, 8)),
    taxaResposta: randomVariation(94.5, 10),
    tempoMedioResposta: "2h 15min",
    satisfacaoCliente: randomVariation(4.7, 0.6),
    
    // Enhanced metrics
    crescimentoContatos: randomVariation(15.2, 10),
    crescimentoProcessos: randomVariation(8.7, 15),
    taxaConversao: randomVariation(23.4, 8),
    receitaMensal: randomVariation(45000, 15000),
    projecaoReceita: randomVariation(52000, 18000),
    tempoMedioResolucao: randomVariation(7.2, 2),
    npsScore: Math.floor(randomVariation(72, 20))
  }
}

export function useDashboardMetrics(options: UseDashboardMetricsOptions = {}): UseDashboardMetricsReturn {
  const { refreshInterval = 30000, dateRange } = options
  const [metrics, setMetrics] = useState<DashboardMetricsEnhanced | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchMetrics = async (): Promise<void> => {
    try {
      setError(null)
      
      // In a real implementation, this would be an API call
      // const response = await apiClient.getDashboardMetrics(dateRange)
      // setMetrics(response.data)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Generate mock data
      const mockMetrics = generateMockMetrics()
      setMetrics(mockMetrics)
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch metrics'))
    } finally {
      setIsLoading(false)
    }
  }

  const refresh = async (): Promise<void> => {
    setIsLoading(true)
    await fetchMetrics()
  }

  useEffect(() => {
    fetchMetrics()
  }, [dateRange])

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchMetrics, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, dateRange])

  return {
    metrics,
    isLoading,
    error,
    refresh
  }
}

// Hook for real-time metrics updates via WebSocket
export function useRealTimeDashboardMetrics(): UseDashboardMetricsReturn {
  const [metrics, setMetrics] = useState<DashboardMetricsEnhanced | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // In a real implementation, this would connect to WebSocket
    // const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL)
    // 
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data)
    //   if (data.type === 'metrics_updated') {
    //     setMetrics(data.payload)
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
      setMetrics(generateMockMetrics())
      setIsLoading(false)
    }, 5000)

    // Initial load
    setTimeout(() => {
      setMetrics(generateMockMetrics())
      setIsLoading(false)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const refresh = async (): Promise<void> => {
    setIsLoading(true)
    setTimeout(() => {
      setMetrics(generateMockMetrics())
      setIsLoading(false)
    }, 500)
  }

  return {
    metrics,
    isLoading,
    error,
    refresh
  }
}