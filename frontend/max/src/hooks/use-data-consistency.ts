import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  dataConsistencyService, 
  ConsistencyIssue, 
  ConsistencyReport, 
  ValidationRule 
} from '@/lib/data-consistency-service'
import { ContatoEnhanced, ProcessoEnhanced, ConversaMessage } from '@/types'
import { toast } from 'sonner'

export function useDataConsistency() {
  const [issues, setIssues] = useState<ConsistencyIssue[]>([])
  const queryClient = useQueryClient()

  // Subscribe to consistency issues
  useEffect(() => {
    const unsubscribe = dataConsistencyService.subscribe(setIssues)
    return unsubscribe
  }, [])

  // Full consistency check query
  const {
    data: consistencyReport,
    isLoading: isCheckingConsistency,
    error: consistencyError,
    refetch: runConsistencyCheck
  } = useQuery({
    queryKey: ['consistency-check'],
    queryFn: () => dataConsistencyService.runFullConsistencyCheck(),
    enabled: false, // Manual trigger only
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Auto-fix mutation
  const autoFixMutation = useMutation({
    mutationFn: (issueId: string) => dataConsistencyService.autoFixIssue(issueId),
    onSuccess: (success, issueId) => {
      if (success) {
        toast.success('Problema corrigido automaticamente')
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['contatos'] })
        queryClient.invalidateQueries({ queryKey: ['processos'] })
      } else {
        toast.error('Não foi possível corrigir automaticamente')
      }
    },
    onError: (error) => {
      toast.error(`Erro ao corrigir problema: ${error.message}`)
    }
  })

  // Validate entity mutation
  const validateEntityMutation = useMutation({
    mutationFn: ({
      entityType,
      entityId,
      data,
      context
    }: {
      entityType: 'contato' | 'processo' | 'message'
      entityId: string
      data: any
      context?: any
    }) => dataConsistencyService.validateEntity(entityType, entityId, data, context),
    onError: (error) => {
      toast.error(`Erro na validação: ${error.message}`)
    }
  })

  // Helper functions
  const validateEntity = useCallback(async (
    entityType: 'contato' | 'processo' | 'message',
    entityId: string,
    data: any,
    context?: any
  ) => {
    return validateEntityMutation.mutateAsync({ entityType, entityId, data, context })
  }, [validateEntityMutation])

  const autoFixIssue = useCallback((issueId: string) => {
    return autoFixMutation.mutateAsync(issueId)
  }, [autoFixMutation])

  const resolveIssue = useCallback((issueId: string) => {
    dataConsistencyService.resolveIssue(issueId)
    toast.success('Problema marcado como resolvido')
  }, [])

  const clearResolvedIssues = useCallback(() => {
    dataConsistencyService.clearResolvedIssues()
    toast.success('Problemas resolvidos removidos')
  }, [])

  const getIssuesForEntity = useCallback((entityType: string, entityId: string) => {
    return dataConsistencyService.getIssuesForEntity(entityType, entityId)
  }, [])

  const getStatistics = useCallback(() => {
    return dataConsistencyService.getStatistics()
  }, [])

  return {
    // Data
    issues,
    consistencyReport,
    
    // Loading states
    isCheckingConsistency,
    isAutoFixing: autoFixMutation.isPending,
    isValidating: validateEntityMutation.isPending,
    
    // Errors
    consistencyError,
    
    // Actions
    runConsistencyCheck,
    validateEntity,
    autoFixIssue,
    resolveIssue,
    clearResolvedIssues,
    getIssuesForEntity,
    getStatistics
  }
}

