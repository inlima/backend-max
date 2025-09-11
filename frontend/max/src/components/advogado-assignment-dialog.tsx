"use client"

import * as React from "react"
import {
  IconUser,
  IconSearch,
  IconPlus,
  IconCheck,
  IconUserPlus,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Processo } from "@/types"

interface AdvogadoAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: Processo[]
  availableAdvogados: AdvogadoInfo[]
  onAssignAdvogado: (advogadoId: string) => Promise<void>
  isLoading?: boolean
}

interface AdvogadoInfo {
  id: string
  nome: string
  oab: string
  especialidades: string[]
  avatar?: string
  processosAtivos: number
  disponibilidade: 'disponivel' | 'ocupado' | 'indisponivel'
}

export function AdvogadoAssignmentDialog({
  open,
  onOpenChange,
  selectedItems,
  availableAdvogados,
  onAssignAdvogado,
  isLoading = false,
}: AdvogadoAssignmentDialogProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedAdvogado, setSelectedAdvogado] = React.useState<string | null>(null)

  // Get current advogados from selected items
  const currentAdvogados = React.useMemo(() => {
    const advogados = selectedItems
      .map(item => item.advogadoResponsavel)
      .filter(Boolean)
    return [...new Set(advogados)]
  }, [selectedItems])

  // Filter advogados based on search
  const filteredAdvogados = React.useMemo(() => {
    return availableAdvogados.filter(advogado => 
      advogado.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      advogado.oab.toLowerCase().includes(searchTerm.toLowerCase()) ||
      advogado.especialidades.some(esp => 
        esp.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [availableAdvogados, searchTerm])

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSearchTerm("")
      setSelectedAdvogado(null)
    }
  }, [open])

  const handleAssign = async () => {
    if (!selectedAdvogado) return
    
    try {
      await onAssignAdvogado(selectedAdvogado)
      onOpenChange(false)
    } catch (error) {
      console.error('Error assigning advogado:', error)
    }
  }

  const selectedCount = selectedItems.length

  const getDisponibilidadeColor = (disponibilidade: AdvogadoInfo['disponibilidade']) => {
    switch (disponibilidade) {
      case 'disponivel':
        return 'bg-green-100 text-green-800'
      case 'ocupado':
        return 'bg-yellow-100 text-yellow-800'
      case 'indisponivel':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDisponibilidadeLabel = (disponibilidade: AdvogadoInfo['disponibilidade']) => {
    switch (disponibilidade) {
      case 'disponivel':
        return 'Disponível'
      case 'ocupado':
        return 'Ocupado'
      case 'indisponivel':
        return 'Indisponível'
      default:
        return 'Desconhecido'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <IconUserPlus className="w-5 h-5" />
            <span>Atribuir Advogado</span>
          </DialogTitle>
          <DialogDescription>
            Atribuir advogado responsável a {selectedCount} processo{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Advogados */}
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar advogados por nome, OAB ou especialidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Current Advogados Info */}
          {currentAdvogados.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">
                Advogados atuais nos processos selecionados:
              </p>
              <div className="flex flex-wrap gap-1">
                {currentAdvogados.map((advogado) => (
                  <Badge key={advogado} variant="outline" className="text-xs">
                    {advogado}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Available Advogados */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Advogados disponíveis ({filteredAdvogados.length})
            </Label>
            
            {filteredAdvogados.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredAdvogados.map((advogado) => (
                  <div
                    key={advogado.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedAdvogado === advogado.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedAdvogado(advogado.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={advogado.avatar} alt={advogado.nome} />
                        <AvatarFallback>
                          {advogado.nome.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-sm">{advogado.nome}</h4>
                            <p className="text-xs text-muted-foreground">OAB: {advogado.oab}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {selectedAdvogado === advogado.id && (
                              <IconCheck className="w-4 h-4 text-primary" />
                            )}
                            <Badge 
                              variant="outline" 
                              className={getDisponibilidadeColor(advogado.disponibilidade)}
                            >
                              {getDisponibilidadeLabel(advogado.disponibilidade)}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Especialidades */}
                        {advogado.especialidades.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {advogado.especialidades.slice(0, 3).map((especialidade) => (
                              <Badge key={especialidade} variant="secondary" className="text-xs">
                                {especialidade}
                              </Badge>
                            ))}
                            {advogado.especialidades.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{advogado.especialidades.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {/* Workload Info */}
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span>{advogado.processosAtivos} processos ativos</span>
                          {advogado.disponibilidade === 'ocupado' && (
                            <span className="text-yellow-600">Alta demanda</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <IconUser className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhum advogado encontrado' : 'Nenhum advogado disponível'}
                </p>
              </div>
            )}
          </div>

          {/* Selected Advogado Summary */}
          {selectedAdvogado && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm font-medium text-primary mb-1">
                Advogado selecionado:
              </p>
              <p className="text-sm">
                {filteredAdvogados.find(a => a.id === selectedAdvogado)?.nome}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isLoading || !selectedAdvogado}
          >
            {isLoading ? 'Atribuindo...' : 'Atribuir Advogado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}