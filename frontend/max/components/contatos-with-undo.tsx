"use client"

import * as React from "react"
import { ContatosTable } from "@/components/contatos-table"
import { FloatingActionPanel } from "@/components/floating-action-panel"
import { UndoRedoControls } from "@/components/undo-redo-controls"
import { ActionHistoryProvider } from "@/providers/action-history-provider"
import { useBulkOperations } from "@/hooks/use-bulk-operations"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { Contato } from "@/types"

interface ContatosWithUndoProps {
  data: Contato[]
  isLoading?: boolean
  onSelectContato?: (contato: Contato) => void
  onEditContato?: (contato: Contato) => void
  availableTags?: string[]
}

function ContatosTableWithUndo({
  data,
  isLoading,
  onSelectContato,
  onEditContato,
  availableTags = [],
}: ContatosWithUndoProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [tableData, setTableData] = React.useState<Contato[]>(data)

  // Update table data when prop changes
  React.useEffect(() => {
    setTableData(data)
  }, [data])

  // Mock API functions - replace with real API calls
  const mockApiCalls = {
    updateStatus: async (ids: string[], status: Contato['status'], previousStates: any[]) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setTableData(prev => prev.map(item => 
        ids.includes(item.id) ? { ...item, status } : item
      ))
    },
    
    deleteContatos: async (ids: string[], previousStates: any[]) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setTableData(prev => prev.filter(item => !ids.includes(item.id)))
    },
    
    restoreContatos: async (ids: string[], states: any[]) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setTableData(prev => [...prev, ...states])
    },
    
    updateTags: async (ids: string[], tags: string[], previousStates: any[]) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setTableData(prev => prev.map(item => 
        ids.includes(item.id) ? { ...item, tags } as any : item
      ))
    },
    
    exportContatos: async (ids: string[], options: any) => {
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Exporting contatos:', ids, options)
    },
  }

  // Initialize bulk operations with undo/redo support
  const {
    isLoading: bulkLoading,
    bulkStatusUpdate,
    bulkDelete,
    bulkTagAssignment,
  } = useBulkOperations({
    entityType: 'contatos',
    onStatusUpdate: mockApiCalls.updateStatus,
    onDelete: mockApiCalls.deleteContatos,
    onRestore: mockApiCalls.restoreContatos,
    onTagAssignment: mockApiCalls.updateTags,
  })

  // Get selected items
  const selectedItems = React.useMemo(() => {
    return tableData.filter(item => selectedIds.includes(item.id))
  }, [tableData, selectedIds])

  // Bulk operation handlers
  const handleBulkStatusUpdate = async (ids: string[], status: Contato['status']) => {
    const items = tableData.filter(item => ids.includes(item.id))
    await bulkStatusUpdate(items, status)
  }

  const handleBulkFavoriteToggle = async (ids: string[], favorite: boolean) => {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500))
    setTableData(prev => prev.map(item => 
      ids.includes(item.id) ? { ...item, favorito: favorite } as any : item
    ))
  }

  const handleBulkTagAssignment = async (ids: string[], tags: string[]) => {
    const items = tableData.filter(item => ids.includes(item.id))
    await bulkTagAssignment(items, tags)
  }

  const handleBulkExport = async (ids: string[], options: any) => {
    await mockApiCalls.exportContatos(ids, options)
  }

  const handleBulkDelete = async (ids: string[]) => {
    const items = tableData.filter(item => ids.includes(item.id))
    await bulkDelete(items)
    setSelectedIds([])
  }

  const handleSelectAll = () => {
    setSelectedIds(tableData.map(item => item.id))
  }

  const handleClearSelection = () => {
    setSelectedIds([])
  }

  const handleDelete = () => {
    if (selectedIds.length > 0) {
      handleBulkDelete(selectedIds)
    }
  }

  const handleExport = () => {
    if (selectedIds.length > 0) {
      handleBulkExport(selectedIds, { format: 'csv' })
    }
  }

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    onSelectAll: handleSelectAll,
    onClearSelection: handleClearSelection,
    onDelete: handleDelete,
    onExport: handleExport,
  })

  return (
    <div className="space-y-4">
      {/* Undo/Redo Controls in Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Contatos</h2>
        <UndoRedoControls />
      </div>

      {/* Contatos Table */}
      <ContatosTable
        data={tableData}
        isLoading={isLoading || bulkLoading}
        onSelectContato={onSelectContato}
        onEditContato={onEditContato}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkFavoriteToggle={handleBulkFavoriteToggle}
        onBulkTagAssignment={handleBulkTagAssignment}
        onBulkExport={handleBulkExport}
        onBulkDelete={handleBulkDelete}
        availableTags={availableTags}
      />

      {/* Floating Action Panel */}
      <FloatingActionPanel
        show={selectedIds.length > 0}
        selectedCount={selectedIds.length}
        entityType="contatos"
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onDelete={handleDelete}
        onExport={handleExport}
      />
    </div>
  )
}

// Main component with ActionHistoryProvider
export function ContatosWithUndo(props: ContatosWithUndoProps) {
  return (
    <ActionHistoryProvider>
      <ContatosTableWithUndo {...props} />
    </ActionHistoryProvider>
  )
}