"use client"

import * as React from "react"
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconHistory,
  IconClock,
  IconX,
} from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { useActionHistory } from "@/providers/action-history-provider"

interface UndoRedoControlsProps {
  className?: string
  showHistory?: boolean
}

export function UndoRedoControls({ 
  className = "", 
  showHistory = true 
}: UndoRedoControlsProps) {
  const { 
    canUndo, 
    canRedo, 
    undo, 
    redo, 
    getRecentActions, 
    clearHistory 
  } = useActionHistory()

  const recentActions = getRecentActions(10)

  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case 'bulk_status_update':
        return 'Atualização de status em lote'
      case 'bulk_delete':
        return 'Exclusão em lote'
      case 'bulk_tag_assignment':
        return 'Atribuição de tags em lote'
      case 'bulk_advogado_assignment':
        return 'Atribuição de advogado em lote'
      case 'bulk_prazo_update':
        return 'Atualização de prazo em lote'
      case 'bulk_archive':
        return 'Arquivamento em lote'
      default:
        return 'Ação desconhecida'
    }
  }

  const getActionTypeColor = (type: string) => {
    switch (type) {
      case 'bulk_status_update':
        return 'bg-blue-100 text-blue-800'
      case 'bulk_delete':
        return 'bg-red-100 text-red-800'
      case 'bulk_tag_assignment':
        return 'bg-purple-100 text-purple-800'
      case 'bulk_advogado_assignment':
        return 'bg-green-100 text-green-800'
      case 'bulk_prazo_update':
        return 'bg-orange-100 text-orange-800'
      case 'bulk_archive':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center space-x-1 ${className}`}>
        {/* Undo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              className="h-8 w-8 p-0"
            >
              <IconArrowBackUp className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{canUndo ? 'Desfazer última ação' : 'Nenhuma ação para desfazer'}</p>
          </TooltipContent>
        </Tooltip>

        {/* Redo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              className="h-8 w-8 p-0"
            >
              <IconArrowForwardUp className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{canRedo ? 'Refazer última ação' : 'Nenhuma ação para refazer'}</p>
          </TooltipContent>
        </Tooltip>

        {/* History Dropdown */}
        {showHistory && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={recentActions.length === 0}
              >
                <IconHistory className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between p-2 border-b">
                <span className="text-sm font-medium">Histórico de Ações</span>
                {recentActions.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <IconX className="w-3 h-3" />
                  </Button>
                )}
              </div>
              
              {recentActions.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  {recentActions.map((action, index) => (
                    <DropdownMenuItem
                      key={action.id}
                      className="flex flex-col items-start p-3 cursor-default"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getActionTypeColor(action.type)}`}
                        >
                          {getActionTypeLabel(action.type)}
                        </Badge>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <IconClock className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(action.timestamp, { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-left w-full">{action.description}</p>
                      
                      <div className="flex items-center justify-between w-full mt-1">
                        <span className="text-xs text-muted-foreground">
                          {action.data.entityIds.length} item{action.data.entityIds.length > 1 ? 's' : ''} • {action.data.entityType}
                        </span>
                        {action.canUndo && index === 0 && canUndo && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              undo()
                            }}
                            className="h-6 text-xs"
                          >
                            Desfazer
                          </Button>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma ação recente
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </TooltipProvider>
  )
}