"use client"

import * as React from "react"
import { useActionHistory } from "@/providers/action-history-provider"

interface KeyboardShortcutsOptions {
  enableUndoRedo?: boolean
  enableBulkOperations?: boolean
  onSelectAll?: () => void
  onClearSelection?: () => void
  onDelete?: () => void
  onExport?: () => void
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { undo, redo, canUndo, canRedo } = useActionHistory()
  
  const {
    enableUndoRedo = true,
    enableBulkOperations = true,
    onSelectAll,
    onClearSelection,
    onDelete,
    onExport,
  } = options

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field
      const target = event.target as HTMLElement
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true'

      // Undo/Redo shortcuts
      if (enableUndoRedo && (event.ctrlKey || event.metaKey)) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault()
          if (canUndo) {
            undo()
          }
          return
        }
        
        if ((event.key === 'y') || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault()
          if (canRedo) {
            redo()
          }
          return
        }
      }

      // Bulk operation shortcuts (only when not in input fields)
      if (enableBulkOperations && !isInputField) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
          event.preventDefault()
          onSelectAll?.()
          return
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          onClearSelection?.()
          return
        }

        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault()
          onDelete?.()
          return
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
          event.preventDefault()
          onExport?.()
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    enableUndoRedo,
    enableBulkOperations,
    canUndo,
    canRedo,
    undo,
    redo,
    onSelectAll,
    onClearSelection,
    onDelete,
    onExport,
  ])

  return {
    shortcuts: {
      undo: 'Ctrl+Z',
      redo: 'Ctrl+Y',
      selectAll: 'Ctrl+A',
      clearSelection: 'Esc',
      delete: 'Delete',
      export: 'Ctrl+E',
    }
  }
}