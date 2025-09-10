import { useEffect, useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocket } from '@/providers/websocket-provider'
import { realtimeSyncService, OptimisticUpdate, SyncEvent } from '@/lib/realtime-sync-service'
import { Contato, Processo, ConversaMessage } from '@/types'

export function useRealtimeSync(userId?: string) {
  const { socket, isConnected } = useWebSocket()
  const queryClient = useQueryClient()
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate[]>([])
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([])

  // Initialize the sync service when socket connects
  useEffect(() => {
    if (socket && isConnected && userId) {
      realtimeSyncService.initialize(socket, queryClient, userId)
    }

    return () => {
      if (!isConnected) {
        realtimeSyncService.disconnect()
      }
    }
  }, [socket, isConnected, queryClient, userId])

  // Subscribe to sync events
  useEffect(() => {
    const unsubscribe = realtimeSyncService.subscribe((event: SyncEvent) => {
      setSyncEvents(prev => [event, ...prev.slice(0, 49)]) // Keep last 50 events
    })

    return unsubscribe
  }, [])

  // Update pending updates state
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingUpdates(realtimeSyncService.getPendingUpdates())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Optimistic update functions
  const createContatoOptimistically = useCallback((contato: Partial<Contato>) => {
    const tempId = `temp_${Date.now()}`
    const fullContato = {
      id: tempId,
      nome: '',
      telefone: '',
      status: 'novo' as const,
      origem: 'manual' as const,
      primeiroContato: new Date(),
      ultimaInteracao: new Date(),
      mensagensNaoLidas: 0,
      dadosColetados: {
        clienteType: 'novo' as const,
        customRequests: []
      },
      conversaCompleta: false,
      ...contato
    }

    return realtimeSyncService.applyOptimisticUpdate(
      'contato',
      tempId,
      'create',
      fullContato,
      () => {
        // Rollback function
        queryClient.setQueryData(['contatos'], (oldData: any) => {
          if (!oldData) return oldData
          if (Array.isArray(oldData)) {
            return oldData.filter(item => item.id !== tempId)
          }
          if (oldData.data && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: oldData.data.filter((item: any) => item.id !== tempId),
              total: Math.max(0, oldData.total - 1)
            }
          }
          return oldData
        })
      }
    )
  }, [queryClient])

  const updateContatoOptimistically = useCallback((id: string, updates: Partial<Contato>) => {
    const originalData = queryClient.getQueryData(['contatos', id])
    
    return realtimeSyncService.applyOptimisticUpdate(
      'contato',
      id,
      'update',
      updates,
      () => {
        // Rollback function
        if (originalData) {
          queryClient.setQueryData(['contatos', id], originalData)
        }
      }
    )
  }, [queryClient])

  const deleteContatoOptimistically = useCallback((id: string) => {
    const originalData = queryClient.getQueryData(['contatos', id])
    
    return realtimeSyncService.applyOptimisticUpdate(
      'contato',
      id,
      'delete',
      null,
      () => {
        // Rollback function
        if (originalData) {
          queryClient.setQueryData(['contatos', id], originalData)
          queryClient.setQueryData(['contatos'], (oldData: any) => {
            if (!oldData) return oldData
            if (Array.isArray(oldData)) {
              return [originalData, ...oldData]
            }
            if (oldData.data && Array.isArray(oldData.data)) {
              return {
                ...oldData,
                data: [originalData, ...oldData.data],
                total: oldData.total + 1
              }
            }
            return oldData
          })
        }
      }
    )
  }, [queryClient])

  const createProcessoOptimistically = useCallback((processo: Partial<Processo>) => {
    const tempId = `temp_${Date.now()}`
    const fullProcesso = {
      id: tempId,
      titulo: '',
      contatoId: '',
      contato: { nome: '', telefone: '' },
      areaJuridica: '',
      status: 'novo' as const,
      prioridade: 'media' as const,
      origem: 'manual' as const,
      dataAbertura: new Date(),
      dataUltimaAtualizacao: new Date(),
      documentos: [],
      historico: [],
      ...processo
    }

    return realtimeSyncService.applyOptimisticUpdate(
      'processo',
      tempId,
      'create',
      fullProcesso,
      () => {
        // Rollback function
        queryClient.setQueryData(['processos'], (oldData: any) => {
          if (!oldData) return oldData
          if (Array.isArray(oldData)) {
            return oldData.filter(item => item.id !== tempId)
          }
          if (oldData.data && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: oldData.data.filter((item: any) => item.id !== tempId),
              total: Math.max(0, oldData.total - 1)
            }
          }
          return oldData
        })
      }
    )
  }, [queryClient])

  const updateProcessoOptimistically = useCallback((id: string, updates: Partial<Processo>) => {
    const originalData = queryClient.getQueryData(['processos', id])
    
    return realtimeSyncService.applyOptimisticUpdate(
      'processo',
      id,
      'update',
      updates,
      () => {
        // Rollback function
        if (originalData) {
          queryClient.setQueryData(['processos', id], originalData)
        }
      }
    )
  }, [queryClient])

  const deleteProcessoOptimistically = useCallback((id: string) => {
    const originalData = queryClient.getQueryData(['processos', id])
    
    return realtimeSyncService.applyOptimisticUpdate(
      'processo',
      id,
      'delete',
      null,
      () => {
        // Rollback function
        if (originalData) {
          queryClient.setQueryData(['processos', id], originalData)
          queryClient.setQueryData(['processos'], (oldData: any) => {
            if (!oldData) return oldData
            if (Array.isArray(oldData)) {
              return [originalData, ...oldData]
            }
            if (oldData.data && Array.isArray(oldData.data)) {
              return {
                ...oldData,
                data: [originalData, ...oldData.data],
                total: oldData.total + 1
              }
            }
            return oldData
          })
        }
      }
    )
  }, [queryClient])

  const sendMessageOptimistically = useCallback((message: Partial<ConversaMessage>) => {
    const tempId = `temp_${Date.now()}`
    const fullMessage = {
      id: tempId,
      contatoId: '',
      direction: 'outbound' as const,
      content: '',
      messageType: 'text' as const,
      timestamp: new Date(),
      ...message
    }

    return realtimeSyncService.applyOptimisticUpdate(
      'message',
      tempId,
      'create',
      fullMessage,
      () => {
        // Rollback function
        queryClient.setQueryData(['messages', message.contatoId], (oldData: any) => {
          if (!oldData) return oldData
          if (Array.isArray(oldData)) {
            return oldData.filter(item => item.id !== tempId)
          }
          return oldData
        })
      }
    )
  }, [queryClient])

  // Conflict resolution
  const resolveConflict = useCallback((
    conflictId: string, 
    resolution: 'local' | 'server' | 'merge', 
    mergedData?: any
  ) => {
    realtimeSyncService.resolveConflict(conflictId, resolution, mergedData)
  }, [])

  // Clear sync history
  const clearSyncEvents = useCallback(() => {
    setSyncEvents([])
  }, [])

  // Get sync statistics
  const getSyncStats = useCallback(() => {
    const now = Date.now()
    const last5Minutes = syncEvents.filter(event => now - event.timestamp < 5 * 60 * 1000)
    const conflicts = syncEvents.filter(event => event.type === 'conflict_detected')
    
    return {
      totalEvents: syncEvents.length,
      recentEvents: last5Minutes.length,
      totalConflicts: conflicts.length,
      pendingUpdatesCount: pendingUpdates.length,
      isConnected,
      lastEventTime: syncEvents[0]?.timestamp
    }
  }, [syncEvents, pendingUpdates, isConnected])

  return {
    // Connection status
    isConnected,
    
    // Optimistic update functions
    createContatoOptimistically,
    updateContatoOptimistically,
    deleteContatoOptimistically,
    createProcessoOptimistically,
    updateProcessoOptimistically,
    deleteProcessoOptimistically,
    sendMessageOptimistically,
    
    // Conflict resolution
    resolveConflict,
    
    // State
    pendingUpdates,
    syncEvents,
    
    // Utilities
    clearSyncEvents,
    getSyncStats
  }
}

