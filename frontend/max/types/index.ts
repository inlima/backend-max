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

// Enhanced Contato type for new features
export interface ContatoEnhanced extends Contato {
  endereco?: EnderecoCompleto
  tags: string[]
  favorito: boolean
  fonte: string
  valorPotencial?: number
  probabilidadeConversao?: number
  ultimaInteracaoDetalhes: {
    tipo: string
    canal: string
    assunto: string
  }
  metricas: {
    totalInteracoes: number
    tempoMedioResposta: number
    satisfacao?: number
  }
}

export interface EnderecoCompleto {
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
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

// Enhanced Processo type for new features
export interface ProcessoEnhanced extends Processo {
  cliente: ContatoBasico
  valor?: ProcessoValor
  prazos: ProcessoPrazo[]
  equipe: ProcessoEquipe[]
  tags: string[]
  anexos: ProcessoAnexo[]
  custos: ProcessoCusto[]
}

export interface ContatoBasico {
  id: string
  nome: string
  telefone: string
  email?: string
}

export interface ProcessoValor {
  honorarios: number
  custas: number
  total: number
  formaPagamento: string
  parcelas?: number
}

export interface ProcessoPrazo {
  id: string
  descricao: string
  dataLimite: Date
  concluido: boolean
  responsavel: string
}

export interface ProcessoEquipe {
  id: string
  nome: string
  papel: 'advogado' | 'estagiario' | 'assistente'
  responsabilidades: string[]
}

export interface ProcessoAnexo {
  id: string
  nome: string
  tipo: string
  tamanho: number
  url: string
  categoria: string
  uploadedAt: Date
  uploadedBy: string
}

export interface ProcessoCusto {
  id: string
  descricao: string
  valor: number
  categoria: 'custas' | 'honorarios' | 'despesas'
  data: Date
  comprovante?: string
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

// Enhanced Dashboard types
export interface DashboardMetricsEnhanced extends DashboardMetrics {
  crescimentoContatos: number
  crescimentoProcessos: number
  taxaConversao: number
  receitaMensal: number
  projecaoReceita: number
  tempoMedioResolucao: number
  npsScore: number
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'heatmap'
  data: ChartDataPoint[]
  options: ChartOptions
  responsive: boolean
}

export interface ChartOptions {
  title?: string
  xAxis?: string
  yAxis?: string
  colors?: string[]
  legend?: boolean
  grid?: boolean
}

export interface DashboardCharts {
  conversasTimeline: ChartConfig
  processosDistribution: ChartConfig
  conversionFunnel: ChartConfig
  activityHeatmap: ChartConfig
  revenueProjection: ChartConfig
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

// Enhanced Activity Feed types
export interface ActivityFeedItem {
  id: string
  type: 'contato' | 'processo' | 'mensagem' | 'documento'
  action: string
  description: string
  user: string
  timestamp: Date
  metadata: Record<string, any>
}

export interface TimelineEvent {
  id: string
  tipo: 'criacao' | 'atualizacao' | 'documento' | 'prazo' | 'anotacao'
  titulo: string
  descricao: string
  usuario: string
  timestamp: Date
  metadata?: Record<string, any>
}

// Filter types
export interface ContatosFilters {
  status?: string
  origem?: string
  areaInteresse?: string
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

// Configuration types
export interface ProfileSettings {
  nome: string
  email: string
  telefone: string
  oab: string
  especialidades: string[]
  avatar?: File
  assinatura: string
}

export interface NotificationSettings {
  email: {
    novoContato: boolean
    processoAtualizado: boolean
    prazoProximo: boolean
    mensagemRecebida: boolean
  }
  push: {
    novoContato: boolean
    processoAtualizado: boolean
    prazoProximo: boolean
  }
  whatsapp: {
    horarioFuncionamento: {
      inicio: string
      fim: string
      diasSemana: number[]
    }
    mensagemAutomatica: boolean
    respostaRapida: string[]
  }
}

export interface WhatsAppSettings {
  token: string
  webhookUrl: string
  phoneNumberId: string
  businessAccountId: string
  templates: MessageTemplate[]
  autoResponses: AutoResponse[]
}

export interface MessageTemplate {
  id: string
  nome: string
  categoria: string
  conteudo: string
  variaveis: string[]
}

export interface AutoResponse {
  id: string
  trigger: string
  response: string
  active: boolean
}

export interface SystemSettings {
  tema: 'light' | 'dark' | 'auto'
  idioma: string
  timezone: string
  formatoData: string
  formatoHora: string
  backup: {
    automatico: boolean
    frequencia: 'diario' | 'semanal' | 'mensal'
    retencao: number
  }
}

// Form types
export interface ContatoFormData {
  nome: string
  telefone: string
  email?: string
  endereco?: EnderecoCompleto
  areaInteresse: string[]
  observacoes?: string
  tags: string[]
  favorito: boolean
}

export interface ProcessoFormData {
  titulo: string
  numero?: string
  descricao?: string
  contatoId: string
  areaJuridica: string
  status: ProcessoEnhanced['status']
  prioridade: ProcessoEnhanced['prioridade']
  advogadoResponsavel?: string
  prazoLimite?: Date
  observacoes?: string
  tags: string[]
}

// Error handling types
export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: any // Using any instead of ErrorInfo to avoid React import in types
}

export interface ApiErrorHandler {
  handleNetworkError: (error: Error) => void
  handleValidationError: (errors: ValidationError[]) => void
  handleAuthError: (error: AuthError) => void
  handleServerError: (error: ServerError) => void
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface AuthError extends Error {
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'TOKEN_EXPIRED'
}

export interface ServerError extends Error {
  code: 'INTERNAL_ERROR' | 'SERVICE_UNAVAILABLE' | 'TIMEOUT'
  statusCode: number
}

// WebSocket event types
export interface WebSocketEvents {
  novo_contato: Contato
  contato_atualizado: Contato
  processo_atualizado: Processo
  nova_mensagem: ConversaMessage
  metrics_updated: DashboardMetrics
}