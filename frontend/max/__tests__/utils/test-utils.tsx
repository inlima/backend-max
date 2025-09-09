import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from 'next-themes'
import { WebSocketProvider } from '@/providers/websocket-provider'

// Mock WebSocket provider for testing
const MockWebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const mockContextValue = {
    socket: null,
    isConnected: false,
    connectionStatus: 'disconnected' as const,
  }

  return (
    <div data-testid="mock-websocket-provider">
      {children}
    </div>
  )
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MockWebSocketProvider>
        {children}
      </MockWebSocketProvider>
    </ThemeProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Mock data generators
export const mockContato = {
  id: '1',
  nome: 'João Silva',
  telefone: '+5511999999999',
  email: 'joao@email.com',
  status: 'novo' as const,
  origem: 'whatsapp' as const,
  areaInteresse: 'Direito Civil',
  tipoSolicitacao: 'consulta' as const,
  preferenciaAtendimento: 'presencial' as const,
  primeiroContato: new Date('2024-01-15T10:00:00Z'),
  ultimaInteracao: new Date('2024-01-15T10:30:00Z'),
  mensagensNaoLidas: 2,
  dadosColetados: {
    clienteType: 'novo' as const,
    practiceArea: 'Direito Civil',
    schedulingPreference: 'presencial' as const,
    wantsScheduling: true,
    customRequests: ['Consulta sobre divórcio'],
  },
  conversaCompleta: false,
  atendente: 'Maria Santos',
}

export const mockProcesso = {
  id: '1',
  numero: '1234567-89.2024.8.26.0001',
  titulo: 'Ação de Divórcio',
  descricao: 'Processo de divórcio consensual',
  contatoId: '1',
  contato: {
    nome: 'João Silva',
    telefone: '+5511999999999',
  },
  areaJuridica: 'Direito de Família',
  status: 'em_andamento' as const,
  prioridade: 'media' as const,
  origem: 'whatsapp' as const,
  advogadoResponsavel: 'Dr. Carlos Oliveira',
  dataAbertura: new Date('2024-01-15T09:00:00Z'),
  dataUltimaAtualizacao: new Date('2024-01-20T14:30:00Z'),
  prazoLimite: new Date('2024-03-15T23:59:59Z'),
  documentos: [],
  historico: [],
  observacoes: 'Cliente solicitou urgência no processo',
}

export const mockDashboardMetrics = {
  totalContatos: 150,
  contatosHoje: 12,
  processosAtivos: 45,
  taxaResposta: 85,
  tempoMedioResposta: '2h 30min',
  satisfacaoCliente: 4.2,
}

export const mockChartData = [
  { date: '2024-01-01', contatos: 10, processos: 5 },
  { date: '2024-01-02', contatos: 15, processos: 8 },
  { date: '2024-01-03', contatos: 12, processos: 6 },
  { date: '2024-01-04', contatos: 18, processos: 10 },
  { date: '2024-01-05', contatos: 20, processos: 12 },
]