'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'

interface ApiErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorType?: 'network' | 'server' | 'client' | 'unknown'
}

interface ApiErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void
  fallback?: React.ComponentType<{ error: Error; retry: () => void; errorType: string }>
}

export class ApiErrorBoundary extends Component<ApiErrorBoundaryProps, ApiErrorBoundaryState> {
  constructor(props: ApiErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ApiErrorBoundaryState {
    // Determine error type based on error message or properties
    let errorType: 'network' | 'server' | 'client' | 'unknown' = 'unknown'
    
    if (error.message.includes('fetch') || error.message.includes('network')) {
      errorType = 'network'
    } else if (error.message.includes('500') || error.message.includes('server')) {
      errorType = 'server'
    } else if (error.message.includes('400') || error.message.includes('401') || error.message.includes('403')) {
      errorType = 'client'
    }

    return { hasError: true, error, errorType }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('API Error caught by boundary:', error, errorInfo)
    
    // Log to error reporting service
    this.logError(error, errorInfo)
    
    // Show toast notification for API errors
    toast.error('Erro de conexão', {
      description: 'Problema ao conectar com o servidor. Tentando novamente...'
    })
  }

  private logError = (error: Error, errorInfo?: ErrorInfo) => {
    // Here you would send to your error reporting service
    // Example: Sentry, LogRocket, etc.
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    console.error('Error logged:', errorData)
    // errorReportingService.captureException(error, { extra: errorData })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorType: undefined })
    if (this.props.onRetry) {
      this.props.onRetry()
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ApiErrorFallback
      return (
        <FallbackComponent 
          error={this.state.error!} 
          retry={this.handleRetry}
          errorType={this.state.errorType || 'unknown'}
        />
      )
    }

    return this.props.children
  }
}

interface ApiErrorFallbackProps {
  error: Error
  retry: () => void
  errorType: string
}

function ApiErrorFallback({ error, retry, errorType }: ApiErrorFallbackProps) {
  const getErrorConfig = (type: string) => {
    switch (type) {
      case 'network':
        return {
          icon: WifiOff,
          title: 'Problema de Conexão',
          description: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.',
          actionText: 'Tentar Reconectar'
        }
      case 'server':
        return {
          icon: AlertTriangle,
          title: 'Erro do Servidor',
          description: 'O servidor está temporariamente indisponível. Tente novamente em alguns minutos.',
          actionText: 'Tentar Novamente'
        }
      case 'client':
        return {
          icon: AlertTriangle,
          title: 'Erro de Acesso',
          description: 'Você não tem permissão para acessar este recurso ou a sessão expirou.',
          actionText: 'Recarregar Página'
        }
      default:
        return {
          icon: AlertTriangle,
          title: 'Erro Inesperado',
          description: 'Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.',
          actionText: 'Tentar Novamente'
        }
    }
  }

  const config = getErrorConfig(errorType)
  const IconComponent = config.icon

  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <IconComponent className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-lg">{config.title}</CardTitle>
          <CardDescription className="text-sm">
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <details className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
              <summary className="cursor-pointer text-sm font-medium">
                Detalhes técnicos
              </summary>
              <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-32">
                {error.message}
              </pre>
            </details>
          )}
          <Button onClick={retry} className="w-full" variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            {config.actionText}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}