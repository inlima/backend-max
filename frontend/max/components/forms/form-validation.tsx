'use client'

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormValidationSummaryProps {
  className?: string
  showSuccessMessage?: boolean
  successMessage?: string
}

export function FormValidationSummary({ 
  className, 
  showSuccessMessage = false, 
  successMessage = 'Todos os campos estão válidos' 
}: FormValidationSummaryProps) {
  const { formState: { errors, isValid, isSubmitted } } = useFormContext()
  
  const errorEntries = Object.entries(errors)
  const hasErrors = errorEntries.length > 0

  if (!isSubmitted) return null

  if (!hasErrors && showSuccessMessage && isValid) {
    return (
      <Alert className={cn('border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20', className)}>
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertTitle className="text-green-800 dark:text-green-200">Formulário válido</AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          {successMessage}
        </AlertDescription>
      </Alert>
    )
  }

  if (!hasErrors) return null

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Erros de validação encontrados</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-1">
          <p className="text-sm">Corrija os seguintes erros antes de continuar:</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {errorEntries.map(([field, error]) => (
              <li key={field}>
                <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>{' '}
                {error?.message as string}
              </li>
            ))}
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  )
}

interface FormFieldValidationProps {
  name: string
  showSuccess?: boolean
  className?: string
}

export function FormFieldValidation({ name, showSuccess = false, className }: FormFieldValidationProps) {
  const { formState: { errors, touchedFields }, watch } = useFormContext()
  
  const error = errors[name]?.message as string
  const isTouched = touchedFields[name]
  const value = watch(name)
  const hasValue = value && value.toString().trim().length > 0
  const isValid = !error && isTouched && hasValue

  if (error) {
    return (
      <div className={cn('flex items-center gap-1 text-sm text-red-600 dark:text-red-400', className)}>
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
    )
  }

  if (showSuccess && isValid) {
    return (
      <div className={cn('flex items-center gap-1 text-sm text-green-600 dark:text-green-400', className)}>
        <CheckCircle className="h-4 w-4 flex-shrink-0" />
        <span>Campo válido</span>
      </div>
    )
  }

  return null
}

interface FormProgressProps {
  className?: string
}

export function FormProgress({ className }: FormProgressProps) {
  const { formState: { errors }, watch, getValues } = useFormContext()
  
  const allValues = getValues()
  const allFields = Object.keys(allValues)
  const filledFields = allFields.filter(field => {
    const value = watch(field)
    return value && value.toString().trim().length > 0
  })
  const validFields = allFields.filter(field => !errors[field])
  
  const totalFields = allFields.length
  const filledCount = filledFields.length
  const validCount = validFields.length
  
  const fillProgress = totalFields > 0 ? (filledCount / totalFields) * 100 : 0
  const validProgress = totalFields > 0 ? (validCount / totalFields) * 100 : 0

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Progresso do Formulário</CardTitle>
        <CardDescription className="text-xs">
          {filledCount} de {totalFields} campos preenchidos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Preenchimento</span>
            <span>{Math.round(fillProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${fillProgress}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Validação</span>
            <span>{Math.round(validProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${validProgress}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2 text-xs">
          <Badge variant="outline" className="text-xs">
            {filledCount} preenchidos
          </Badge>
          <Badge variant="outline" className="text-xs">
            {validCount} válidos
          </Badge>
          {Object.keys(errors).length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {Object.keys(errors).length} erros
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface ServerErrorDisplayProps {
  error?: string | null
  onRetry?: () => void
  className?: string
}

export function ServerErrorDisplay({ error, onRetry, className }: ServerErrorDisplayProps) {
  if (!error) return null

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Erro do servidor</AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          <p className="text-sm">{error}</p>
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="h-8"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Tentar novamente
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

interface ValidationRulesDisplayProps {
  rules: Array<{
    rule: string
    description: string
    isValid?: boolean
  }>
  className?: string
}

export function ValidationRulesDisplay({ rules, className }: ValidationRulesDisplayProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Regras de Validação</CardTitle>
        <CardDescription className="text-xs">
          Requisitos para preenchimento correto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {rules.map((rule, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <div className={cn(
                'mt-0.5 h-2 w-2 rounded-full flex-shrink-0',
                rule.isValid === true && 'bg-green-500',
                rule.isValid === false && 'bg-red-500',
                rule.isValid === undefined && 'bg-gray-300 dark:bg-gray-600'
              )} />
              <div>
                <span className="font-medium">{rule.rule}</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {rule.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

interface FormSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  error?: string
  className?: string
}

export function FormSection({ title, description, children, error, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}