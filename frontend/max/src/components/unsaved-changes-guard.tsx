'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  AlertTriangle, 
  Save, 
  X,
  Clock
} from 'lucide-react'
import { useConfigurationState } from '@/hooks/use-navigation-context'
import { toast } from 'sonner'

interface UnsavedChangesGuardProps {
  children: React.ReactNode
  onSave?: () => Promise<void> | void
  autoSaveInterval?: number
}

interface NavigationWarningDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  onSave?: () => Promise<void> | void
  unsavedChanges: Record<string, any>
}

function NavigationWarningDialog({
  isOpen,
  onConfirm,
  onCancel,
  onSave,
  unsavedChanges
}: NavigationWarningDialogProps) {
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveAndContinue = async () => {
    if (onSave) {
      setIsSaving(true)
      try {
        await onSave()
        toast.success('Alterações salvas com sucesso')
        onConfirm()
      } catch (error) {
        toast.error('Erro ao salvar alterações')
        console.error('Error saving changes:', error)
      } finally {
        setIsSaving(false)
      }
    } else {
      onConfirm()
    }
  }

  const changeCount = Object.keys(unsavedChanges).length

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Alterações não salvas
          </AlertDialogTitle>
          <AlertDialogDescription>
            Você tem {changeCount} alteração{changeCount > 1 ? 'ões' : ''} não salva{changeCount > 1 ? 's' : ''} 
            que será{changeCount > 1 ? 'ão' : ''} perdida{changeCount > 1 ? 's' : ''} se você continuar.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Show preview of unsaved changes */}
        <div className="max-h-32 overflow-y-auto">
          <div className="space-y-2">
            {Object.entries(unsavedChanges).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="font-medium">{key}:</span>
                <span className="text-gray-600 truncate max-w-32">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={onCancel}>
            Cancelar
          </AlertDialogCancel>
          
          <AlertDialogAction
            onClick={onConfirm}
            variant="destructive"
          >
            <X className="h-4 w-4 mr-2" />
            Descartar alterações
          </AlertDialogAction>

          {onSave && (
            <AlertDialogAction
              onClick={handleSaveAndContinue}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar e continuar
                </>
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function UnsavedChangesIndicator({ 
  unsavedChanges, 
  lastModified, 
  onSave,
  className 
}: {
  unsavedChanges: Record<string, any>
  lastModified?: Date
  onSave?: () => Promise<void> | void
  className?: string
}) {
  const [isSaving, setIsSaving] = useState(false)
  const changeCount = Object.keys(unsavedChanges).length

  if (changeCount === 0) {
    return null
  }

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true)
      try {
        await onSave()
        toast.success('Alterações salvas com sucesso')
      } catch (error) {
        toast.error('Erro ao salvar alterações')
        console.error('Error saving changes:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  return (
    <Card className={`border-orange-200 bg-orange-50 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-orange-800">
                  Alterações não salvas
                </span>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  {changeCount}
                </Badge>
              </div>
              {lastModified && (
                <div className="flex items-center gap-1 text-sm text-orange-600 mt-1">
                  <Clock className="h-3 w-3" />
                  Modificado em {lastModified.toLocaleTimeString('pt-BR')}
                </div>
              )}
            </div>
          </div>
          
          {onSave && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar alterações
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function UnsavedChangesGuard({ 
  children, 
  onSave,
  autoSaveInterval = 30000 // 30 seconds
}: UnsavedChangesGuardProps) {
  const router = useRouter()
  const { 
    unsavedChanges, 
    lastModified, 
    hasUnsavedChanges, 
    markChangesSaved 
  } = useConfigurationState()
  
  const [showWarning, setShowWarning] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  // Auto-save functionality
  useEffect(() => {
    if (!onSave || !hasUnsavedChanges()) return

    const interval = setInterval(async () => {
      if (hasUnsavedChanges()) {
        try {
          await onSave()
          toast.success('Alterações salvas automaticamente', { duration: 2000 })
        } catch (error) {
          console.error('Auto-save failed:', error)
        }
      }
    }, autoSaveInterval)

    return () => clearInterval(interval)
  }, [onSave, hasUnsavedChanges, autoSaveInterval])

  // Browser beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Intercept navigation attempts
  useEffect(() => {
    const originalPush = router.push
    const originalReplace = router.replace

    router.push = (href: string, options?: any) => {
      if (hasUnsavedChanges()) {
        setPendingNavigation(href)
        setShowWarning(true)
        return Promise.resolve(true)
      }
      return originalPush.call(router, href, options)
    }

    router.replace = (href: string, options?: any) => {
      if (hasUnsavedChanges()) {
        setPendingNavigation(href)
        setShowWarning(true)
        return Promise.resolve(true)
      }
      return originalReplace.call(router, href, options)
    }

    return () => {
      router.push = originalPush
      router.replace = originalReplace
    }
  }, [router, hasUnsavedChanges])

  const handleConfirmNavigation = () => {
    markChangesSaved()
    setShowWarning(false)
    
    if (pendingNavigation) {
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }

  const handleCancelNavigation = () => {
    setShowWarning(false)
    setPendingNavigation(null)
  }

  const handleSaveAndContinue = async () => {
    if (onSave) {
      await onSave()
    }
    handleConfirmNavigation()
  }

  return (
    <>
      {/* Unsaved changes indicator */}
      <UnsavedChangesIndicator
        unsavedChanges={unsavedChanges}
        lastModified={lastModified}
        onSave={onSave}
        className="mb-4"
      />

      {/* Main content */}
      {children}

      {/* Navigation warning dialog */}
      <NavigationWarningDialog
        isOpen={showWarning}
        onConfirm={handleConfirmNavigation}
        onCancel={handleCancelNavigation}
        onSave={onSave ? handleSaveAndContinue : undefined}
        unsavedChanges={unsavedChanges}
      />
    </>
  )
}

// Hook for programmatic navigation with unsaved changes check
export function useSafeNavigation() {
  const router = useRouter()
  const { hasUnsavedChanges, markChangesSaved } = useConfigurationState()
  const [showWarning, setShowWarning] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  const navigateWithCheck = (href: string, onSave?: () => Promise<void> | void) => {
    if (hasUnsavedChanges()) {
      setPendingNavigation(href)
      setShowWarning(true)
    } else {
      router.push(href)
    }
  }

  const confirmNavigation = () => {
    markChangesSaved()
    setShowWarning(false)
    
    if (pendingNavigation) {
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }

  const cancelNavigation = () => {
    setShowWarning(false)
    setPendingNavigation(null)
  }

  return {
    navigateWithCheck,
    showWarning,
    pendingNavigation,
    confirmNavigation,
    cancelNavigation,
    hasUnsavedChanges: hasUnsavedChanges()
  }
}