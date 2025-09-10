import React from 'react'
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import { DashboardChartsSection } from '@/components/dashboard-charts-section'
import { mockChartData } from '../utils/test-utils'

// Mock the chart hooks
jest.mock('@/hooks/use-dashboard-charts', () => ({
  useDashboardCharts: jest.fn(),
}))

jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Cell: () => <div data-testid="cell" />,
}))

const mockUseDashboardCharts = require('@/hooks/use-dashboard-charts').useDashboardCharts

describe('DashboardChartsSection', () => {
  const mockChartsData = {
    conversasTimeline: mockChartData,
    processosDistribution: [
      { name: 'Em Andamento', value: 25, color: '#8884d8' },
      { name: 'Finalizado', value: 15, color: '#82ca9d' },
      { name: 'Aguardando', value: 5, color: '#ffc658' },
    ],
    conversionFunnel: [
      { stage: 'Contatos', value: 100 },
      { stage: 'Qualificados', value: 60 },
      { stage: 'Propostas', value: 30 },
      { stage: 'Fechados', value: 15 },
    ],
    activityHeatmap: [
      { hour: 9, day: 'Segunda', value: 10 },
      { hour: 10, day: 'Segunda', value: 15 },
      { hour: 11, day: 'Segunda', value: 8 },
    ],
  }

  beforeEach(() => {
    mockUseDashboardCharts.mockReturnValue({
      data: mockChartsData,
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders all chart sections correctly', () => {
    render(<DashboardChartsSection />)

    expect(screen.getByText('Evolução de Conversas')).toBeInTheDocument()
    expect(screen.getByText('Distribuição de Processos')).toBeInTheDocument()
    expect(screen.getByText('Funil de Conversão')).toBeInTheDocument()
    expect(screen.getByText('Mapa de Atividade')).toBeInTheDocument()
  })

  it('displays loading state for charts', () => {
    mockUseDashboardCharts.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    })

    render(<DashboardChartsSection />)

    expect(screen.getAllByTestId('chart-skeleton')).toHaveLength(4)
  })

  it('displays error state for charts', () => {
    mockUseDashboardCharts.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch chart data'),
    })

    render(<DashboardChartsSection />)

    expect(screen.getByText('Erro ao carregar gráficos')).toBeInTheDocument()
  })

  it('renders line chart for conversas timeline', () => {
    render(<DashboardChartsSection />)

    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('line')).toBeInTheDocument()
  })

  it('renders pie chart for processos distribution', () => {
    render(<DashboardChartsSection />)

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    expect(screen.getByTestId('pie')).toBeInTheDocument()
  })

  it('allows chart type switching', async () => {
    render(<DashboardChartsSection />)

    const chartTypeButton = screen.getByLabelText('Alterar tipo de gráfico')
    fireEvent.click(chartTypeButton)

    await waitFor(() => {
      expect(screen.getByText('Linha')).toBeInTheDocument()
      expect(screen.getByText('Barra')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Barra'))

    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
  })

  it('handles date range filtering', async () => {
    const mockRefetch = jest.fn()
    mockUseDashboardCharts.mockReturnValue({
      data: mockChartsData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    })

    render(<DashboardChartsSection />)

    const dateRangeButton = screen.getByText('Últimos 30 dias')
    fireEvent.click(dateRangeButton)

    await waitFor(() => {
      expect(screen.getByText('Últimos 7 dias')).toBeInTheDocument()
      expect(screen.getByText('Últimos 90 dias')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Últimos 7 dias'))

    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalledWith({ dateRange: '7d' })
    })
  })

  it('displays chart tooltips on hover', async () => {
    render(<DashboardChartsSection />)

    expect(screen.getAllByTestId('tooltip')).toHaveLength(4)
  })

  it('exports chart data when export button is clicked', async () => {
    const mockExport = jest.fn()
    global.URL.createObjectURL = jest.fn(() => 'mock-url')
    global.URL.revokeObjectURL = jest.fn()

    render(<DashboardChartsSection />)

    const exportButton = screen.getByLabelText('Exportar gráficos')
    fireEvent.click(exportButton)

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalled()
    })
  })

  it('handles empty chart data gracefully', () => {
    mockUseDashboardCharts.mockReturnValue({
      data: {
        conversasTimeline: [],
        processosDistribution: [],
        conversionFunnel: [],
        activityHeatmap: [],
      },
      isLoading: false,
      error: null,
    })

    render(<DashboardChartsSection />)

    expect(screen.getAllByText('Nenhum dado disponível')).toHaveLength(4)
  })
})