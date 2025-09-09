'use client'

import React, { useState } from 'react'
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/loading/loading-indicators'
import { FormValidationSummary, ServerErrorDisplay, FormProgress } from './form-validation'
import { FormErrorBoundary } from '@/components/error-boundaries/form-error-boundary'
import { notifications } from '@/lib/toast-notifications'
import { cn } from '@/lib/utils'

interface EnhancedFormProps<T extends Record<string, any>> {
  schema: z.ZodSchema<T>
  onSubmit: (data: T) => Promise<void> | void
  defaultValues?: Partial<T>
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  showProgress?: boolean
  showValidationSummary?: boolean
  submitButtonText?: string
  cancelButtonText?: string
  onCancel?: () => void
  disabled?: boolean
  autoSave?: boolean
  autoSaveInterval?: number
  formName?: string
}

export function EnhancedForm<T extends Record<string, any>>({
  schema,
  onSubmit,
  defaultValues,
  title,
  description,
  children,
  className,
  showProgress = false,
  showValidationSummary = true,
  submitButtonText = 'Salvar',
  cancelButtonText = 'Cancelar',
  onCancel,
  disabled = false,
  autoSave = false,
  autoSaveInterval = 30000, // 30 seconds
  formName = 'form'
}: EnhancedFormProps<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const methods = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
    mode: 'onChange'
  })

  const { handleSubmit, watch, formState: { isDirty, isValid } } = methods

  // Auto-save functionality
  React.useEffect(() => {
    if (!autoSave || !isDirty) return

    const interval = setInterval(() => {
      const currentData = methods.getValues()
      try {
        localStorage.setItem(`${formName}_draft`, JSON.stringify(currentData))
        setLastSaved(new Date())
        notifications.info('Rascunho salvo automaticamente', { duration: 2000 })
      } catch (error) {
        console.warn('Failed to auto-save form data:', error)
      }
    }, autoSaveInterval)

    return () => clearInterval(interval)
  }, [autoSave, isDirty, autoSaveInterval, formName, methods])

  // Load draft on mount
  React.useEffect(() => {
    if (!autoSave) return

    try {
      const savedData = localStorage.getItem(`${formName}_draft`)
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        methods.reset(parsedData)
        setLastSaved(new Date())
        notifications.info('Rascunho carregado', { 
          description: 'Dados salvos anteriormente foram restaurados',
          duration: 3000 
        })
      }
    } catch (error) {
      console.warn('Failed to load draft data:', error)
    }
  }, [autoSave, formName, methods])

  const onSubmitHandler: SubmitHandler<T> = async (data) => {
    setIsSubmitting(true)
    setServerError(null)

    try {
      await onSubmit(data)
      
      // Clear draft after successful submission
      if (autoSave) {
        localStorage.removeItem(`${formName}_draft`)
      }
      
      notifications.formSaved(title || 'Formulário')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setServerError(errorMessage)
      notifications.formError(title || 'Formulário', errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetry = () => {
    setServerError(null)
    handleSubmit(onSubmitHandler)()
  }

  const handleSaveFormData = (data: Record<string, any>) => {
    try {
      localStorage.setItem(`${formName}_backup`, JSON.stringify(data))
      notifications.success('Dados salvos para recuperação', {
        description: 'Seus dados foram preservados e podem ser recuperados'
      })
    } catch (error) {
      console.error('Failed to save form data:', error)
    }
  }

  return (
    <FormErrorBoundary 
      onSaveFormData={handleSaveFormData}
      formName={formName}
    >
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmitHandler)} className={cn('space-y-6', className)}>
          {(title || description) && (
            <div className="space-y-2">
              {title && <h2 className="text-2xl font-bold">{title}</h2>}
              {description && <p className="text-muted-foreground">{description}</p>}
            </div>
          )}

          {showProgress && (
            <FormProgress />
          )}

          <ServerErrorDisplay 
            error={serverError} 
            onRetry={handleRetry}
          />

          {showValidationSummary && (
            <FormValidationSummary />
          )}

          <div className="space-y-6">
            {children}
          </div>

          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex items-center gap-4">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  {cancelButtonText}
                </Button>
              )}
              
              {autoSave && lastSaved && (
                <span className="text-xs text-muted-foreground">
                  Último salvamento: {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={disabled || isSubmitting || !isValid}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Salvando...
                </>
              ) : (
                submitButtonText
              )}
            </Button>
          </div>
        </form>
      </FormProvider>
    </FormErrorBoundary>
  )
}

// Specialized form for Contatos
interface ContatoFormProps {
  onSubmit: (data: any) => Promise<void>
  defaultValues?: any
  onCancel?: () => void
  className?: string
}

export function ContatoForm({ onSubmit, defaultValues, onCancel, className }: ContatoFormProps) {
  // Import the schema dynamically to avoid circular dependencies
  const ContatoSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
    telefone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Formato de telefone inválido'),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    status: z.enum(['novo', 'existente', 'em_atendimento', 'finalizado']),
    origem: z.enum(['whatsapp', 'manual']),
    areaInteresse: z.string().optional(),
    tipoSolicitacao: z.enum(['agendamento', 'consulta', 'informacao']).optional(),
    preferenciaAtendimento: z.enum(['presencial', 'online']).optional(),
  })

  return (
    <EnhancedForm
      schema={ContatoSchema}
      onSubmit={onSubmit}
      defaultValues={defaultValues}
      title="Informações do Contato"
      description="Preencha os dados do contato"
      onCancel={onCancel}
      className={className}
      showProgress={true}
      autoSave={true}
      formName="contato"
    >
      {/* Form fields will be passed as children */}
    </EnhancedForm>
  )
}

// Specialized form for Processos
interface ProcessoFormProps {
  onSubmit: (data: any) => Promise<void>
  defaultValues?: any
  onCancel?: () => void
  className?: string
}

export function ProcessoForm({ onSubmit, defaultValues, onCancel, className }: ProcessoFormProps) {
  const ProcessoSchema = z.object({
    titulo: z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
    descricao: z.string().max(1000, 'Descrição deve ter no máximo 1000 caracteres').optional(),
    contatoId: z.string().uuid('Selecione um contato válido'),
    areaJuridica: z.string().min(1, 'Área jurídica é obrigatória'),
    status: z.enum(['novo', 'em_andamento', 'aguardando_cliente', 'finalizado', 'arquivado']),
    prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']),
    origem: z.enum(['whatsapp', 'manual']),
    advogadoResponsavel: z.string().optional(),
    prazoLimite: z.string().optional(), // Date as string
    observacoes: z.string().max(2000, 'Observações devem ter no máximo 2000 caracteres').optional()
  })

  return (
    <EnhancedForm
      schema={ProcessoSchema}
      onSubmit={onSubmit}
      defaultValues={defaultValues}
      title="Informações do Processo"
      description="Preencha os dados do processo jurídico"
      onCancel={onCancel}
      className={className}
      showProgress={true}
      autoSave={true}
      formName="processo"
    >
      {/* Form fields will be passed as children */}
    </EnhancedForm>
  )
}