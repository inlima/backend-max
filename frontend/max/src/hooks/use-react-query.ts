import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/react-query'
import { apiClient } from '@/lib/api-client'
import type {
  Contato,
  Processo,
  DashboardMetrics,
  ContatosFilters,
  ProcessosFilters,
} from '@/types'

// Contatos hooks
export function useContatos(filters: ContatosFilters = {}) {
  return useQuery({
    queryKey: queryKeys.contatos.list(filters),
    queryFn: () => apiClient.getContatos(filters),
  })
}

export function useContato(id: string) {
  return useQuery({
    queryKey: queryKeys.contatos.detail(id),
    queryFn: () => apiClient.getContato(id),
    enabled: !!id,
  })
}

export function useContatoConversations(id: string) {
  return useQuery({
    queryKey: queryKeys.contatos.conversations(id),
    queryFn: () => apiClient.getContatoConversations(id),
    enabled: !!id,
  })
}

export function useContatoProcesses(id: string) {
  return useQuery({
    queryKey: queryKeys.contatos.processes(id),
    queryFn: () => apiClient.getContatoProcesses(id),
    enabled: !!id,
  })
}

export function useCreateContato() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Partial<Contato>) => apiClient.createContato(data),
    onSuccess: () => {
      // Invalidate and refetch contatos list
      queryClient.invalidateQueries({ queryKey: queryKeys.contatos.lists() })
      // Invalidate dashboard metrics
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics() })
    },
  })
}

export function useUpdateContato() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contato> }) =>
      apiClient.updateContato(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate specific contato
      queryClient.invalidateQueries({ queryKey: queryKeys.contatos.detail(id) })
      // Invalidate contatos list
      queryClient.invalidateQueries({ queryKey: queryKeys.contatos.lists() })
    },
  })
}

export function useDeleteContato() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteContato(id),
    onSuccess: () => {
      // Invalidate contatos list
      queryClient.invalidateQueries({ queryKey: queryKeys.contatos.lists() })
      // Invalidate dashboard metrics
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics() })
    },
  })
}

// Processos hooks
export function useProcessos(filters: ProcessosFilters = {}) {
  return useQuery({
    queryKey: queryKeys.processos.list(filters),
    queryFn: () => apiClient.getProcessos(filters),
  })
}

export function useProcesso(id: string) {
  return useQuery({
    queryKey: queryKeys.processos.detail(id),
    queryFn: () => apiClient.getProcesso(id),
    enabled: !!id,
  })
}

export function useProcessoTimeline(id: string) {
  return useQuery({
    queryKey: queryKeys.processos.timeline(id),
    queryFn: () => apiClient.getProcessoTimeline(id),
    enabled: !!id,
  })
}

export function useProcessoDocuments(id: string) {
  return useQuery({
    queryKey: queryKeys.processos.documents(id),
    queryFn: () => apiClient.getProcessoDocuments(id),
    enabled: !!id,
  })
}

export function useCreateProcesso() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Partial<Processo>) => apiClient.createProcesso(data),
    onSuccess: () => {
      // Invalidate processos list
      queryClient.invalidateQueries({ queryKey: queryKeys.processos.lists() })
      // Invalidate dashboard metrics
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.metrics() })
    },
  })
}

export function useUpdateProcesso() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Processo> }) =>
      apiClient.updateProcesso(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate specific processo
      queryClient.invalidateQueries({ queryKey: queryKeys.processos.detail(id) })
      // Invalidate processos list
      queryClient.invalidateQueries({ queryKey: queryKeys.processos.lists() })
    },
  })
}

// Dashboard hooks
export function useDashboardMetrics() {
  return useQuery({
    queryKey: queryKeys.dashboard.metrics(),
    queryFn: () => apiClient.getDashboardMetrics(),
    // Refetch every 30 seconds for real-time metrics
    refetchInterval: 30000,
  })
}

export function useDashboardCharts(dateRange?: { start: Date; end: Date }) {
  return useQuery({
    queryKey: queryKeys.dashboard.charts(),
    queryFn: () => apiClient.getDashboardCharts(dateRange),
  })
}

export function useActivityFeed() {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(),
    queryFn: () => apiClient.getActivityFeed(),
    // Refetch every 10 seconds for real-time activity
    refetchInterval: 10000,
  })
}