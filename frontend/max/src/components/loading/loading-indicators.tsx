import { Loader2, RefreshCw, Download, Upload, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'default' | 'lg' | 'xl'
  className?: string
}

export function LoadingSpinner({ size = 'default', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  )
}

interface LoadingButtonProps {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
  className?: string
  disabled?: boolean
}

export function LoadingButton({ 
  isLoading, 
  children, 
  loadingText = 'Carregando...', 
  className,
  disabled,
  ...props 
}: LoadingButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md',
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && <LoadingSpinner size="sm" />}
      {isLoading ? loadingText : children}
    </button>
  )
}

interface ProgressiveLoadingProps {
  steps: string[]
  currentStep: number
  className?: string
}

export function ProgressiveLoading({ steps, currentStep, className }: ProgressiveLoadingProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
      
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div 
            key={index}
            className={cn(
              'flex items-center gap-3 text-sm',
              index < currentStep && 'text-green-600 dark:text-green-400',
              index === currentStep && 'text-blue-600 dark:text-blue-400',
              index > currentStep && 'text-muted-foreground'
            )}
          >
            <div className={cn(
              'h-2 w-2 rounded-full',
              index < currentStep && 'bg-green-600 dark:bg-green-400',
              index === currentStep && 'bg-blue-600 dark:bg-blue-400 animate-pulse',
              index > currentStep && 'bg-muted-foreground/30'
            )} />
            {step}
          </div>
        ))}
      </div>
    </div>
  )
}

interface DataLoadingProps {
  type: 'contatos' | 'processos' | 'dashboard' | 'messages'
  count?: number
  className?: string
}

export function DataLoading({ type, count, className }: DataLoadingProps) {
  const messages = {
    contatos: 'Carregando contatos...',
    processos: 'Carregando processos...',
    dashboard: 'Carregando métricas...',
    messages: 'Carregando mensagens...'
  }

  return (
    <div className={cn('flex flex-col items-center justify-center py-8 space-y-3', className)}>
      <LoadingSpinner size="lg" />
      <div className="text-center space-y-1">
        <p className="text-sm font-medium">{messages[type]}</p>
        {count && (
          <p className="text-xs text-muted-foreground">
            {count} {type} encontrados
          </p>
        )}
      </div>
    </div>
  )
}

interface ConnectionLoadingProps {
  status: 'connecting' | 'reconnecting' | 'syncing'
  className?: string
}

export function ConnectionLoading({ status, className }: ConnectionLoadingProps) {
  const config = {
    connecting: {
      icon: Wifi,
      message: 'Conectando...',
      description: 'Estabelecendo conexão com o servidor'
    },
    reconnecting: {
      icon: RefreshCw,
      message: 'Reconectando...',
      description: 'Tentando restabelecer a conexão'
    },
    syncing: {
      icon: Download,
      message: 'Sincronizando...',
      description: 'Atualizando dados em tempo real'
    }
  }

  const { icon: Icon, message, description } = config[status]

  return (
    <div className={cn('flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg', className)}>
      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
      <div className="flex-1">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{message}</p>
        <p className="text-xs text-blue-700 dark:text-blue-300">{description}</p>
      </div>
    </div>
  )
}

interface UploadLoadingProps {
  progress?: number
  fileName?: string
  className?: string
}

export function UploadLoading({ progress, fileName, className }: UploadLoadingProps) {
  return (
    <div className={cn('space-y-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg', className)}>
      <div className="flex items-center gap-3">
        <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-bounce" />
        <div className="flex-1">
          <p className="text-sm font-medium">Enviando arquivo...</p>
          {fileName && (
            <p className="text-xs text-muted-foreground">{fileName}</p>
          )}
        </div>
      </div>
      
      {progress !== undefined && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Progresso</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface InlineLoadingProps {
  text?: string
  size?: 'sm' | 'default'
  className?: string
}

export function InlineLoading({ text = 'Carregando...', size = 'default', className }: InlineLoadingProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LoadingSpinner size={size === 'sm' ? 'sm' : 'default'} />
      <span className={cn(
        'text-muted-foreground',
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}>
        {text}
      </span>
    </div>
  )
}

// Loading overlay for existing content
interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
  className?: string
}

export function LoadingOverlay({ isLoading, children, loadingText = 'Carregando...', className }: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm font-medium">{loadingText}</p>
          </div>
        </div>
      )}
    </div>
  )
}