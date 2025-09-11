'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface WebSocketErrorBoundaryState {
  hasError: boolean
  error?: Error
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error'
}

interface WebSocketErrorBoundaryProps {
  children: ReactNode
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error'
  onReconnect?: () => void
}

export class WebSocketErrorBoundary extends Component<WebSocketErrorBoundaryProps, WebSocketErrorBoundaryState> {
  constructor(props: WebSocketErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): WebSocketErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('WebSocket Error caught by boundary:', error, errorInfo)
    
    // Log WebSocket specific errors
    this.logWebSocketError(error, errorInfo)
    
    // Show toast notification for WebSocket errors
    toast.error('Conexão em tempo real perdida', {
      description: 'As atualizações automáticas foram interrompidas. Tentando reconectar...'
    })
  }

  componentDidUpdate(prevProps: WebSocketErrorBoundaryProps) {
    // Reset error state when connection is restored
    if (prevProps.connectionStatus !== 'connected' && this.props.connectionStatus === 'connected') {
      if (this.state.hasError) {
        this.setState({ hasError: false, error: undefined })
        toast.success('Conexão restaurada', {
          description: 'As atualizações em tempo real foram reestabelecidas.'
        })
      }
    }
  }

  private logWebSocketError = (error: Error, errorInfo?: ErrorInfo) => {
    const errorData = {
      type: 'websocket_error',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      connectionStatus: this.props.connectionStatus,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    console.error('WebSocket error logged:', errorData)
    // Send to error reporting service
  }

  handleReconnect = () => {
    this.setState({ hasError: false, error: undefined })
    if (this.props.onReconnect) {
      this.props.onReconnect()
    }
  }

  render() {
    const { connectionStatus } = this.props
    
    // Show error UI if there's an error or connection issues
    if (this.state.hasError || connectionStatus === 'error' || connectionStatus === 'disconnected') {
      return (
        <div className="relative">
          {/* Connection Status Banner */}
          <div className="sticky top-0 z-50 border-b bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Conexão em tempo real indisponível
                </span>
                <Badge variant="outline" className="text-xs">
                  {connectionStatus === 'error' ? 'Erro' : 'Desconectado'}
                </Badge>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={this.handleReconnect}
                className="text-xs"
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                Reconectar
              </Button>
            </div>
          </div>
          
          {/* Main content with degraded functionality notice */}
          <div className="relative">
            {this.props.children}
            
            {/* Overlay for severe errors */}
            {this.state.hasError && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center">
                <Card className="w-full max-w-md mx-4">
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                      <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <CardTitle className="text-lg">Atualizações Interrompidas</CardTitle>
                    <CardDescription>
                      A conexão em tempo real foi perdida. Os dados podem não estar atualizados.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      • As informações exibidas podem estar desatualizadas
                      • Novos contatos e processos podem não aparecer automaticamente
                      • Recarregue a página manualmente para ver dados atuais
                    </div>
                    
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                      <details className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
                        <summary className="cursor-pointer text-sm font-medium">
                          Detalhes do erro
                        </summary>
                        <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-32">
                          {this.state.error.message}
                        </pre>
                      </details>
                    )}
                    
                    <div className="flex gap-2">
                      <Button onClick={this.handleReconnect} className="flex-1">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Tentar Reconectar
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => window.location.reload()}
                        className="flex-1"
                      >
                        Recarregar Página
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}