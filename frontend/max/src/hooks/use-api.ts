import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

interface UseApiOptions {
  queryKey: any[]
  queryFn: () => Promise<any>
  enabled?: boolean
  staleTime?: number
  cacheTime?: number
}

export function useApi(options: UseApiOptions) {
  const {
    queryKey,
    queryFn,
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
  } = options

  return useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime,
    cacheTime,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

export function useApiMutation(mutationFn: (variables: any) => Promise<any>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => {
      // Invalidate and refetch queries after successful mutation
      queryClient.invalidateQueries()
    },
  })
}