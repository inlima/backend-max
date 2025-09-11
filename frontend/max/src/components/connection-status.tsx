'use client'

import { useWebSocket } from '@/providers/websocket-provider'
import { useOffline } from '@/hooks/use-offline'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { IconWifi, IconWifiOff, IconLoader2, IconRefresh, IconAlertCircle, IconCheck, IconClock, IconDatabase } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface ConnectionStatusProps {
  className?: string
  showDetails?: boolean
  showSyncButton?: boolean
}

export function ConnectionStatus({ 
  className, 
  showDetails = false, 
  showSyncButton = true 
}: ConnectionStatusProps) {
  const { connectionStatus } = useWebSocket()
  const {
    isOnline,
    isOfflineReady,
    hasPendingActions,
    pendingActionsCount,
    syncProgress,
    storageQuota,
    lastSyncTime,
    syncNow
  } = useOffline()

  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  const handleSync = async () => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)
    setSyncError(null)

    try {
      const result = await syncNow()
      if (!result.success && result.errors.length > 0) {
        setSyncError(`Falha na sincronização: ${result.errors[0].error}`)
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setIsSyncing(false)
    }
  }

  const getStatusConfig = () => {
    // If offline, show offline status regardless of WebSocket
    if (!isOnline) {
      return {
        variant: 'destructive' as const,
        icon: <IconWifiOff className="h-3 w-3" />,
        text: 'Offline',
        description: 'Sem conexão com a internet - modo offline ativo'
      }
    }

    // If online but offline functionality not ready
    if (!isOfflineReady) {
      return {
        variant: 'secondary' as const,
        icon: <IconLoader2 className="h-3 w-3 animate-spin" />,
        text: 'Carregando',
        description: 'Inicializando funcionalidades offline...'
      }
    }

    // Online - show WebSocket status
    switch (connectionStatus) {
      case 'connected':
        return {
          variant: 'default' as const,
          icon: <IconWifi className="h-3 w-3" />,
          text: 'Conectado',
          description: 'Online - WebSocket ativo, atualizações em tempo real'
        }
      case 'connecting':
        return {
          variant: 'secondary' as const,
          icon: <IconLoader2 className="h-3 w-3 animate-spin" />,
          text: 'Conectando',
          description: 'Online - estabelecendo conexão WebSocket...'
        }
      case 'disconnected':
        return {
          variant: 'outline' as const,
          icon: <IconWifiOff className="h-3 w-3" />,
          text: 'Desconectado',
          description: 'Online - sem WebSocket, tentando reconectar'
        }
      case 'error':
        return {
          variant: 'destructive' as const,
          icon: <IconWifiOff className="h-3 w-3" />,
          text: 'Erro',
          description: 'Online - erro na conexão WebSocket'
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

  const getSyncStatus = () => {
    if (syncProgress?.status === 'syncing') {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconLoader2 className="h-3 w-3 animate-spin" />
          Sincronizando... ({syncProgress.completed}/{syncProgress.total})
        </div>
      )
    }

    if (hasPendingActions) {
      return (
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <IconClock className="h-3 w-3" />
          {pendingActionsCount} ação{pendingActionsCount !== 1 ? 'ões' : ''} pendente{pendingActionsCount !== 1 ? 's' : ''}
        </div>
      )
    }

    if (lastSyncTime) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <IconCheck className="h-3 w-3" />
          Sincronizado {formatLastSync(lastSyncTime)}
        </div>
      )
    }

    return null
  }

  const formatLastSync = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'agora'
    if (minutes < 60) return `há ${minutes}min`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `há ${hours}h`
    
    return date.toLocaleDateString('pt-BR')
  }

  const formatStorageUsage = () => {
    if (!storageQuota || storageQuota.quota === 0) return null
    
    const usagePercent = (storageQuota.usage / storageQuota.quota) * 100
    const usageMB = Math.round(storageQuota.usage / 1024 / 1024)
    const quotaMB = Math.round(storageQuota.quota / 1024 / 1024)
    
    return { usagePercent, usageMB, quotaMB }
  }

  const config = getStatusConfig()

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-2", className)}>
              <Badge variant={config.variant} className="gap-1.5">
                {config.icon}
                <span className="hidden sm:inline">{config.text}</span>
              </Badge>
              {hasPendingActions && (
                <Badge variant="outline" className="text-xs">
                  {pendingActionsCount}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>{config.description}</p>
              {hasPendingActions && (
                <p>{pendingActionsCount} ação{pendingActionsCount !== 1 ? 'ões' : ''} pendente{pendingActionsCount !== 1 ? 's' : ''}</p>
              )}
              {lastSyncTime && (
                <p>Última sincronização: {formatLastSync(lastSyncTime)}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const storageInfo = formatStorageUsage()

  return (
    <div className={cn("space-y-3", className)}>
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={config.variant} className="gap-1.5">
            {config.icon}
            <span>{config.text}</span>
          </Badge>
          {showSyncButton && isOnline && hasPendingActions && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSync}
              disabled={isSyncing}
              className="h-6 px-2 text-xs"
            >
              {isSyncing ? (
                <IconLoader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <IconRefresh className="h-3 w-3 mr-1" />
                  Sincronizar
                </>
              )}
            </Button>
          )}
        </div>
        
        {storageInfo && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <IconDatabase className="h-3 w-3" />
                  {storageInfo.usageMB}MB
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Armazenamento: {storageInfo.usageMB}MB / {storageInfo.quotaMB}MB</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Sync Status */}
      {getSyncStatus()}

      {/* Sync Progress */}
      {syncProgress?.status === 'syncing' && (
        <div className="space-y-2">
          <Progress 
            value={(syncProgress.completed / syncProgress.total) * 100} 
            className="h-2"
          />
          {syncProgress.current && (
            <p className="text-xs text-muted-foreground">
              Sincronizando: {syncProgress.current.method} {syncProgress.current.url}
            </p>
          )}
        </div>
      )}

      {/* Storage Usage Warning */}
      {storageInfo && storageInfo.usagePercent > 80 && (
        <Alert>
          <IconAlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Armazenamento quase cheio ({Math.round(storageInfo.usagePercent)}%). 
            Considere limpar dados antigos.
          </AlertDescription>
        </Alert>
      )}

      {/* Sync Error */}
      {syncError && (
        <Alert variant="destructive">
          <IconAlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {syncError}
          </AlertDescription>
        </Alert>
      )}

      {/* Offline Mode Info */}
      {!isOnline && (
        <Alert>
          <IconWifiOff className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Modo offline ativo. Suas alterações serão sincronizadas quando a conexão for restaurada.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}