// Hook for monitoring sync status
export function useSyncStatus() {
  const { isConnected } = useWebSocket()
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const pending = realtimeSyncService.getPendingUpdates()
      setPendingCount(pending.length)
      
      if (pending.length === 0 && isConnected) {
        setLastSyncTime(Date.now())
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isConnected])

  return {
    isConnected,
    pendingCount,
    lastSyncTime,
    isSynced: isConnected && pendingCount === 0
  }
}

// Hook for conflict management
export function useConflictResolution() {
  const [conflicts, setConflicts] = useState<SyncEvent[]>([])

  useEffect(() => {
    const unsubscribe = realtimeSyncService.subscribe((event: SyncEvent) => {
      if (event.type === 'conflict_detected') {
        setConflicts(prev => [event, ...prev])
      }
    })

    return unsubscribe
  }, [])

  const resolveConflict = useCallback((
    conflictId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: any
  ) => {
    realtimeSyncService.resolveConflict(conflictId, resolution, mergedData)
    
    // Remove resolved conflict from state
    setConflicts(prev => prev.filter(conflict => 
      conflict.data?.conflictId !== conflictId
    ))
  }, [])

  const dismissConflict = useCallback((conflictId: string) => {
    setConflicts(prev => prev.filter(conflict => 
      conflict.data?.conflictId !== conflictId
    ))
  }, [])

  return {
    conflicts,
    resolveConflict,
    dismissConflict,
    hasConflicts: conflicts.length > 0
  }
}