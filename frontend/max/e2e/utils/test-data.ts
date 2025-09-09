// Test data generators for E2E tests

export const testContatos = {
  novo: {
    nome: 'João Silva E2E',
    telefone: '+5511999999999',
    email: 'joao.e2e@example.com',
    areaInteresse: 'Direito Civil',
    tipoSolicitacao: 'consulta' as const,
    preferenciaAtendimento: 'presencial' as const,
  },
  existente: {
    nome: 'Maria Santos E2E',
    telefone: '+5511888888888',
    email: 'maria.e2e@example.com',
    areaInteresse: 'Direito Trabalhista',
    tipoSolicitacao: 'agendamento' as const,
    preferenciaAtendimento: 'online' as const,
  },
}

export const testProcessos = {
  novo: {
    titulo: 'Ação de Divórcio E2E',
    descricao: 'Processo de divórcio consensual para teste E2E',
    areaJuridica: 'Direito de Família',
    prioridade: 'media' as const,
    observacoes: 'Processo criado para teste automatizado',
  },
  trabalhista: {
    titulo: 'Ação Trabalhista E2E',
    descricao: 'Reclamação trabalhista para teste E2E',
    areaJuridica: 'Direito Trabalhista',
    prioridade: 'alta' as const,
    observacoes: 'Urgente - prazo de 30 dias',
  },
}

export const testCredentials = {
  admin: {
    email: 'admin@advocacia.com',
    password: 'admin123',
  },
  recepcionista: {
    email: 'recepcao@advocacia.com',
    password: 'recepcao123',
  },
  advogado: {
    email: 'advogado@advocacia.com',
    password: 'advogado123',
  },
}

export const mockDashboardData = {
  metrics: {
    totalContatos: 150,
    contatosHoje: 12,
    processosAtivos: 45,
    taxaResposta: 85,
    tempoMedioResposta: '2h 30min',
    satisfacaoCliente: 4.2,
  },
  chartData: [
    { date: '2024-01-01', contatos: 10, processos: 5 },
    { date: '2024-01-02', contatos: 15, processos: 8 },
    { date: '2024-01-03', contatos: 12, processos: 6 },
    { date: '2024-01-04', contatos: 18, processos: 10 },
    { date: '2024-01-05', contatos: 20, processos: 12 },
  ],
}

// Helper functions for generating random test data
export function generateRandomContato() {
  const names = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Ferreira']
  const areas = ['Direito Civil', 'Direito Trabalhista', 'Direito de Família', 'Direito Criminal']
  const tipos = ['consulta', 'agendamento', 'informacao'] as const
  const preferencias = ['presencial', 'online'] as const
  
  const randomName = names[Math.floor(Math.random() * names.length)]
  const randomPhone = `+5511${Math.floor(Math.random() * 900000000) + 100000000}`
  
  return {
    nome: `${randomName} ${Date.now()}`,
    telefone: randomPhone,
    email: `${randomName.toLowerCase().replace(' ', '.')}@example.com`,
    areaInteresse: areas[Math.floor(Math.random() * areas.length)],
    tipoSolicitacao: tipos[Math.floor(Math.random() * tipos.length)],
    preferenciaAtendimento: preferencias[Math.floor(Math.random() * preferencias.length)],
  }
}

export function generateRandomProcesso() {
  const titulos = ['Ação de Divórcio', 'Reclamação Trabalhista', 'Ação de Cobrança', 'Inventário']
  const areas = ['Direito de Família', 'Direito Trabalhista', 'Direito Civil', 'Direito Sucessório']
  const prioridades = ['baixa', 'media', 'alta', 'urgente'] as const
  
  const randomTitulo = titulos[Math.floor(Math.random() * titulos.length)]
  
  return {
    titulo: `${randomTitulo} ${Date.now()}`,
    descricao: `Descrição do processo ${randomTitulo} criado automaticamente para teste`,
    areaJuridica: areas[Math.floor(Math.random() * areas.length)],
    prioridade: prioridades[Math.floor(Math.random() * prioridades.length)],
    observacoes: 'Processo criado automaticamente para teste E2E',
  }
}