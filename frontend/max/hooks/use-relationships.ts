import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { relationshipsService, Relationship, RelationshipUpdate } from '@/lib/relationships-service'
import { ContatoEnhanced, ProcessoEnhanced } from '@/types'
import { toast } from 'sonner'

export function useRelationships(entityType: 'contato' | 'processo', entityId: string) {
  const queryClient = useQueryClient()

  // Query for relationships
  const {
    data: relationships = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['relationships', entityType, entityId],
    queryFn: () => relationshipsService.getRelationships(entityType, entityId),
    enabled: !!entityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Subscribe to relationship updates
  useEffect(() => {
    const unsubscribe = relationshipsService.subscribe((update: RelationshipUpdate) => {
      // Check if this entity is affected by the update
      const isAffected = 
        (entityType === 'contato' && update.affectedEntities.contatos.includes(entityId)) ||
        (entityType === 'processo' && update.affectedEntities.processos.includes(entityId))

      if (isAffected) {
        // Invalidate and refetch relationships
        queryClient.invalidateQueries({
          queryKey: ['relationships', entityType, entityId]
        })

        // Show notification based on update type
        switch (update.type) {
          case 'created':
            toast.success('Relacionamento criado com sucesso')
            break
          case 'updated':
            toast.success('Relacionamento atualizado com sucesso')
            break
          case 'deleted':
            toast.success('Relacionamento removido com sucesso')
            break
        }
      }
    })

    return unsubscribe
  }, [entityType, entityId, queryClient])

  // Mutation for creating relationships
  const createRelationshipMutation = useMutation({
    mutationFn: ({
      targetType,
      targetId,
      relationshipType,
      metadata
    }: {
      targetType: 'contato' | 'processo'
      targetId: string
      relationshipType: Relationship['relationshipType']
      metadata?: Record<string, any>
    }) => relationshipsService.createRelationship(
      entityType,
      entityId,
      targetType,
      targetId,
      relationshipType,
      metadata
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['relationships']
      })
    },
    onError: (error) => {
      toast.error(`Erro ao criar relacionamento: ${error.message}`)
    }
  })

  // Mutation for updating relationships
  const updateRelationshipMutation = useMutation({
    mutationFn: ({
      relationshipId,
      updates
    }: {
      relationshipId: string
      updates: Partial<Pick<Relationship, 'relationshipType' | 'metadata'>>
    }) => relationshipsService.updateRelationship(relationshipId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['relationships']
      })
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar relacionamento: ${error.message}`)
    }
  })

  // Mutation for deleting relationships
  const deleteRelationshipMutation = useMutation({
    mutationFn: (relationshipId: string) => relationshipsService.deleteRelationship(relationshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['relationships']
      })
    },
    onError: (error) => {
      toast.error(`Erro ao remover relacionamento: ${error.message}`)
    }
  })

  // Helper functions
  const createRelationship = useCallback((
    targetType: 'contato' | 'processo',
    targetId: string,
    relationshipType: Relationship['relationshipType'],
    metadata?: Record<string, any>
  ) => {
    // Validate relationship before creating
    const validation = relationshipsService.validateRelationship(
      entityType,
      entityId,
      targetType,
      targetId,
      relationshipType
    )

    if (!validation.valid) {
      toast.error(validation.error)
      return Promise.reject(new Error(validation.error))
    }

    return createRelationshipMutation.mutateAsync({
      targetType,
      targetId,
      relationshipType,
      metadata
    })
  }, [entityType, entityId, createRelationshipMutation])

  const updateRelationship = useCallback((
    relationshipId: string,
    updates: Partial<Pick<Relationship, 'relationshipType' | 'metadata'>>
  ) => {
    return updateRelationshipMutation.mutateAsync({ relationshipId, updates })
  }, [updateRelationshipMutation])

  const deleteRelationship = useCallback((relationshipId: string) => {
    return deleteRelationshipMutation.mutateAsync(relationshipId)
  }, [deleteRelationshipMutation])

  // Get related entities by type
  const relatedContatos = relationships.filter(rel => rel.targetType === 'contato')
  const relatedProcessos = relationships.filter(rel => rel.targetType === 'processo')

  return {
    relationships,
    relatedContatos,
    relatedProcessos,
    isLoading,
    error,
    refetch,
    createRelationship,
    updateRelationship,
    deleteRelationship,
    isCreating: createRelationshipMutation.isPending,
    isUpdating: updateRelationshipMutation.isPending,
    isDeleting: deleteRelationshipMutation.isPending
  }
}

export function useRelatedContatos(processoId: string) {
  return useQuery({
    queryKey: ['related-contatos', processoId],
    queryFn: () => relationshipsService.getRelatedContatos(processoId),
    enabled: !!processoId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRelatedProcessos(contatoId: string) {
  return useQuery({
    queryKey: ['related-processos', contatoId],
    queryFn: () => relationshipsService.getRelatedProcessos(contatoId),
    enabled: !!contatoId,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePotentialRelationships(entityType: 'contato' | 'processo', entityId: string) {
  return useQuery({
    queryKey: ['potential-relationships', entityType, entityId],
    queryFn: () => relationshipsService.findPotentialRelationships(entityType, entityId),
    enabled: !!entityId,
    staleTime: 10 * 60 * 1000, // 10 minutes - less frequent updates
  })
}

export function useRelationshipStats() {
  return useQuery({
    queryKey: ['relationship-stats'],
    queryFn: () => relationshipsService.getRelationshipStats(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

export function useBulkRelationships() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (relationships: Omit<Relationship, 'id' | 'createdAt' | 'createdBy'>[]) =>
      relationshipsService.bulkCreateRelationships(relationships),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['relationships']
      })
      toast.success('Relacionamentos criados em lote com sucesso')
    },
    onError: (error) => {
      toast.error(`Erro ao criar relacionamentos em lote: ${error.message}`)
    }
  })
}