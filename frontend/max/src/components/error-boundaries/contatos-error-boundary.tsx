'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Users } from 'lucide-react'

interface ContatosErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

interface ContatosErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

export class ContatosErrorBoundary extends Component<ContatosErrorBoundaryProps, ContatosErrorBoundaryState> {
  constructor(props: ContatosErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ContatosErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo })
    console.error('Contatos Error Boundary caught an error:', error, errorInfo)
    
    // Report error to monitoring service
    // Example: errorReportingService.captureException(error, { 
    //   tags: { section: 'contatos' },
    //   extra: errorInfo 
    // })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ContatosErrorFallback
      return (
        <FallbackComponent 
          error={this.state.error!} 
          retry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}

interface ContatosErrorFallbackProps {
  error: Error
  retry: () => void
}

function ContatosErrorFallback({ error, retry }: ContatosErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <Users className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl">Erro na seção de Contatos</CardTitle>
          <CardDescription>
            Ocorreu um erro ao carregar os contatos. Tente novamente ou entre em contato com o suporte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <details className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
              <summary className="cursor-pointer text-sm font-medium">
                Detalhes do erro (desenvolvimento)
              </summary>
              <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          <div className="flex gap-2">
            <Button onClick={retry} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="flex-1"
            >
              Recarregar página
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}