// Hook for entity-specific validation
export function useEntityValidation<T>(
  entityType: 'contato' | 'processo' | 'message',
  entityId: string,
  data: T
) {
  const [entityIssues, setEntityIssues] = useState<ConsistencyIssue[]>([])
  const { validateEntity, issues } = useDataConsistency()

  // Filter issues for this specific entity
  useEffect(() => {
    const filtered = issues.filter(
      issue => issue.entityType === entityType && issue.entityId === entityId
    )
    setEntityIssues(filtered)
  }, [issues, entityType, entityId])

  // Validate entity when data changes
  useEffect(() => {
    if (data && entityId) {
      validateEntity(entityType, entityId, data)
    }
  }, [data, entityType, entityId, validateEntity])

  const hasErrors = entityIssues.some(issue => issue.severity === 'error')
  const hasWarnings = entityIssues.some(issue => issue.severity === 'warning')
  const hasIssues = entityIssues.length > 0

  return {
    issues: entityIssues,
    hasErrors,
    hasWarnings,
    hasIssues,
    errorCount: entityIssues.filter(i => i.severity === 'error').length,
    warningCount: entityIssues.filter(i => i.severity === 'warning').length,
    infoCount: entityIssues.filter(i => i.severity === 'info').length
  }
}

// Hook for real-time validation during form editing
export function useFormValidation<T>(
  entityType: 'contato' | 'processo' | 'message',
  initialData?: T
) {
  const [formData, setFormData] = useState<T | undefined>(initialData)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(true)

  const { validateEntity } = useDataConsistency()

  // Validate form data
  const validateForm = useCallback(async (data: T) => {
    if (!data) return

    try {
      const tempId = 'temp_validation'
      const issues = await validateEntity(entityType, tempId, data)
      
      const errors: Record<string, string> = {}
      let hasErrors = false

      issues.forEach(issue => {
        if (issue.severity === 'error' && issue.affectedFields) {
          issue.affectedFields.forEach(field => {
            errors[field] = issue.message
            hasErrors = true
          })
        }
      })

      setValidationErrors(errors)
      setIsValid(!hasErrors)
    } catch (error) {
      console.error('Form validation error:', error)
    }
  }, [entityType, validateEntity])

  // Update form data and validate
  const updateFormData = useCallback((updates: Partial<T>) => {
    const newData = { ...formData, ...updates } as T
    setFormData(newData)
    validateForm(newData)
  }, [formData, validateForm])

  // Set entire form data
  const setFormDataAndValidate = useCallback((data: T) => {
    setFormData(data)
    validateForm(data)
  }, [validateForm])

  // Get error for specific field
  const getFieldError = useCallback((fieldName: string) => {
    return validationErrors[fieldName]
  }, [validationErrors])

  // Check if field has error
  const hasFieldError = useCallback((fieldName: string) => {
    return !!validationErrors[fieldName]
  }, [validationErrors])

  return {
    formData,
    validationErrors,
    isValid,
    updateFormData,
    setFormData: setFormDataAndValidate,
    getFieldError,
    hasFieldError,
    validateForm: () => formData && validateForm(formData)
  }
}

// Hook for consistency monitoring
export function useConsistencyMonitoring() {
  const { issues, getStatistics } = useDataConsistency()
  const [stats, setStats] = useState(getStatistics())

  // Update stats when issues change
  useEffect(() => {
    setStats(getStatistics())
  }, [issues, getStatistics])

  const criticalIssues = issues.filter(issue => issue.severity === 'error')
  const hasCriticalIssues = criticalIssues.length > 0

  return {
    stats,
    criticalIssues,
    hasCriticalIssues,
    totalIssues: issues.length,
    autoFixableCount: issues.filter(i => i.autoFixable).length
  }
}

// Hook for validation rules management
export function useValidationRules() {
  const [rules, setRules] = useState<ValidationRule[]>([])

  useEffect(() => {
    setRules(dataConsistencyService.getRules())
  }, [])

  const addRule = useCallback((rule: ValidationRule) => {
    dataConsistencyService.addRule(rule)
    setRules(dataConsistencyService.getRules())
  }, [])

  const removeRule = useCallback((ruleId: string) => {
    dataConsistencyService.removeRule(ruleId)
    setRules(dataConsistencyService.getRules())
  }, [])

  const getRulesForEntity = useCallback((entityType: 'contato' | 'processo' | 'message' | 'relationship') => {
    return dataConsistencyService.getRulesForEntity(entityType)
  }, [])

  return {
    rules,
    addRule,
    removeRule,
    getRulesForEntity
  }
}