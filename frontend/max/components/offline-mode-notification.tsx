'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  IconWifiOff, 
  IconWifi, 
  IconRefresh, 
  IconChevronDown, 
  IconChevronUp,
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconDatabase,
  IconX
} from '@tabler/icons-react'
import { useOffline } from '@/hooks/use-offline'
import { cn } from '@/lib/utils'

interface OfflineModeNotificationProps {
  className?: string
  dismissible?: boolean
  showStorageInfo?: boolean
  autoHide?: boolean
  autoHideDelay?: number
}

export function OfflineModeNotification({
  className,
  dismissible = true,
  showStorageInfo = true,
  autoHide = false,
  autoHideDelay = 5000
}: OfflineModeNotificationProps) {
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

  const [isDismissed, setIsDismissed] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showOnlineNotification, setShowOnlineNotification] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Show online notification when connection is restored
  useEffect(() => {
    if (isOnline && !showOnlineNotification) {
      setShowOnlineNotification(true)
      setIsDismissed(false)
      
      if (autoHide) {
        setTimeout(() => {
          setShowOnlineNotification(false)
        }, autoHideDelay)
      }
    }
  }, [isOnline, autoHide, autoHideDelay])

  // Reset dismissed state when going offline
  useEffect(() => {
    if (!isOnline) {
      setIsDismissed(false)
      setShowOnlineNotification(false)
    }
  }, [isOnline])

  const handleSync = async () => {
    if (!isOnline || isSyncing) return

    setIsSyncing(true)
    try {
      await syncNow()
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    setShowOnlineNotification(false)
  }

  const formatStorageUsage = () => {
    if (!storageQuota || storageQuota.quota === 0) return null
    
    const usagePercent = (storageQuota.usage / storageQuota.quota) * 100
    const usageMB = Math.round(storageQuota.usage / 1024 / 1024)
    const quotaMB = Math.round(storageQuota.quota / 1024 / 1024)
    
    return { usagePercent, usageMB, quotaMB }
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

  // Don't show if dismissed or not ready
  if (isDismissed || !isOfflineReady) {
    return null
  }

  const storageInfo = formatStorageUsage()

  // Online notification
  if (showOnlineNotification && isOnline) {
    return (
      <Alert className={cn("border-green-200 bg-green-50", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconWifi className="h-4 w-4 text-green-600" />
            <div>
              <AlertDescription className="text-green-800">
                <strong>Conexão restaurada!</strong> Você está online novamente.
                {hasPendingActions && (
                  <span className="ml-1">
                    {pendingActionsCount} alteração{pendingActionsCount !== 1 ? 'ões' : ''} será{pendingActionsCount !== 1 ? 'ão' : ''} sincronizada{pendingActionsCount !== 1 ? 's' : ''}.
                  </span>
                )}
              </AlertDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasPendingActions && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={isSyncing}
                className="h-7 px-2 text-xs border-green-300 text-green-700 hover:bg-green-100"
              >
                {isSyncing ? (
                  <IconRefresh className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <IconRefresh className="h-3 w-3 mr-1" />
                    Sincronizar
                  </>
                )}
              </Button>
            )}
            
            {dismissible && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-7 w-7 p-0 text-green-600 hover:bg-green-100"
              >
                <IconX className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </Alert>
    )
  }

  // Offline notification
  if (!isOnline) {
    return (
      <div className={cn("space-y-2", className)}>
        <Alert variant="destructive">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconWifiOff className="h-4 w-4" />
              <div className="flex-1">
                <AlertDescription>
                  <strong>Modo offline ativo.</strong> Você pode continuar trabalhando - suas alterações serão sincronizadas quando a conexão for restaurada.
                </AlertDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {hasPendingActions && (
                <Badge variant="outline" className="text-xs">
                  <IconClock className="h-3 w-3 mr-1" />
                  {pendingActionsCount}
                </Badge>
              )}
              
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-100"
                  >
                    {isExpanded ? (
                      <IconChevronUp className="h-3 w-3" />
                    ) : (
                      <IconChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
              
              {dismissible && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-7 w-7 p-0 text-red-600 hover:bg-red-100"
                >
                  <IconX className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleContent className="mt-3 space-y-3">
              {/* Pending Actions */}
              {hasPendingActions && (
                <div className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                  <div className="flex items-center gap-2 text-sm text-red-800">
                    <IconClock className="h-4 w-4" />
                    <span>
                      {pendingActionsCount} alteração{pendingActionsCount !== 1 ? 'ões' : ''} aguardando sincronização
                    </span>
                  </div>
                </div>
              )}
              
              {/* Last Sync */}
              {lastSyncTime && (
                <div className="flex items-center gap-2 text-sm text-red-700">
                  <IconCheck className="h-4 w-4" />
                  <span>Última sincronização: {formatLastSync()}</span>
                </div>
              )}
              
              {/* Storage Info */}
              {showStorageInfo && storageInfo && (
                <div className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                  <div className="flex items-center gap-2 text-sm text-red-800">
                    <IconDatabase className="h-4 w-4" />
                    <span>Armazenamento offline: {storageInfo.usageMB}MB / {storageInfo.quotaMB}MB</span>
                  </div>
                  <div className="text-xs text-red-600">
                    {Math.round(storageInfo.usagePercent)}%
                  </div>
                </div>
              )}
              
              {/* Storage Warning */}
              {storageInfo && storageInfo.usagePercent > 80 && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 rounded border border-amber-200">
                  <IconAlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800">
                    Armazenamento quase cheio. Considere limpar dados antigos.
                  </span>
                </div>
              )}
              
              {/* Available Features */}
              <div className="text-sm text-red-700">
                <p className="font-medium mb-1">Disponível offline:</p>
                <ul className="text-xs space-y-1 ml-4">
                  <li>• Visualizar contatos e processos salvos</li>
                  <li>• Criar novos contatos e processos</li>
                  <li>• Adicionar anotações e comentários</li>
                  <li>• Ver métricas do dashboard</li>
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Alert>
        
        {/* Sync Progress */}
        {syncProgress?.status === 'syncing' && (
          <Alert>
            <IconRefresh className="h-4 w-4 animate-spin" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Sincronizando alterações...</span>
                  <span className="text-sm text-muted-foreground">
                    {syncProgress.completed}/{syncProgress.total}
                  </span>
                </div>
                <Progress 
                  value={(syncProgress.completed / syncProgress.total) * 100} 
                  className="h-2"
                />
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  return null
}