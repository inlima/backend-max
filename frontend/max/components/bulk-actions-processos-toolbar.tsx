"use client"

import * as React from "react"
import {
  IconDownload,
  IconEdit,
  IconUser,
  IconCalendar,
  IconTrash,
  IconX,
  IconCheck,
  IconAlertTriangle,
  IconArchive,
  IconClock,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Processo } from "@/types"

interface BulkActionsProcessosToolbarProps {
  selectedItems: Processo[]
  onClearSelection: () => void
  onBulkStatusUpdate: (status: Processo['status']) => Promise<void>
  onBulkAdvogadoAssignment: (advogado: string) => Promise<void>
  onBulkPrazoUpdate: (prazo: Date) => Promise<void>
  onBulkExport: (format: 'csv' | 'xlsx' | 'pdf') => Promise<void>
  onBulkArchive: () => Promise<void>
  availableAdvogados?: string[]
  isLoading?: boolean
}

export function BulkActionsProcessosToolbar({
  selectedItems,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkAdvogadoAssignment,
  onBulkPrazoUpdate,
  onBulkExport,
  onBulkArchive,
  availableAdvogados = [],
  isLoading = false,
}: BulkActionsProcessosToolbarProps) {
  const [showArchiveDialog, setShowArchiveDialog] = React.useState(false)
  const [showAdvogadoDialog, setShowAdvogadoDialog] = React.useState(false)
  const [showPrazoDialog, setShowPrazoDialog] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<string | null>(null)

  const selectedCount = selectedItems.length

  if (selectedCount === 0) {
    return null
  }

  const handleStatusUpdate = async (status: Processo['status']) => {
    setPendingAction('status')
    try {
      await onBulkStatusUpdate(status)
    } finally {
      setPendingAction(null)
    }
  }

  const handleAdvogadoAssignment = async (advogado: string) => {
    setPendingAction('advogado')
    try {
      await onBulkAdvogadoAssignment(advogado)
      setShowAdvogadoDialog(false)
    } finally {
      setPendingAction(null)
    }
  }

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setPendingAction('export')
    try {
      await onBulkExport(format)
    } finally {
      setPendingAction(null)
    }
  }

  const handleArchive = async () => {
    setPendingAction('archive')
    try {
      await onBulkArchive()
      setShowArchiveDialog(false)
    } finally {
      setPendingAction(null)
    }
  }

  const statusOptions = [
    { value: 'novo' as const, label: 'Novo', color: 'bg-green-100 text-green-800' },
    { value: 'em_andamento' as const, label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
    { value: 'aguardando_cliente' as const, label: 'Aguardando Cliente', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'finalizado' as const, label: 'Finalizado', color: 'bg-gray-100 text-gray-800' },
  ]

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
        <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="px-3 py-1">
            {selectedCount} processo{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
          </Badge>
          
          <div className="flex items-center space-x-2">
            {/* Status Update */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={isLoading || pendingAction === 'status'}
                >
                  <IconEdit className="w-4 h-4 mr-2" />
                  Alterar Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {statusOptions.map((status) => (
                  <DropdownMenuItem
                    key={status.value}
                    onClick={() => handleStatusUpdate(status.value)}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${status.color.split(' ')[0]}`} />
                      <span>{status.label}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Advogado Assignment */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAdvogadoDialog(true)}
              disabled={isLoading || pendingAction === 'advogado'}
            >
              <IconUser className="w-4 h-4 mr-2" />
              Atribuir Advogado
            </Button>

            {/* Prazo Update */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPrazoDialog(true)}
              disabled={isLoading || pendingAction === 'prazo'}
            >
              <IconCalendar className="w-4 h-4 mr-2" />
              Definir Prazo
            </Button>

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading || pendingAction === 'export'}
                >
                  <IconDownload className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Exportar como CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                  Exportar como Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  Exportar como PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenuSeparator />

            {/* Archive */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowArchiveDialog(true)}
              disabled={isLoading || pendingAction === 'archive'}
              className="text-orange-600 hover:text-orange-600"
            >
              <IconArchive className="w-4 h-4 mr-2" />
              Arquivar
            </Button>
          </div>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearSelection}
          disabled={isLoading}
        >
          <IconX className="w-4 h-4 mr-2" />
          Limpar seleção
        </Button>
      </div>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <IconAlertTriangle className="w-5 h-5 text-orange-500" />
              <span>Confirmar arquivamento</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja arquivar {selectedCount} processo{selectedCount > 1 ? 's' : ''}? 
              Processos arquivados podem ser restaurados posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingAction === 'archive'}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={pendingAction === 'archive'}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {pendingAction === 'archive' ? 'Arquivando...' : 'Arquivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Advogado Assignment Dialog - Placeholder for now */}
      {showAdvogadoDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Atribuir Advogado</h3>
            <div className="space-y-3 mb-4">
              {availableAdvogados.length > 0 ? (
                availableAdvogados.map((advogado) => (
                  <Button
                    key={advogado}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleAdvogadoAssignment(advogado)}
                    disabled={pendingAction === 'advogado'}
                  >
                    <IconUser className="w-4 h-4 mr-2" />
                    {advogado}
                  </Button>
                ))
              ) : (
                <p className="text-muted-foreground">Nenhum advogado disponível.</p>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowAdvogadoDialog(false)}
                disabled={pendingAction === 'advogado'}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Prazo Update Dialog - Placeholder for now */}
      {showPrazoDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Definir Prazo</h3>
            <p className="text-muted-foreground mb-4">
              Funcionalidade de definição de prazo em lote será implementada em breve.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowPrazoDialog(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}