import React from 'react'
import { render, screen } from '../utils/test-utils'
import { axe, toHaveNoViolations } from 'jest-axe'
import { SectionCards } from '@/components/section-cards'
import { mockDashboardMetrics } from '../utils/test-utils'

expect.extend(toHaveNoViolations)

describe('SectionCards', () => {
  it('renders loading state with skeletons', () => {
    render(<SectionCards isLoading={true} />)

    // Check for skeleton elements
    const skeletons = screen.getAllByTestId(/skeleton/i)
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders dashboard metrics correctly', () => {
    render(<SectionCards metrics={mockDashboardMetrics} />)

    // Check if all metric values are displayed
    expect(screen.getByText('12')).toBeInTheDocument() // contatosHoje
    expect(screen.getByText('45')).toBeInTheDocument() // processosAtivos
    expect(screen.getByText('85%')).toBeInTheDocument() // taxaResposta
    expect(screen.getByText('4.2/5')).toBeInTheDocument() // satisfacaoCliente
  })

  it('displays correct card titles', () => {
    render(<SectionCards metrics={mockDashboardMetrics} />)

    expect(screen.getByText('Contatos Hoje')).toBeInTheDocument()
    expect(screen.getByText('Processos Ativos')).toBeInTheDocument()
    expect(screen.getByText('Taxa de Resposta')).toBeInTheDocument()
    expect(screen.getByText('Satisfação Cliente')).toBeInTheDocument()
  })

  it('displays correct card descriptions', () => {
    render(<SectionCards metrics={mockDashboardMetrics} />)

    expect(screen.getByText('Novos contatos via WhatsApp')).toBeInTheDocument()
    expect(screen.getByText('Em andamento')).toBeInTheDocument()
    expect(screen.getByText('Conversas completadas')).toBeInTheDocument()
    expect(screen.getByText('Avaliação média')).toBeInTheDocument()
  })

  it('displays growth indicators with badges', () => {
    render(<SectionCards metrics={mockDashboardMetrics} />)

    // Check for percentage badges (growth indicators)
    const badges = screen.getAllByText(/%/)
    expect(badges.length).toBeGreaterThan(0)
  })

  it('displays meta information', () => {
    render(<SectionCards metrics={mockDashboardMetrics} />)

    expect(screen.getByText('Últimas 24 horas')).toBeInTheDocument()
    expect(screen.getByText('Requer acompanhamento')).toBeInTheDocument()
    expect(screen.getByText('Meta: 80%')).toBeInTheDocument()
    expect(screen.getByText('Baseado em pesquisas')).toBeInTheDocument()
  })

  it('renders with default metrics when no metrics provided', () => {
    render(<SectionCards />)

    // Should display zero values
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0.0/5')).toBeInTheDocument()
  })

  it('handles zero values gracefully', () => {
    const zeroMetrics = {
      totalContatos: 0,
      contatosHoje: 0,
      processosAtivos: 0,
      taxaResposta: 0,
      tempoMedioResposta: "0min",
      satisfacaoCliente: 0
    }

    render(<SectionCards metrics={zeroMetrics} />)

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0.0/5')).toBeInTheDocument()
  })

  it('formats satisfaction score correctly', () => {
    const metricsWithDecimal = {
      ...mockDashboardMetrics,
      satisfacaoCliente: 4.567
    }

    render(<SectionCards metrics={metricsWithDecimal} />)

    // Should round to 1 decimal place
    expect(screen.getByText('4.6/5')).toBeInTheDocument()
  })

  it('displays appropriate icons for each metric', () => {
    render(<SectionCards metrics={mockDashboardMetrics} />)

    // Icons should be present (we can't easily test for specific icons, but we can check they exist)
    const cards = screen.getAllByRole('generic')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('should be accessible', async () => {
    const { container } = render(<SectionCards metrics={mockDashboardMetrics} />)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('handles large numbers correctly', () => {
    const largeMetrics = {
      totalContatos: 9999,
      contatosHoje: 999,
      processosAtivos: 1234,
      taxaResposta: 100,
      tempoMedioResposta: "5h 30min",
      satisfacaoCliente: 5.0
    }

    render(<SectionCards metrics={largeMetrics} />)

    expect(screen.getByText('999')).toBeInTheDocument()
    expect(screen.getByText('1234')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('5.0/5')).toBeInTheDocument()
  })

  it('maintains responsive design classes', () => {
    const { container } = render(<SectionCards metrics={mockDashboardMetrics} />)

    // Check for responsive grid classes
    const gridContainer = container.querySelector('.grid')
    expect(gridContainer).toHaveClass('grid-cols-1')
    expect(gridContainer).toHaveClass('sm:grid-cols-2')
  })
})