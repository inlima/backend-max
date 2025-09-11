"use client"

import * as React from "react"
import {
  IconDownload,
  IconEdit,
  IconHeart,
  IconHeartFilled,
  IconTag,
  IconTrash,
  IconX,
  IconCheck,
  IconAlertTriangle,
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
import { Contato } from "@/types"

interface BulkActionsToolbarProps {
  selectedItems: Contato[]
  onClearSelection: () => void
  onBulkStatusUpdate: (status: Contato['status']) => Promise<void>
  onBulkFavoriteToggle: (favorite: boolean) => Promise<void>
  onBulkTagAssignment: (tags: string[]) => Promise<void>
  onBulkExport: (format: 'csv' | 'xlsx' | 'pdf') => Promise<void>
  onBulkDelete: () => Promise<void>
  isLoading?: boolean
}

export function BulkActionsToolbar({
  selectedItems,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkFavoriteToggle,
  onBulkTagAssignment,
  onBulkExport,
  onBulkDelete,
  isLoading = false,
}: BulkActionsToolbarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [showTagDialog, setShowTagDialog] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<string | null>(null)

  const selectedCount = selectedItems.length

  if (selectedCount === 0) {
    return null
  }

  const handleStatusUpdate = async (status: Contato['status']) => {
    setPendingAction('status')
    try {
      await onBulkStatusUpdate(status)
    } finally {
      setPendingAction(null)
    }
  }

  const handleFavoriteToggle = async (favorite: boolean) => {
    setPendingAction('favorite')
    try {
      await onBulkFavoriteToggle(favorite)
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

  const handleDelete = async () => {
    setPendingAction('delete')
    try {
      await onBulkDelete()
      setShowDeleteDialog(false)
    } finally {
      setPendingAction(null)
    }
  }

  const statusOptions = [
    { value: 'novo' as const, label: 'Novo', color: 'bg-green-100 text-green-800' },
    { value: 'existente' as const, label: 'Existente', color: 'bg-blue-100 text-blue-800' },
    { value: 'em_atendimento' as const, label: 'Em Atendimento', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'finalizado' as const, label: 'Finalizado', color: 'bg-gray-100 text-gray-800' },
  ]

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
        <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="px-3 py-1">
            {selectedCount} contato{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
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

            {/* Favorite Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading || pendingAction === 'favorite'}
                >
                  <IconHeart className="w-4 h-4 mr-2" />
                  Favoritos
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleFavoriteToggle(true)}>
                  <IconHeartFilled className="w-4 h-4 mr-2 text-red-500" />
                  Marcar como favorito
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleFavoriteToggle(false)}>
                  <IconHeart className="w-4 h-4 mr-2" />
                  Remover dos favoritos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tag Assignment */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTagDialog(true)}
              disabled={isLoading || pendingAction === 'tags'}
            >
              <IconTag className="w-4 h-4 mr-2" />
              Tags
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

            {/* Delete */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isLoading || pendingAction === 'delete'}
              className="text-destructive hover:text-destructive"
            >
              <IconTrash className="w-4 h-4 mr-2" />
              Excluir
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <IconAlertTriangle className="w-5 h-5 text-destructive" />
              <span>Confirmar exclusão</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedCount} contato{selectedCount > 1 ? 's' : ''}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingAction === 'delete'}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={pendingAction === 'delete'}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pendingAction === 'delete' ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tag Assignment Dialog - Placeholder for now */}
      {showTagDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Gerenciar Tags</h3>
            <p className="text-muted-foreground mb-4">
              Funcionalidade de gerenciamento de tags será implementada em breve.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowTagDialog(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}