"use client"

import * as React from "react"
import { useActionHistory } from "@/providers/action-history-provider"
import { Contato, Processo } from "@/types"

interface BulkOperationOptions {
  entityType: 'contatos' | 'processos'
  onStatusUpdate?: (ids: string[], status: any, previousStates: any[]) => Promise<void>
  onDelete?: (ids: string[], previousStates: any[]) => Promise<void>
  onTagAssignment?: (ids: string[], tags: string[], previousStates: any[]) => Promise<void>
  onAdvogadoAssignment?: (ids: string[], advogadoId: string, previousStates: any[]) => Promise<void>
  onPrazoUpdate?: (ids: string[], prazos: any[], previousStates: any[]) => Promise<void>
  onArchive?: (ids: string[], previousStates: any[]) => Promise<void>
  onRestore?: (ids: string[], states: any[]) => Promise<void>
}

export function useBulkOperations(options: BulkOperationOptions) {
  const { addAction } = useActionHistory()
  const [isLoading, setIsLoading] = React.useState(false)

  const executeWithHistory = React.useCallback(async <T>(
    operation: () => Promise<T>,
    actionType: string,
    description: string,
    entityIds: string[],
    previousStates: any[],
    reverseAction: () => Promise<void>,
    canUndo: boolean = true
  ): Promise<T> => {
    setIsLoading(true)
    
    try {
      const result = await operation()
      
      // Add to action history
      addAction({
        type: actionType as any,
        description,
        data: {
          entityType: options.entityType,
          entityIds,
          previousState: previousStates,
          newState: null, // Will be set by the specific operation
          reverseAction,
        },
        canUndo,
      })
      
      return result
    } finally {
      setIsLoading(false)
    }
  }, [addAction, options.entityType])

  const bulkStatusUpdate = React.useCallback(async (
    items: (Contato | Processo)[],
    newStatus: any
  ) => {
    if (!options.onStatusUpdate) {
      throw new Error('onStatusUpdate handler not provided')
    }

    const entityIds = items.map(item => item.id)
    const previousStates = items.map(item => ({ id: item.id, status: item.status }))
    
    const reverseAction = async () => {
      // Restore previous statuses
      for (const prevState of previousStates) {
        await options.onStatusUpdate!([prevState.id], prevState.status, [prevState])
      }
    }

    return executeWithHistory(
      () => options.onStatusUpdate!(entityIds, newStatus, previousStates),
      'bulk_status_update',
      `Status alterado para "${newStatus}" em ${entityIds.length} ${options.entityType}`,
      entityIds,
      previousStates,
      reverseAction
    )
  }, [options.onStatusUpdate, options.entityType, executeWithHistory])

  const bulkDelete = React.useCallback(async (
    items: (Contato | Processo)[]
  ) => {
    if (!options.onDelete || !options.onRestore) {
      throw new Error('onDelete and onRestore handlers not provided')
    }

    const entityIds = items.map(item => item.id)
    const previousStates = items.map(item => ({ ...item }))
    
    const reverseAction = async () => {
      // Restore deleted items
      await options.onRestore!(entityIds, previousStates)
    }

    return executeWithHistory(
      () => options.onDelete!(entityIds, previousStates),
      'bulk_delete',
      `${entityIds.length} ${options.entityType} excluído${entityIds.length > 1 ? 's' : ''}`,
      entityIds,
      previousStates,
      reverseAction
    )
  }, [options.onDelete, options.onRestore, options.entityType, executeWithHistory])

  const bulkTagAssignment = React.useCallback(async (
    items: (Contato | Processo)[],
    tags: string[]
  ) => {
    if (!options.onTagAssignment) {
      throw new Error('onTagAssignment handler not provided')
    }

    const entityIds = items.map(item => item.id)
    const previousStates = items.map(item => ({ 
      id: item.id, 
      tags: (item as any).tags || [] 
    }))
    
    const reverseAction = async () => {
      // Restore previous tags
      for (const prevState of previousStates) {
        await options.onTagAssignment!([prevState.id], prevState.tags, [prevState])
      }
    }

    return executeWithHistory(
      () => options.onTagAssignment!(entityIds, tags, previousStates),
      'bulk_tag_assignment',
      `Tags aplicadas a ${entityIds.length} ${options.entityType}`,
      entityIds,
      previousStates,
      reverseAction
    )
  }, [options.onTagAssignment, options.entityType, executeWithHistory])

  const bulkAdvogadoAssignment = React.useCallback(async (
    items: Processo[],
    advogadoId: string
  ) => {
    if (!options.onAdvogadoAssignment) {
      throw new Error('onAdvogadoAssignment handler not provided')
    }

    const entityIds = items.map(item => item.id)
    const previousStates = items.map(item => ({ 
      id: item.id, 
      advogadoResponsavel: item.advogadoResponsavel 
    }))
    
    const reverseAction = async () => {
      // Restore previous advogado assignments
      for (const prevState of previousStates) {
        await options.onAdvogadoAssignment!(
          [prevState.id], 
          prevState.advogadoResponsavel || '', 
          [prevState]
        )
      }
    }

    return executeWithHistory(
      () => options.onAdvogadoAssignment!(entityIds, advogadoId, previousStates),
      'bulk_advogado_assignment',
      `Advogado atribuído a ${entityIds.length} processo${entityIds.length > 1 ? 's' : ''}`,
      entityIds,
      previousStates,
      reverseAction
    )
  }, [options.onAdvogadoAssignment, executeWithHistory])

  const bulkPrazoUpdate = React.useCallback(async (
    items: Processo[],
    prazos: any[]
  ) => {
    if (!options.onPrazoUpdate) {
      throw new Error('onPrazoUpdate handler not provided')
    }

    const entityIds = items.map(item => item.id)
    const previousStates = items.map(item => ({ 
      id: item.id, 
      prazoLimite: item.prazoLimite 
    }))
    
    const reverseAction = async () => {
      // Restore previous prazos
      const previousPrazos = previousStates.map(state => ({
        processoId: state.id,
        prazoLimite: state.prazoLimite,
        descricao: 'Prazo restaurado',
        notificar: false,
        diasAntecedencia: 0,
      }))
      await options.onPrazoUpdate!(entityIds, previousPrazos, previousStates)
    }

    return executeWithHistory(
      () => options.onPrazoUpdate!(entityIds, prazos, previousStates),
      'bulk_prazo_update',
      `Prazos definidos para ${entityIds.length} processo${entityIds.length > 1 ? 's' : ''}`,
      entityIds,
      previousStates,
      reverseAction
    )
  }, [options.onPrazoUpdate, executeWithHistory])

  const bulkArchive = React.useCallback(async (
    items: Processo[]
  ) => {
    if (!options.onArchive) {
      throw new Error('onArchive handler not provided')
    }

    const entityIds = items.map(item => item.id)
    const previousStates = items.map(item => ({ 
      id: item.id, 
      status: item.status 
    }))
    
    const reverseAction = async () => {
      // Restore from archive (change status back)
      for (const prevState of previousStates) {
        await options.onStatusUpdate!([prevState.id], prevState.status, [prevState])
      }
    }

    return executeWithHistory(
      () => options.onArchive!(entityIds, previousStates),
      'bulk_archive',
      `${entityIds.length} processo${entityIds.length > 1 ? 's' : ''} arquivado${entityIds.length > 1 ? 's' : ''}`,
      entityIds,
      previousStates,
      reverseAction,
      !!options.onStatusUpdate // Can only undo if we can restore status
    )
  }, [options.onArchive, options.onStatusUpdate, executeWithHistory])

  return {
    isLoading,
    bulkStatusUpdate,
    bulkDelete,
    bulkTagAssignment,
    bulkAdvogadoAssignment,
    bulkPrazoUpdate,
    bulkArchive,
  }
}