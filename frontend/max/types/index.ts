// Core types for the Advocacia Dashboard

export interface Contato {
  id: string
  nome: string
  telefone: string
  email?: string
  status: 'novo' | 'existente' | 'em_atendimento' | 'finalizado'
  origem: 'whatsapp' | 'manual'
  areaInteresse?: string
  tipoSolicitacao?: 'agendamento' | 'consulta' | 'informacao'
  preferenciaAtendimento?: 'presencial' | 'online'
  primeiroContato: Date
  ultimaInteracao: Date
  mensagensNaoLidas: number
  dadosColetados: {
    clienteType: 'novo' | 'existente'
    practiceArea?: string
    schedulingPreference?: 'presencial' | 'online'
    wantsScheduling?: boolean
    customRequests: string[]
  }
  conversaCompleta: boolean
  atendente?: string
}

export interface ConversaMessage {
  id: string
  contatoId: string
  direction: 'inbound' | 'outbound'
  content: string
  messageType: 'text' | 'interactive' | 'template'
  timestamp: Date
  metadata?: Record<string, any>
}

export interface Processo {
  id: string
  numero?: string
  titulo: string
  descricao?: string
  contatoId: string
  contato: {
    nome: string
    telefone: string
  }
  areaJuridica: string
  status: 'novo' | 'em_andamento' | 'aguardando_cliente' | 'finalizado' | 'arquivado'
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  origem: 'whatsapp' | 'manual'
  advogadoResponsavel?: string
  dataAbertura: Date
  dataUltimaAtualizacao: Date
  prazoLimite?: Date
  documentos: ProcessoDocumento[]
  historico: ProcessoHistorico[]
  observacoes?: string
}

export interface ProcessoDocumento {
  id: string
  nome: string
  tipo: string
  url: string
  uploadedAt: Date
  uploadedBy: string
}

export interface ProcessoHistorico {
  id: string
  acao: string
  descricao: string
  usuario: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface DashboardMetrics {
  totalContatos: number
  contatosHoje: number
  processosAtivos: number
  taxaResposta: number
  tempoMedioResposta: string
  satisfacaoCliente: number
}

export interface ChartDataPoint {
  date: string
  contatos: number
  processos: number
  conversas: number
}

export interface ActivityItem {
  id: string
  tipo: string
  descricao: string
  contato: string
  telefone: string
  timestamp: Date
}

// Filter types
export interface ContatosFilters {
  status?: string
  origem?: string
  dataInicio?: string
  dataFim?: string
  search?: string
}

export interface ProcessosFilters {
  status?: string
  areaJuridica?: string
  prioridade?: string
  advogado?: string
  search?: string
}

// API Response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  pages: number
}

// Authentication types
export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'recepcionista' | 'advogado'
  avatar?: string
}

// WebSocket event types
export interface WebSocketEvents {
  novo_contato: Contato
  contato_atualizado: Contato
  processo_atualizado: Processo
  nova_mensagem: ConversaMessage
  metrics_updated: DashboardMetrics
}