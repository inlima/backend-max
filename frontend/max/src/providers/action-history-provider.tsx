"use client"

import * as React from "react"
import { toast } from "sonner"

interface ActionHistoryItem {
  id: string
  type: 'bulk_status_update' | 'bulk_delete' | 'bulk_tag_assignment' | 'bulk_advogado_assignment' | 'bulk_prazo_update' | 'bulk_archive'
  description: string
  timestamp: Date
  data: {
    entityType: 'contatos' | 'processos'
    entityIds: string[]
    previousState: any
    newState: any
    reverseAction: () => Promise<void>
  }
  canUndo: boolean
}

interface ActionHistoryContextType {
  history: ActionHistoryItem[]
  canUndo: boolean
  canRedo: boolean
  addAction: (action: Omit<ActionHistoryItem, 'id' | 'timestamp'>) => void
  undo: () => Promise<void>
  redo: () => Promise<void>
  clearHistory: () => void
  getRecentActions: (limit?: number) => ActionHistoryItem[]
}

const ActionHistoryContext = React.createContext<ActionHistoryContextType | undefined>(undefined)

interface ActionHistoryProviderProps {
  children: React.ReactNode
  maxHistorySize?: number
}

export function ActionHistoryProvider({ 
  children, 
  maxHistorySize = 50 
}: ActionHistoryProviderProps) {
  const [history, setHistory] = React.useState<ActionHistoryItem[]>([])
  const [currentIndex, setCurrentIndex] = React.useState(-1)
  const [isUndoing, setIsUndoing] = React.useState(false)
  const [isRedoing, setIsRedoing] = React.useState(false)

  const canUndo = currentIndex >= 0 && !isUndoing && !isRedoing
  const canRedo = currentIndex < history.length - 1 && !isUndoing && !isRedoing

  const addAction = React.useCallback((action: Omit<ActionHistoryItem, 'id' | 'timestamp'>) => {
    const newAction: ActionHistoryItem = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }

    setHistory(prev => {
      // Remove any actions after current index (when adding new action after undo)
      const newHistory = prev.slice(0, currentIndex + 1)
      
      // Add new action
      newHistory.push(newAction)
      
      // Limit history size
      if (newHistory.length > maxHistorySize) {
        return newHistory.slice(-maxHistorySize)
      }
      
      return newHistory
    })

    setCurrentIndex(prev => {
      const newIndex = Math.min(prev + 1, maxHistorySize - 1)
      return newIndex
    })

    // Show toast notification
    toast.success(action.description, {
      action: action.canUndo ? {
        label: "Desfazer",
        onClick: () => undo(),
      } : undefined,
    })
  }, [currentIndex, maxHistorySize])

  const undo = React.useCallback(async () => {
    if (!canUndo) return

    const actionToUndo = history[currentIndex]
    if (!actionToUndo || !actionToUndo.canUndo) return

    setIsUndoing(true)
    
    try {
      await actionToUndo.data.reverseAction()
      setCurrentIndex(prev => prev - 1)
      
      toast.success(`Desfeito: ${actionToUndo.description}`, {
        action: {
          label: "Refazer",
          onClick: () => redo(),
        },
      })
    } catch (error) {
      console.error('Error undoing action:', error)
      toast.error('Erro ao desfazer ação')
    } finally {
      setIsUndoing(false)
    }
  }, [canUndo, currentIndex, history])

  const redo = React.useCallback(async () => {
    if (!canRedo) return

    const actionToRedo = history[currentIndex + 1]
    if (!actionToRedo) return

    setIsRedoing(true)
    
    try {
      // Re-execute the original action
      // This would need to be implemented based on the specific action type
      setCurrentIndex(prev => prev + 1)
      
      toast.success(`Refeito: ${actionToRedo.description}`)
    } catch (error) {
      console.error('Error redoing action:', error)
      toast.error('Erro ao refazer ação')
    } finally {
      setIsRedoing(false)
    }
  }, [canRedo, currentIndex, history])

  const clearHistory = React.useCallback(() => {
    setHistory([])
    setCurrentIndex(-1)
    toast.info('Histórico de ações limpo')
  }, [])

  const getRecentActions = React.useCallback((limit: number = 10) => {
    return history.slice(-limit).reverse()
  }, [history])

  const value = React.useMemo(() => ({
    history,
    canUndo,
    canRedo,
    addAction,
    undo,
    redo,
    clearHistory,
    getRecentActions,
  }), [
    history,
    canUndo,
    canRedo,
    addAction,
    undo,
    redo,
    clearHistory,
    getRecentActions,
  ])

  return (
    <ActionHistoryContext.Provider value={value}>
      {children}
    </ActionHistoryContext.Provider>
  )
}

export function useActionHistory() {
  const context = React.useContext(ActionHistoryContext)
  if (context === undefined) {
    throw new Error('useActionHistory must be used within an ActionHistoryProvider')
  }
  return context
}