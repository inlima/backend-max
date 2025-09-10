"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  IconCheck, 
  IconX, 
  IconClock, 
  IconAlertTriangle,
  IconDownload,
  IconUpload,
  IconRefresh
} from "@tabler/icons-react"

// Multi-step progress indicator
export const MultiStepProgress = React.memo(({ 
  steps,
  currentStep,
  completedSteps = [],
  failedSteps = [],
  className
}: {
  steps: Array<{ id: string; title: string; description?: string }>
  currentStep: string
  completedSteps?: string[]
  failedSteps?: string[]
  className?: string
}) => {
  const currentIndex = steps.findIndex(step => step.id === currentStep)
  
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Progresso da Operação</h3>
        <Badge variant="outline">
          {completedSteps.length + failedSteps.length} de {steps.length}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id)
          const isFailed = failedSteps.includes(step.id)
          const isCurrent = step.id === currentStep
          const isPending = !isCompleted && !isFailed && !isCurrent
          
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center space-x-3 p-3 rounded-lg transition-all duration-300",
                isCompleted && "bg-green-50 border border-green-200",
                isFailed && "bg-red-50 border border-red-200",
                isCurrent && "bg-blue-50 border border-blue-200 animate-pulse",
                isPending && "bg-muted/30"
              )}
            >
              {/* Step indicator */}
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
                isCompleted && "bg-green-500 text-white",
                isFailed && "bg-red-500 text-white",
                isCurrent && "bg-blue-500 text-white animate-spin",
                isPending && "bg-muted text-muted-foreground"
              )}>
                {isCompleted && <IconCheck className="w-4 h-4" />}
                {isFailed && <IconX className="w-4 h-4" />}
                {isCurrent && <IconRefresh className="w-4 h-4" />}
                {isPending && <span className="text-sm font-medium">{index + 1}</span>}
              </div>
              
              {/* Step content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium transition-colors duration-300",
                  isCompleted && "text-green-700",
                  isFailed && "text-red-700",
                  isCurrent && "text-blue-700",
                  isPending && "text-muted-foreground"
                )}>
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
              </div>
              
              {/* Status indicator */}
              <div className="flex items-center">
                {isCompleted && (
                  <Badge variant="outline" className="text-green-700 border-green-300">
                    Concluído
                  </Badge>
                )}
                {isFailed && (
                  <Badge variant="outline" className="text-red-700 border-red-300">
                    Falhou
                  </Badge>
                )}
                {isCurrent && (
                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                    Em andamento
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Overall progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progresso geral</span>
          <span>{Math.round(((completedSteps.length + failedSteps.length) / steps.length) * 100)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className={cn(
              "h-2 rounded-full transition-all duration-500",
              failedSteps.length > 0 ? "bg-red-500" : "bg-green-500"
            )}
            style={{ 
              width: `${((completedSteps.length + failedSteps.length) / steps.length) * 100}%` 
            }}
          />
        </div>
      </div>
    </div>
  )
})
MultiStepProgress.displayName = "MultiStepProgress"

// File upload progress
export const FileUploadProgress = React.memo(({ 
  files,
  onCancel,
  onRetry,
  className
}: {
  files: Array<{
    id: string
    name: string
    size: number
    progress: number
    status: 'uploading' | 'completed' | 'failed' | 'cancelled'
    error?: string
  }>
  onCancel?: (fileId: string) => void
  onRetry?: (fileId: string) => void
  className?: string
}) => {
  const totalFiles = files.length
  const completedFiles = files.filter(f => f.status === 'completed').length
  const failedFiles = files.filter(f => f.status === 'failed').length
  const uploadingFiles = files.filter(f => f.status === 'uploading').length
  
  const totalProgress = files.reduce((acc, file) => acc + file.progress, 0) / totalFiles
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <IconUpload className="w-5 h-5" />
            <span>Upload de Arquivos</span>
          </CardTitle>
          <div className="flex space-x-2">
            <Badge variant="outline" className="text-green-700">
              {completedFiles} concluídos
            </Badge>
            {failedFiles > 0 && (
              <Badge variant="outline" className="text-red-700">
                {failedFiles} falharam
              </Badge>
            )}
            {uploadingFiles > 0 && (
              <Badge variant="outline" className="text-blue-700">
                {uploadingFiles} enviando
              </Badge>
            )}
          </div>
        </div>
        
        {/* Overall progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso geral</span>
            <span>{Math.round(totalProgress)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {files.map(file => (
          <div
            key={file.id}
            className={cn(
              "flex items-center space-x-3 p-3 rounded-lg border transition-all duration-300",
              file.status === 'completed' && "bg-green-50 border-green-200",
              file.status === 'failed' && "bg-red-50 border-red-200",
              file.status === 'uploading' && "bg-blue-50 border-blue-200",
              file.status === 'cancelled' && "bg-gray-50 border-gray-200"
            )}
          >
            {/* File icon and info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="font-medium truncate">{file.name}</p>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              
              {/* Progress bar for individual file */}
              {file.status === 'uploading' && (
                <div className="mt-2">
                  <div className="w-full bg-muted rounded-full h-1">
                    <div 
                      className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {file.progress}% enviado
                  </p>
                </div>
              )}
              
              {/* Error message */}
              {file.status === 'failed' && file.error && (
                <p className="text-xs text-red-600 mt-1">{file.error}</p>
              )}
            </div>
            
            {/* Status and actions */}
            <div className="flex items-center space-x-2">
              {file.status === 'completed' && (
                <IconCheck className="w-5 h-5 text-green-500" />
              )}
              {file.status === 'failed' && (
                <div className="flex items-center space-x-1">
                  <IconX className="w-5 h-5 text-red-500" />
                  {onRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRetry(file.id)}
                    >
                      Tentar novamente
                    </Button>
                  )}
                </div>
              )}
              {file.status === 'uploading' && (
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  {onCancel && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCancel(file.id)}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
})
FileUploadProgress.displayName = "FileUploadProgress"

