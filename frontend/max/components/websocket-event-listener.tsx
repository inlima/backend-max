'use client'

import { useWebSocketEvents } from '@/hooks/use-websocket-events'
import { Contato, Processo, ConversaMessage, DashboardMetrics } from '@/types'

interface WebSocketEventListenerProps {
  onNovoContato?: (contato: Contato) => void
  onContatoAtualizado?: (contato: Contato) => void
  onProcessoAtualizado?: (processo: Processo) => void
  onNovaMensagem?: (mensagem: ConversaMessage) => void
  onMetricsUpdated?: (metrics: DashboardMetrics) => void
}

/**
 * Global WebSocket event listener component
 * Place this at the app level to handle WebSocket events globally
 */
export function WebSocketEventListener({
  onNovoContato,
  onContatoAtualizado,
  onProcessoAtualizado,
  onNovaMensagem,
  onMetricsUpdated
}: WebSocketEventListenerProps) {
  useWebSocketEvents({
    onNovoContato,
    onContatoAtualizado,
    onProcessoAtualizado,
    onNovaMensagem,
    onMetricsUpdated
  })

  // This component doesn't render anything
  return null
}