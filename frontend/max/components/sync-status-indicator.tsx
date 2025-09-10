'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { IconRefresh, IconCheck, IconAlertCircle, IconClock, IconWifiOff } from '@tabler/icons-react'
import { useOffline } from '@/hooks/use-offline'
import { cn } from '@/lib/utils'

interface SyncStatusProps {
  className?: string
  showProgress?: boolean
  showLastSync?: boolean
  autoSync?: boolean
}

export function SyncStatusIndicator({ 
  className, 
  showProgress = true, 
  showLastSync = true,
  autoSync = false 
}: SyncStatusProps) {
  const {
    isOnline,
    hasPendingActions,
    pendingActionsCount,
    syncProgress,
    lastSyncTime,
    syncNow
  } = useOffline()

  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSyncResult, setLastSyncResult] = useState<'success' | 'error' | null>(null)

  // Auto-sync when coming online
  useEffect(() => {
    if (autoSync && isOnline && hasPendingActions && !isSyncing) {
      handleSync()
    }
  }, [isOnline, hasPendingActions, autoSync, isSyncing])

  // Clear success/error status after a delay
  useEffect(() => {
    if (lastSyncResult) {
      const timer = setTimeout(() => {
        setLastSyncResult(null)
        setSyncError(null)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [lastSyncResult])

  const handleSync = async () => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)
    setSyncError(null)
    setLastSyncResult(null)

    try {
      const result = await syncNow()
      if (result.success) {
        setLastSyncResult('success')
      } else {
        setLastSyncResult('error')
        if (result.errors.length > 0) {
          setSyncError(result.errors[0].error)
        }
      }
    } catch (error) {
      setLastSyncResult('error')
      setSyncError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setIsSyncing(false)
    }
  }

  const getStatusConfig = () => {
    // If offline
    if (!isOnline) {
      return {
        variant: 'secondary' as const,
        icon: <IconWifiOff className="h-3 w-3" />,
        text: 'Offline',
        description: 'Sem conexão - alterações serão sincronizadas quando voltar online'
      }
    }

    // If syncing
    if (isSyncing || syncProgress?.status === 'syncing') {
      return {
        variant: 'secondary' as const,
        icon: <IconRefresh className="h-3 w-3 animate-spin" />,
        text: 'Sincronizando...',
        description: 'Sincronizando alterações pendentes'
      }
    }

    // If sync error
    if (lastSyncResult === 'error' || syncError) {
      return {
        variant: 'destructive' as const,
        icon: <IconAlertCircle className="h-3 w-3" />,
        text: 'Erro',
        description: syncError || 'Erro na sincronização'
      }
    }

    // If sync success
    if (lastSyncResult === 'success') {
      return {
        variant: 'default' as const,
        icon: <IconCheck className="h-3 w-3" />,
        text: 'Sincronizado',
        description: 'Todas as alterações foram sincronizadas'
      }
    }

    // If has pending actions
    if (hasPendingActions) {
      return {
        variant: 'outline' as const,
        icon: <IconClock className="h-3 w-3" />,
        text: `${pendingActionsCount} pendente${pendingActionsCount !== 1 ? 's' : ''}`,
        description: `${pendingActionsCount} alteração${pendingActionsCount !== 1 ? 'ões' : ''} aguardando sincronização`
      }
    }

    // Default - up to date
    return {
      variant: 'outline' as const,
      icon: <IconCheck className="h-3 w-3" />,
      text: 'Atualizado',
      description: 'Todas as alterações estão sincronizadas'
    }
  }

  const formatLastSync = () => {
    if (!lastSyncTime) return null
    
    const now = new Date()
    const diff = now.getTime() - lastSyncTime.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'agora'
    if (minutes < 60) return `há ${minutes}min`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `há ${hours}h`
    
    return lastSyncTime.toLocaleDateString('pt-BR')
  }

  const config = getStatusConfig()

  return (
    <div className={cn("space-y-2", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Badge 
                variant={config.variant}
                className="flex items-center gap-1"
              >
                {config.icon}
                <span className="text-xs">{config.text}</span>
              </Badge>
              
              {isOnline && hasPendingActions && !isSyncing && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSync}
                  className="h-6 px-2 text-xs"
                >
                  <IconRefresh className="h-3 w-3 mr-1" />
                  Sincronizar
                </Button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>{config.description}</p>
              {showLastSync && lastSyncTime && (
                <p>Última sincronização: {formatLastSync()}</p>
              )}
              {hasPendingActions && (
                <p>{pendingActionsCount} alteração{pendingActionsCount !== 1 ? 'ões' : ''} pendente{pendingActionsCount !== 1 ? 's' : ''}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Sync Progress */}
      {showProgress && syncProgress?.status === 'syncing' && (
        <div className="space-y-1">
          <Progress 
            value={(syncProgress.completed / syncProgress.total) * 100} 
            className="h-1"
          />
          <p className="text-xs text-muted-foreground">
            {syncProgress.completed} de {syncProgress.total} sincronizadas
          </p>
        </div>
      )}

      {/* Sync Error Alert */}
      {syncError && (
        <Alert variant="destructive" className="py-2">
          <IconAlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {syncError}
          </AlertDescription>
        </Alert>
      )}

      {/* Offline Notice */}
      {!isOnline && hasPendingActions && (
        <Alert className="py-2">
          <IconWifiOff className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {pendingActionsCount} alteração{pendingActionsCount !== 1 ? 'ões' : ''} será{pendingActionsCount !== 1 ? 'ão' : ''} sincronizada{pendingActionsCount !== 1 ? 's' : ''} quando voltar online.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}