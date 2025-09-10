import React from 'react'
import { render, screen, waitFor } from '../utils/test-utils'
import { EnhancedMetricsCards } from '@/components/enhanced-metrics-cards'
import { mockDashboardMetrics } from '../utils/test-utils'

// Mock the API hook
jest.mock('@/hooks/use-dashboard-metrics', () => ({
  useDashboardMetrics: jest.fn(),
}))

const mockUseDashboardMetrics = require('@/hooks/use-dashboard-metrics').useDashboardMetrics

describe('EnhancedMetricsCards', () => {
  beforeEach(() => {
    mockUseDashboardMetrics.mockReturnValue({
      data: mockDashboardMetrics,
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders all metric cards correctly', () => {
    render(<EnhancedMetricsCards />)

    expect(screen.getByText('Total de Contatos')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('Contatos Hoje')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Processos Ativos')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('Taxa de Resposta')).toBeInTheDocument()
    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('displays loading state correctly', () => {
    mockUseDashboardMetrics.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    })

    render(<EnhancedMetricsCards />)

    expect(screen.getAllByTestId('metric-card-skeleton')).toHaveLength(6)
  })

  it('displays error state correctly', () => {
    mockUseDashboardMetrics.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch metrics'),
    })

    render(<EnhancedMetricsCards />)

    expect(screen.getByText('Erro ao carregar métricas')).toBeInTheDocument()
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
  })

  it('shows growth indicators when available', () => {
    const metricsWithGrowth = {
      ...mockDashboardMetrics,
      totalContatosGrowth: 15.5,
      processosAtivosGrowth: -5.2,
    }

    mockUseDashboardMetrics.mockReturnValue({
      data: metricsWithGrowth,
      isLoading: false,
      error: null,
    })

    render(<EnhancedMetricsCards />)

    expect(screen.getByText('+15.5%')).toBeInTheDocument()
    expect(screen.getByText('-5.2%')).toBeInTheDocument()
  })

  it('formats time values correctly', () => {
    render(<EnhancedMetricsCards />)

    expect(screen.getByText('2h 30min')).toBeInTheDocument()
  })

  it('displays satisfaction rating correctly', () => {
    render(<EnhancedMetricsCards />)

    expect(screen.getByText('4.2')).toBeInTheDocument()
    expect(screen.getByText('/5.0')).toBeInTheDocument()
  })

  it('handles missing data gracefully', () => {
    mockUseDashboardMetrics.mockReturnValue({
      data: {
        totalContatos: 0,
        contatosHoje: 0,
        processosAtivos: 0,
        taxaResposta: 0,
      },
      isLoading: false,
      error: null,
    })

    render(<EnhancedMetricsCards />)

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('refreshes data when refresh button is clicked', async () => {
    const mockRefresh = jest.fn()
    mockUseDashboardMetrics.mockReturnValue({
      data: mockDashboardMetrics,
      isLoading: false,
      error: null,
      refetch: mockRefresh,
    })

    render(<EnhancedMetricsCards />)

    const refreshButton = screen.getByLabelText('Atualizar métricas')
    refreshButton.click()

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })
  })
})