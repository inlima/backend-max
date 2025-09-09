import useSWR, { mutate } from 'swr'
import { useState } from 'react'
import { apiClient, ApiError } from '@/lib/api-client'
import { 
  Contato, 
  Processo, 
  DashboardMetrics, 
  ConversaMessage,
  ContatosFilters,
  ProcessosFilters,
  User,
  LoginCredentials,
  AuthResponse
} from '@/types'

// Enhanced hook return type with loading states and error handling
interface ApiHookResult<T> {
  data: T | undefined
  error: ApiError | Error | undefined
  isLoading: boolean
  isValidating: boolean
  mutate: () => Promise<T | undefined>
}

// Enhanced mutation hook result
interface MutationResult<T> {
  trigger: (data?: any) => Promise<T>
  isMutating: boolean
  error: ApiError | Error | undefined
}

// Authentication hooks
export function useAuth() {
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loginError, setLoginError] = useState<ApiError | null>(null)

  const { data: user, error, mutate: mutateUser } = useSWR(
    'current-user',
    () => apiClient.getCurrentUser(),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      onError: (err) => {
        // Don't treat 401 as an error for auth check
        if (err.status !== 401) {
          console.error('Auth check error:', err)
        }
      }
    }
  )

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    setIsLoggingIn(true)
    setLoginError(null)
    
    try {
      const response = await apiClient.login(credentials)
      await mutateUser(response.user)
      return response
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('Login failed', 0)
      setLoginError(apiError)
      throw apiError
    } finally {
      setIsLoggingIn(false)
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout()
    } finally {
      await mutateUser(undefined, false)
    }
  }

  return {
    user,
    isAuthenticated: !!user,
    isLoading: !user && !error,
    login,
    logout,
    isLoggingIn,
    loginError,
    mutateUser
  }
}

// Dashboard hooks
export function useDashboardMetrics(): ApiHookResult<DashboardMetrics> {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    'dashboard-metrics', 
    () => apiClient.getDashboardMetrics(), 
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      onError: (err) => {
        console.error('Dashboard metrics error:', err)
      }
    }
  )

  return { data, error, isLoading, isValidating, mutate }
}

export function useDashboardChartData(days: number = 30): ApiHookResult<unknown[]> {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `dashboard-chart-${days}`, 
    () => apiClient.getDashboardChartData(days), 
    {
      refreshInterval: 60000, // Refresh every minute
      onError: (err) => {
        console.error('Dashboard chart data error:', err)
      }
    }
  )

  return { data, error, isLoading, isValidating, mutate }
}

export function useRecentActivity(limit: number = 10): ApiHookResult<unknown[]> {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    `recent-activity-${limit}`, 
    () => apiClient.getRecentActivity(limit), 
    {
      refreshInterval: 15000, // Refresh every 15 seconds
      onError: (err) => {
        console.error('Recent activity error:', err)
      }
    }
  )

  return { data, error, isLoading, isValidating, mutate }
}

// Contatos hooks
export function useContatos(filters?: ContatosFilters): ApiHookResult<any> {
  const key = filters ? `contatos-${JSON.stringify(filters)}` : 'contatos'
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key, 
    () => apiClient.getContatos(filters), 
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      onError: (err) => {
        console.error('Contatos fetch error:', err)
      }
    }
  )

  return { data, error, isLoading, isValidating, mutate }
}

export function useContato(id: string | null): ApiHookResult<Contato> {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    id ? `contato-${id}` : null, 
    () => id ? apiClient.getContato(id) : null, 
    {
      revalidateOnFocus: true,
      onError: (err) => {
        console.error(`Contato ${id} fetch error:`, err)
      }
    }
  )

  return { data, error, isLoading, isValidating, mutate }
}

export function useConversaMessages(contatoId: string | null): ApiHookResult<ConversaMessage[]> {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    contatoId ? `conversa-${contatoId}` : null, 
    () => contatoId ? apiClient.getConversaMessages(contatoId) : null,
    {
      refreshInterval: 5000, // Refresh every 5 seconds for real-time feel
      revalidateOnFocus: true,
      onError: (err) => {
        console.error(`Conversa messages for ${contatoId} fetch error:`, err)
      }
    }
  )

  return { data, error, isLoading, isValidating, mutate }
}

