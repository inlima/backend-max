'use client'

import { useWebSocket } from '@/providers/websocket-provider'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { IconWifi, IconWifiOff, IconLoader2 } from '@tabler/icons-react'

export function ConnectionStatus() {
  const { connectionStatus } = useWebSocket()

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          variant: 'default' as const,
          icon: <IconWifi className="h-3 w-3" />,
          text: 'Conectado',
          description: 'Conexão WebSocket ativa - atualizações em tempo real'
        }
      case 'connecting':
        return {
          variant: 'secondary' as const,
          icon: <IconLoader2 className="h-3 w-3 animate-spin" />,
          text: 'Conectando',
          description: 'Estabelecendo conexão WebSocket...'
        }
      case 'disconnected':
        return {
          variant: 'outline' as const,
          icon: <IconWifiOff className="h-3 w-3" />,
          text: 'Desconectado',
          description: 'Sem conexão WebSocket - tentando reconectar automaticamente'
        }
      case 'error':
        return {
          variant: 'destructive' as const,
          icon: <IconWifiOff className="h-3 w-3" />,
          text: 'Erro',
          description: 'Erro na conexão WebSocket - verifique sua internet'
        }
      default:
        return {
          variant: 'outline' as const,
          icon: <IconWifiOff className="h-3 w-3" />,
          text: 'Desconhecido',
          description: 'Status da conexão desconhecido'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className="gap-1.5">
            {config.icon}
            <span className="hidden sm:inline">{config.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}