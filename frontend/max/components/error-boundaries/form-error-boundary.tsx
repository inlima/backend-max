'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle, RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'

interface FormErrorBoundaryState {
  hasError: boolean
  error?: Error
  formData?: Record<string, any>
}

interface FormErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void
  onSaveFormData?: (data: Record<string, any>) => void
  formName?: string
}

export class FormErrorBoundary extends Component<FormErrorBoundaryProps, FormErrorBoundaryState> {
  constructor(props: FormErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): FormErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Form Error caught by boundary:', error, errorInfo)
    
    // Try to preserve form data from localStorage or form elements
    this.preserveFormData()
    
    // Log form-specific errors
    this.logFormError(error, errorInfo)
    
    // Show toast notification for form errors
    toast.error('Erro no formulário', {
      description: 'Seus dados foram preservados. Tente novamente.'
    })
  }

  private preserveFormData = () => {
    try {
      // Try to get form data from localStorage (if the form was saving drafts)
      const formName = this.props.formName || 'form'
      const savedData = localStorage.getItem(`${formName}_draft`)
      
      if (savedData) {
        this.setState({ formData: JSON.parse(savedData) })
      } else {
        // Try to extract data from form elements
        const forms = document.querySelectorAll('form')
        if (forms.length > 0) {
          const formData = new FormData(forms[0])
          const data: Record<string, any> = {}
          
          for (const [key, value] of formData.entries()) {
            data[key] = value
          }
          
          if (Object.keys(data).length > 0) {
            this.setState({ formData: data })
          }
        }
      }
    } catch (error) {
      console.warn('Could not preserve form data:', error)
    }
  }

  private logFormError = (error: Error, errorInfo?: ErrorInfo) => {
    const errorData = {
      type: 'form_error',
      formName: this.props.formName,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      formData: this.state.formData,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    console.error('Form error logged:', errorData)
    // Send to error reporting service
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
    if (this.props.onRetry) {
      this.props.onRetry()
    }
  }

  handleSaveData = () => {
    if (this.state.formData && this.props.onSaveFormData) {
      this.props.onSaveFormData(this.state.formData)
      toast.success('Dados salvos', {
        description: 'Seus dados foram salvos e podem ser recuperados.'
      })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-4 p-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro no Formulário</AlertTitle>
            <AlertDescription>
              Ocorreu um erro ao processar o formulário. 
              {this.state.formData && ' Seus dados foram preservados e podem ser recuperados.'}
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  O que aconteceu?
                </h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  Um erro inesperado ocorreu durante o preenchimento ou envio do formulário. 
                  Isso pode ter sido causado por um problema temporário de conexão ou validação.
                </p>
                
                {this.state.formData && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Dados preservados:
                    </h4>
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {Object.keys(this.state.formData).length} campos foram salvos automaticamente
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button onClick={this.handleRetry} size="sm" className="flex-1">
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
              
              {this.state.formData && this.props.onSaveFormData && (
                <Button 
                  onClick={this.handleSaveData} 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Dados
                </Button>
              )}
              
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                size="sm"
                className="flex-1"
              >
                Recarregar Página
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 rounded-md bg-red-100 p-3 dark:bg-red-900/40">
                <summary className="cursor-pointer text-sm font-medium text-red-800 dark:text-red-200">
                  Detalhes técnicos (desenvolvimento)
                </summary>
                <pre className="mt-2 text-xs text-red-700 dark:text-red-300 overflow-auto max-h-32">
                  {this.state.error.message}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}