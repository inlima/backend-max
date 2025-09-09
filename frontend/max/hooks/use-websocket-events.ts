'use client'

import { useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useWebSocket } from '@/providers/websocket-provider'
import { Contato, Processo, ConversaMessage, DashboardMetrics } from '@/types'

interface WebSocketEventHandlers {
  onNovoContato?: (contato: Contato) => void
  onContatoAtualizado?: (contato: Contato) => void
  onProcessoAtualizado?: (processo: Processo) => void
  onNovaMensagem?: (mensagem: ConversaMessage) => void
  onMetricsUpdated?: (metrics: DashboardMetrics) => void
}

export function useWebSocketEvents(handlers: WebSocketEventHandlers = {}) {
  const { socket, isConnected } = useWebSocket()

  // Handle novo_contato event
  const handleNovoContato = useCallback((contato: Contato) => {
    toast.success(`Novo contato: ${contato.nome}`, {
      description: `Origem: ${contato.origem === 'whatsapp' ? 'WhatsApp' : 'Manual'}`,
      action: {
        label: 'Ver contato',
        onClick: () => {
          // Navigate to contatos page or open contact detail
          window.location.href = `/contatos?highlight=${contato.id}`
        }
      }
    })
    
    // Broadcast to other tabs
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('websocket-event', JSON.stringify({
        type: 'novo_contato',
        data: contato,
        timestamp: Date.now()
      }))
    }
    
    handlers.onNovoContato?.(contato)
  }, [handlers.onNovoContato])

  // Handle contato_atualizado event
  const handleContatoAtualizado = useCallback((contato: Contato) => {
    toast.info(`Contato atualizado: ${contato.nome}`, {
      description: `Status: ${contato.status}`,
    })
    
    // Broadcast to other tabs
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('websocket-event', JSON.stringify({
        type: 'contato_atualizado',
        data: contato,
        timestamp: Date.now()
      }))
    }
    
    handlers.onContatoAtualizado?.(contato)
  }, [handlers.onContatoAtualizado])

  // Handle processo_atualizado event
  const handleProcessoAtualizado = useCallback((processo: Processo) => {
    toast.info(`Processo atualizado: ${processo.titulo}`, {
      description: `Status: ${processo.status} | Cliente: ${processo.contato.nome}`,
      action: {
        label: 'Ver processo',
        onClick: () => {
          window.location.href = `/processos?highlight=${processo.id}`
        }
      }
    })
    
    // Broadcast to other tabs
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('websocket-event', JSON.stringify({
        type: 'processo_atualizado',
        data: processo,
        timestamp: Date.now()
      }))
    }
    
    handlers.onProcessoAtualizado?.(processo)
  }, [handlers.onProcessoAtualizado])

  // Handle nova_mensagem event
  const handleNovaMensagem = useCallback((mensagem: ConversaMessage) => {
    if (mensagem.direction === 'inbound') {
      toast.info('Nova mensagem recebida', {
        description: `${mensagem.content.substring(0, 50)}${mensagem.content.length > 50 ? '...' : ''}`,
        action: {
          label: 'Ver conversa',
          onClick: () => {
            window.location.href = `/contatos?contato=${mensagem.contatoId}`
          }
        }
      })
    }
    
    // Broadcast to other tabs
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('websocket-event', JSON.stringify({
        type: 'nova_mensagem',
        data: mensagem,
        timestamp: Date.now()
      }))
    }
    
    handlers.onNovaMensagem?.(mensagem)
  }, [handlers.onNovaMensagem])

  // Handle metrics_updated event
  const handleMetricsUpdated = useCallback((metrics: DashboardMetrics) => {
    // Broadcast to other tabs
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('websocket-event', JSON.stringify({
        type: 'metrics_updated',
        data: metrics,
        timestamp: Date.now()
      }))
    }
    
    handlers.onMetricsUpdated?.(metrics)
  }, [handlers.onMetricsUpdated])

  // Setup WebSocket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return

    socket.on('novo_contato', handleNovoContato)
    socket.on('contato_atualizado', handleContatoAtualizado)
    socket.on('processo_atualizado', handleProcessoAtualizado)
    socket.on('nova_mensagem', handleNovaMensagem)
    socket.on('metrics_updated', handleMetricsUpdated)

    return () => {
      socket.off('novo_contato', handleNovoContato)
      socket.off('contato_atualizado', handleContatoAtualizado)
      socket.off('processo_atualizado', handleProcessoAtualizado)
      socket.off('nova_mensagem', handleNovaMensagem)
      socket.off('metrics_updated', handleMetricsUpdated)
    }
  }, [
    socket,
    isConnected,
    handleNovoContato,
    handleContatoAtualizado,
    handleProcessoAtualizado,
    handleNovaMensagem,
    handleMetricsUpdated
  ])

  // Listen for localStorage events to sync across tabs
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'websocket-event' && e.newValue) {
        try {
          const event = JSON.parse(e.newValue)
          const timeDiff = Date.now() - event.timestamp
          
          // Only process events from the last 5 seconds to avoid stale events
          if (timeDiff < 5000) {
            switch (event.type) {
              case 'novo_contato':
                handlers.onNovoContato?.(event.data)
                break
              case 'contato_atualizado':
                handlers.onContatoAtualizado?.(event.data)
                break
              case 'processo_atualizado':
                handlers.onProcessoAtualizado?.(event.data)
                break
              case 'nova_mensagem':
                handlers.onNovaMensagem?.(event.data)
                break
              case 'metrics_updated':
                handlers.onMetricsUpdated?.(event.data)
                break
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket event from localStorage:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [handlers])

  return {
    isConnected,
    socket
  }
}