// Contatos mutations
export function useCreateContato(): MutationResult<Contato> {
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const trigger = async (contatoData: Partial<Contato>): Promise<Contato> => {
    setIsMutating(true)
    setError(null)
    
    try {
      const newContato = await apiClient.createContato(contatoData)
      
      // Revalidate contatos list
      await mutate((key) => typeof key === 'string' && key.startsWith('contatos'))
      
      return newContato
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError('Create contato failed', 0)
      setError(apiError)
      throw apiError
    } finally {
      setIsMutating(false)
    }
  }

  return { trigger, isMutating, error }
}

export function useUpdateContato(): MutationResult<Contato> {
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const trigger = async ({ id, ...contatoData }: Partial<Contato> & { id: string }): Promise<Contato> => {
    setIsMutating(true)
    setError(null)
    
    try {
      const updatedContato = await apiClient.updateContato(id, contatoData)
      
      // Revalidate specific contato and contatos list
      await Promise.all([
        mutate(`contato-${id}`),
        mutate((key) => typeof key === 'string' && key.startsWith('contatos'))
      ])
      
      return updatedContato
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError('Update contato failed', 0)
      setError(apiError)
      throw apiError
    } finally {
      setIsMutating(false)
    }
  }

  return { trigger, isMutating, error }
}

// Processos hooks
export function useProcessos(filters?: ProcessosFilters): ApiHookResult<any> {
  const key = filters ? `processos-${JSON.stringify(filters)}` : 'processos'
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key, 
    () => apiClient.getProcessos(filters), 
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      onError: (err) => {
        console.error('Processos fetch error:', err)
      }
    }
  )

  return { data, error, isLoading, isValidating, mutate }
}

export function useProcesso(id: string | null): ApiHookResult<Processo> {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    id ? `processo-${id}` : null, 
    () => id ? apiClient.getProcesso(id) : null, 
    {
      revalidateOnFocus: true,
      onError: (err) => {
        console.error(`Processo ${id} fetch error:`, err)
      }
    }
  )

  return { data, error, isLoading, isValidating, mutate }
}

// Processos mutations
export function useCreateProcesso(): MutationResult<Processo> {
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const trigger = async (processoData: Partial<Processo>): Promise<Processo> => {
    setIsMutating(true)
    setError(null)
    
    try {
      const newProcesso = await apiClient.createProcesso(processoData)
      
      // Revalidate processos list
      await mutate((key) => typeof key === 'string' && key.startsWith('processos'))
      
      return newProcesso
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError('Create processo failed', 0)
      setError(apiError)
      throw apiError
    } finally {
      setIsMutating(false)
    }
  }

  return { trigger, isMutating, error }
}

export function useUpdateProcesso(): MutationResult<Processo> {
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const trigger = async ({ id, ...processoData }: Partial<Processo> & { id: string }): Promise<Processo> => {
    setIsMutating(true)
    setError(null)
    
    try {
      const updatedProcesso = await apiClient.updateProcesso(id, processoData)
      
      // Revalidate specific processo and processos list
      await Promise.all([
        mutate(`processo-${id}`),
        mutate((key) => typeof key === 'string' && key.startsWith('processos'))
      ])
      
      return updatedProcesso
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError('Update processo failed', 0)
      setError(apiError)
      throw apiError
    } finally {
      setIsMutating(false)
    }
  }

  return { trigger, isMutating, error }
}

// Global mutation helpers for cache invalidation
export async function mutateContatos(filters?: ContatosFilters) {
  const key = filters ? `contatos-${JSON.stringify(filters)}` : 'contatos'
  return mutate(key)
}

export async function mutateProcessos(filters?: ProcessosFilters) {
  const key = filters ? `processos-${JSON.stringify(filters)}` : 'processos'
  return mutate(key)
}

export async function mutateDashboard() {
  await Promise.all([
    mutate('dashboard-metrics'),
    mutate((key) => typeof key === 'string' && key.startsWith('dashboard-chart')),
    mutate((key) => typeof key === 'string' && key.startsWith('recent-activity')),
  ])
}

// Utility hook for handling loading states across multiple queries
export function useLoadingState(...hooks: Array<{ isLoading?: boolean; isValidating?: boolean }>) {
  const isLoading = hooks.some(hook => hook.isLoading)
  const isValidating = hooks.some(hook => hook.isValidating)
  
  return { isLoading, isValidating, isIdle: !isLoading && !isValidating }
}

// Utility hook for handling errors across multiple queries
export function useErrorState(...hooks: Array<{ error?: any }>) {
  const errors = hooks.map(hook => hook.error).filter(Boolean)
  const hasError = errors.length > 0
  const firstError = errors[0]
  
  return { hasError, errors, firstError }
}