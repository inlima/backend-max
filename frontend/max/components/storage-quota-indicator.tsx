'use client'

import { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  IconDatabase, 
  IconAlertTriangle, 
  IconTrash, 
  IconRefresh,
  IconInfoCircle 
} from '@tabler/icons-react'
import { useOffline } from '@/hooks/use-offline'
import { cn } from '@/lib/utils'

interface StorageQuotaIndicatorProps {
  className?: string
  showDetails?: boolean
  showClearButton?: boolean
  warningThreshold?: number
  criticalThreshold?: number
}

export function StorageQuotaIndicator({
  className,
  showDetails = false,
  showClearButton = true,
  warningThreshold = 70,
  criticalThreshold = 90
}: StorageQuotaIndicatorProps) {
  const { storageQuota, clearOfflineData, preloadData } = useOffline()
  const [isClearing, setIsClearing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleClearData = async () => {
    if (isClearing) return

    const confirmed = window.confirm(
      'Tem certeza que deseja limpar todos os dados offline? Esta ação não pode ser desfeita.'
    )

    if (!confirmed) return

    setIsClearing(true)
    try {
      await clearOfflineData()
    } catch (error) {
      console.error('Failed to clear offline data:', error)
    } finally {
      setIsClearing(false)
    }
  }

  const handleRefreshQuota = async () => {
    if (isRefreshing) return

    setIsRefreshing(true)
    try {
      await preloadData()
    } catch (error) {
      console.error('Failed to refresh quota:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!storageQuota || storageQuota.quota === 0) {
    return null
  }

  const usagePercent = (storageQuota.usage / storageQuota.quota) * 100
  const usageMB = Math.round(storageQuota.usage / 1024 / 1024)
  const quotaMB = Math.round(storageQuota.quota / 1024 / 1024)
  const availableMB = Math.round(storageQuota.available / 1024 / 1024)

  const getStatusConfig = () => {
    if (usagePercent >= criticalThreshold) {
      return {
        variant: 'destructive' as const,
        icon: <IconAlertTriangle className="h-3 w-3" />,
        text: 'Crítico',
        description: 'Armazenamento quase cheio - limpe dados antigos'
      }
    }

    if (usagePercent >= warningThreshold) {
      return {
        variant: 'secondary' as const,
        icon: <IconAlertTriangle className="h-3 w-3" />,
        text: 'Aviso',
        description: 'Armazenamento ficando cheio'
      }
    }

    return {
      variant: 'outline' as const,
      icon: <IconDatabase className="h-3 w-3" />,
      text: 'Normal',
      description: 'Armazenamento em uso normal'
    }
  }

  const config = getStatusConfig()

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-2", className)}>
              <Badge variant={config.variant} className="flex items-center gap-1">
                {config.icon}
                <span className="text-xs">{usageMB}MB</span>
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>Armazenamento: {usageMB}MB / {quotaMB}MB</p>
              <p>Disponível: {availableMB}MB</p>
              <p>Uso: {Math.round(usagePercent)}%</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconDatabase className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Armazenamento Offline</span>
          <Badge variant={config.variant} className="text-xs">
            {config.text}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefreshQuota}
            disabled={isRefreshing}
            className="h-6 w-6 p-0"
          >
            <IconRefresh className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
          </Button>
          
          {showClearButton && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearData}
              disabled={isClearing}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <IconTrash className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress 
          value={usagePercent} 
          className={cn(
            "h-2",
            usagePercent >= criticalThreshold && "bg-red-100",
            usagePercent >= warningThreshold && usagePercent < criticalThreshold && "bg-yellow-100"
          )}
        />
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{usageMB}MB usado</span>
          <span>{availableMB}MB disponível</span>
        </div>
      </div>

      {/* Storage Details */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center p-2 bg-muted/50 rounded">
          <div className="font-medium">{usageMB}MB</div>
          <div className="text-muted-foreground">Usado</div>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded">
          <div className="font-medium">{availableMB}MB</div>
          <div className="text-muted-foreground">Disponível</div>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded">
          <div className="font-medium">{quotaMB}MB</div>
          <div className="text-muted-foreground">Total</div>
        </div>
      </div>

      {/* Warnings */}
      {usagePercent >= criticalThreshold && (
        <Alert variant="destructive">
          <IconAlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Armazenamento crítico!</strong> Apenas {availableMB}MB disponível. 
            Limpe dados antigos para continuar usando o modo offline.
          </AlertDescription>
        </Alert>
      )}

      {usagePercent >= warningThreshold && usagePercent < criticalThreshold && (
        <Alert>
          <IconAlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Armazenamento ficando cheio.</strong> Considere limpar dados antigos 
            para manter o bom funcionamento do modo offline.
          </AlertDescription>
        </Alert>
      )}

      {/* Info */}
      <div className="flex items-start gap-2 p-2 bg-blue-50 rounded border border-blue-200">
        <IconInfoCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-800">
          <p className="font-medium mb-1">Sobre o armazenamento offline:</p>
          <ul className="space-y-1">
            <li>• Dados são armazenados localmente para acesso offline</li>
            <li>• Inclui contatos, processos e configurações recentes</li>
            <li>• Limpar dados não afeta informações no servidor</li>
            <li>• Dados serão recarregados automaticamente quando online</li>
          </ul>
        </div>
      </div>
    </div>
  )
}