// Data processing progress
export const DataProcessingProgress = React.memo(({ 
  title,
  totalItems,
  processedItems,
  failedItems = 0,
  currentItem,
  estimatedTimeRemaining,
  onCancel,
  className
}: {
  title: string
  totalItems: number
  processedItems: number
  failedItems?: number
  currentItem?: string
  estimatedTimeRemaining?: number
  onCancel?: () => void
  className?: string
}) => {
  const progress = (processedItems / totalItems) * 100
  const successfulItems = processedItems - failedItems
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <IconClock className="w-5 h-5" />
            <span>{title}</span>
          </CardTitle>
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress overview */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-600">{successfulItems}</p>
            <p className="text-xs text-muted-foreground">Processados</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-red-600">{failedItems}</p>
            <p className="text-xs text-muted-foreground">Falharam</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-muted-foreground">
              {totalItems - processedItems}
            </p>
            <p className="text-xs text-muted-foreground">Restantes</p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div className="flex h-3 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 transition-all duration-500"
                style={{ width: `${(successfulItems / totalItems) * 100}%` }}
              />
              <div 
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${(failedItems / totalItems) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* Current item and time remaining */}
        <div className="space-y-2">
          {currentItem && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Processando: <span className="font-medium">{currentItem}</span>
              </span>
            </div>
          )}
          
          {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
            <div className="flex items-center space-x-2">
              <IconClock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Tempo estimado: {formatTime(estimatedTimeRemaining)}
              </span>
            </div>
          )}
        </div>
        
        {/* Warnings */}
        {failedItems > 0 && (
          <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <IconAlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              {failedItems} item(s) falharam durante o processamento
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
DataProcessingProgress.displayName = "DataProcessingProgress"

// Export progress
export const ExportProgress = React.memo(({ 
  exportType,
  progress,
  status,
  downloadUrl,
  onDownload,
  onCancel,
  className
}: {
  exportType: string
  progress: number
  status: 'preparing' | 'generating' | 'completed' | 'failed'
  downloadUrl?: string
  onDownload?: () => void
  onCancel?: () => void
  className?: string
}) => {
  const statusConfig = {
    preparing: {
      icon: <IconClock className="w-5 h-5 text-blue-500" />,
      title: "Preparando exportação...",
      color: "blue"
    },
    generating: {
      icon: <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />,
      title: "Gerando arquivo...",
      color: "blue"
    },
    completed: {
      icon: <IconCheck className="w-5 h-5 text-green-500" />,
      title: "Exportação concluída!",
      color: "green"
    },
    failed: {
      icon: <IconX className="w-5 h-5 text-red-500" />,
      title: "Falha na exportação",
      color: "red"
    }
  }
  
  const config = statusConfig[status]
  
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          {/* Status icon */}
          <div className="flex justify-center">
            {config.icon}
          </div>
          
          {/* Title and export type */}
          <div className="space-y-1">
            <h3 className="font-semibold">{config.title}</h3>
            <p className="text-sm text-muted-foreground">
              Exportando {exportType}
            </p>
          </div>
          
          {/* Progress bar */}
          {status !== 'completed' && status !== 'failed' && (
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-500",
                    config.color === 'blue' && "bg-blue-500",
                    config.color === 'green' && "bg-green-500",
                    config.color === 'red' && "bg-red-500"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">{progress}%</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-center space-x-2">
            {status === 'completed' && downloadUrl && (
              <Button onClick={onDownload} className="flex items-center space-x-2">
                <IconDownload className="w-4 h-4" />
                <span>Baixar arquivo</span>
              </Button>
            )}
            
            {(status === 'preparing' || status === 'generating') && onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            
            {status === 'failed' && (
              <Button variant="outline" onClick={onCancel}>
                Fechar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
ExportProgress.displayName = "ExportProgress"