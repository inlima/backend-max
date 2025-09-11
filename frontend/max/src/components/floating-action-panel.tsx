"use client"

import * as React from "react"
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconHistory,
  IconKeyboard,
  IconX,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useActionHistory } from "@/providers/action-history-provider"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

interface FloatingActionPanelProps {
  show: boolean
  selectedCount: number
  entityType: 'contatos' | 'processos'
  onSelectAll?: () => void
  onClearSelection?: () => void
  onDelete?: () => void
  onExport?: () => void
  className?: string
}

export function FloatingActionPanel({
  show,
  selectedCount,
  entityType,
  onSelectAll,
  onClearSelection,
  onDelete,
  onExport,
  className = "",
}: FloatingActionPanelProps) {
  const { canUndo, canRedo, undo, redo, getRecentActions } = useActionHistory()
  const { shortcuts } = useKeyboardShortcuts({
    onSelectAll,
    onClearSelection,
    onDelete,
    onExport,
  })

  const recentActions = getRecentActions(3)

  return (
    <TooltipProvider>
      {show && (
        <div
          className={`fixed bottom-6 right-6 z-50 animate-in fade-in-0 slide-in-from-bottom-2 duration-200 ${className}`}
        >
            <Card className="shadow-lg border-2">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  {/* Selection Info */}
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="px-3 py-1">
                      {selectedCount} {entityType} selecionado{selectedCount > 1 ? 's' : ''}
                    </Badge>
                    
                    {onClearSelection && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearSelection}
                            className="h-8 w-8 p-0"
                          >
                            <IconX className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Limpar seleção (Esc)</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>

                  <Separator orientation="vertical" className="h-8" />

                  {/* Undo/Redo Controls */}
                  <div className="flex items-center space-x-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={undo}
                          disabled={!canUndo}
                          className="h-8 w-8 p-0"
                        >
                          <IconArrowBackUp className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Desfazer ({shortcuts.undo})</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={redo}
                          disabled={!canRedo}
                          className="h-8 w-8 p-0"
                        >
                          <IconArrowForwardUp className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Refazer ({shortcuts.redo})</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Recent Actions */}
                    {recentActions.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <IconHistory className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Ações Recentes</h4>
                            <div className="space-y-2">
                              {recentActions.map((action, index) => (
                                <div
                                  key={action.id}
                                  className="flex items-start space-x-2 p-2 rounded-lg bg-muted/50"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {action.description}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {action.data.entityIds.length} item{action.data.entityIds.length > 1 ? 's' : ''}
                                    </p>
                                  </div>
                                  {index === 0 && canUndo && action.canUndo && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={undo}
                                      className="h-6 text-xs"
                                    >
                                      Desfazer
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  <Separator orientation="vertical" className="h-8" />

                  {/* Keyboard Shortcuts Info */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <IconKeyboard className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="end">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Atalhos do Teclado</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Selecionar tudo</span>
                            <Badge variant="outline" className="text-xs">
                              {shortcuts.selectAll}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Limpar seleção</span>
                            <Badge variant="outline" className="text-xs">
                              {shortcuts.clearSelection}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Excluir</span>
                            <Badge variant="outline" className="text-xs">
                              {shortcuts.delete}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Exportar</span>
                            <Badge variant="outline" className="text-xs">
                              {shortcuts.export}
                            </Badge>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span>Desfazer</span>
                            <Badge variant="outline" className="text-xs">
                              {shortcuts.undo}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Refazer</span>
                            <Badge variant="outline" className="text-xs">
                              {shortcuts.redo}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>
        </div>
      )}
    </TooltipProvider>
  )
}