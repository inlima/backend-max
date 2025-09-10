"use client"

import * as React from "react"
import { ProcessosTable } from "@/components/processos-table"
import { FloatingActionPanel } from "@/components/floating-action-panel"
import { UndoRedoControls } from "@/components/undo-redo-controls"
import { ActionHistoryProvider } from "@/providers/action-history-provider"
import { useBulkOperations } from "@/hooks/use-bulk-operations"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { Processo } from "@/types"

interface ProcessosWithUndoProps {
  data: Processo[]
  isLoading?: boolean
  onSelectProcesso?: (processo: Processo) => void
  onEditProcesso?: (processo: Processo) => void
  onUpdateStatus?: (processo: Processo, newStatus: Processo['status']) => void
  availableAdvogados?: any[]
}

function ProcessosTableWithUndo({
  data,
  isLoading,
  onSelectProcesso,
  onEditProcesso,
  onUpdateStatus,
  availableAdvogados = [],
}: ProcessosWithUndoProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [tableData, setTableData] = React.useState<Processo[]>(data)

  // Update table data when prop changes
  React.useEffect(() => {
    setTableData(data)
  }, [data])

  // Mock API functions - replace with real API calls
  const mockApiCalls = {
    updateStatus: async (ids: string[], status: Processo['status'], previousStates: any[]) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setTableData(prev => prev.map(item => 
        ids.includes(item.id) ? { ...item, status } : item
      ))
    },
    
    assignAdvogado: async (ids: string[], advogadoId: string, previousStates: any[]) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      const advogado = availableAdvogados.find(a => a.id === advogadoId)
      setTableData(prev => prev.map(item => 
        ids.includes(item.id) ? { ...item, advogadoResponsavel: advogado?.nome || advogadoId } : item
      ))
    },
    
    updatePrazos: async (ids: string[], prazos: any[], previousStates: any[]) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setTableData(prev => prev.map(item => {
        const prazo = prazos.find(p => p.processoId === item.id)
        return ids.includes(item.id) && prazo ? { ...item, prazoLimite: prazo.prazoLimite } : item
      }))
    },
    
    archiveProcessos: async (ids: string[], previousStates: any[]) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setTableData(prev => prev.map(item => 
        ids.includes(item.id) ? { ...item, status: 'arquivado' as const } : item
      ))
    },
    
    exportProcessos: async (ids: string[], options: any) => {
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Exporting processos:', ids, options)
    },
  }

  // Initialize bulk operations with undo/redo support
  const {
    isLoading: bulkLoading,
    bulkStatusUpdate,
    bulkAdvogadoAssignment,
    bulkPrazoUpdate,
    bulkArchive,
  } = useBulkOperations({
    entityType: 'processos',
    onStatusUpdate: mockApiCalls.updateStatus,
    onAdvogadoAssignment: mockApiCalls.assignAdvogado,
    onPrazoUpdate: mockApiCalls.updatePrazos,
    onArchive: mockApiCalls.archiveProcessos,
  })

  // Get selected items
  const selectedItems = React.useMemo(() => {
    return tableData.filter(item => selectedIds.includes(item.id))
  }, [tableData, selectedIds])

  // Bulk operation handlers
  const handleBulkStatusUpdate = async (ids: string[], status: Processo['status']) => {
    const items = tableData.filter(item => ids.includes(item.id))
    await bulkStatusUpdate(items, status)
  }

  const handleBulkAdvogadoAssignment = async (ids: string[], advogadoId: string) => {
    const items = tableData.filter(item => ids.includes(item.id))
    await bulkAdvogadoAssignment(items, advogadoId)
  }

  const handleBulkPrazoUpdate = async (ids: string[], prazos: any[]) => {
    const items = tableData.filter(item => ids.includes(item.id))
    await bulkPrazoUpdate(items, prazos)
  }

  const handleBulkExport = async (ids: string[], options: any) => {
    await mockApiCalls.exportProcessos(ids, options)
  }

  const handleBulkArchive = async (ids: string[]) => {
    const items = tableData.filter(item => ids.includes(item.id))
    await bulkArchive(items)
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
      handleBulkArchive(selectedIds)
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
        <h2 className="text-2xl font-bold">Processos</h2>
        <UndoRedoControls />
      </div>

      {/* Processos Table */}
      <ProcessosTable
        data={tableData}
        isLoading={isLoading || bulkLoading}
        onSelectProcesso={onSelectProcesso}
        onEditProcesso={onEditProcesso}
        onUpdateStatus={onUpdateStatus}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkAdvogadoAssignment={handleBulkAdvogadoAssignment}
        onBulkPrazoUpdate={handleBulkPrazoUpdate}
        onBulkExport={handleBulkExport}
        onBulkArchive={handleBulkArchive}
        availableAdvogados={availableAdvogados}
      />

      {/* Floating Action Panel */}
      <FloatingActionPanel
        show={selectedIds.length > 0}
        selectedCount={selectedIds.length}
        entityType="processos"
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onDelete={handleDelete}
        onExport={handleExport}
      />
    </div>
  )
}

// Main component with ActionHistoryProvider
export function ProcessosWithUndo(props: ProcessosWithUndoProps) {
  return (
    <ActionHistoryProvider>
      <ProcessosTableWithUndo {...props} />
    </ActionHistoryProvider>
  )
}