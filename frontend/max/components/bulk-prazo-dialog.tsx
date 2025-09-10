"use client"

import * as React from "react"
import {
  IconCalendar,
  IconClock,
  IconAlertTriangle,
  IconPlus,
  IconX,
} from "@tabler/icons-react"
import { format, addDays, addWeeks, addMonths } from "date-fns"
import { ptBR } from "date-fns/locale"

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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Processo } from "@/types"

interface BulkPrazoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: Processo[]
  onUpdatePrazos: (prazos: PrazoUpdate[]) => Promise<void>
  isLoading?: boolean
}

interface PrazoUpdate {
  processoId: string
  prazoLimite: Date
  descricao: string
  notificar: boolean
  diasAntecedencia: number
}

const quickDateOptions = [
  { label: '1 semana', days: 7 },
  { label: '2 semanas', days: 14 },
  { label: '1 mês', days: 30 },
  { label: '2 meses', days: 60 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
]

export function BulkPrazoDialog({
  open,
  onOpenChange,
  selectedItems,
  onUpdatePrazos,
  isLoading = false,
}: BulkPrazoDialogProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date>()
  const [descricao, setDescricao] = React.useState("")
  const [notificar, setNotificar] = React.useState(true)
  const [diasAntecedencia, setDiasAntecedencia] = React.useState(3)
  const [substituirExistentes, setSubstituirExistentes] = React.useState(false)

  // Get current prazos from selected items
  const processosComPrazo = React.useMemo(() => {
    return selectedItems.filter(item => item.prazoLimite)
  }, [selectedItems])

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedDate(undefined)
      setDescricao("")
      setNotificar(true)
      setDiasAntecedencia(3)
      setSubstituirExistentes(false)
    }
  }, [open])

  const handleQuickDate = (days: number) => {
    const newDate = addDays(new Date(), days)
    setSelectedDate(newDate)
  }

  const handleUpdate = async () => {
    if (!selectedDate) return
    
    const prazos: PrazoUpdate[] = selectedItems.map(processo => ({
      processoId: processo.id,
      prazoLimite: selectedDate,
      descricao: descricao || `Prazo definido em lote - ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}`,
      notificar,
      diasAntecedencia,
    }))
    
    try {
      await onUpdatePrazos(prazos)
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating prazos:', error)
    }
  }

  const selectedCount = selectedItems.length
  const processosComPrazoCount = processosComPrazo.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <IconCalendar className="w-5 h-5" />
            <span>Definir Prazo em Lote</span>
          </DialogTitle>
          <DialogDescription>
            Definir prazo limite para {selectedCount} processo{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Prazos Warning */}
          {processosComPrazoCount > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <IconAlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    Atenção: Processos com prazos existentes
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    {processosComPrazoCount} processo{processosComPrazoCount > 1 ? 's' : ''} já possu{processosComPrazoCount > 1 ? 'em' : 'i'} prazo definido.
                  </p>
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="substituir-existentes"
                        checked={substituirExistentes}
                        onCheckedChange={(checked) => setSubstituirExistentes(!!checked)}
                      />
                      <Label htmlFor="substituir-existentes" className="text-sm text-yellow-800">
                        Substituir prazos existentes
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Date Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Opções rápidas</Label>
            <div className="grid grid-cols-3 gap-2">
              {quickDateOptions.map((option) => (
                <Button
                  key={option.days}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDate(option.days)}
                  className={cn(
                    selectedDate && 
                    format(selectedDate, 'yyyy-MM-dd') === format(addDays(new Date(), option.days), 'yyyy-MM-dd') &&
                    'border-primary bg-primary/5'
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Calendar Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Selecionar data específica</Label>
            <div className="flex items-start space-x-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal min-w-[200px]",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <IconCalendar className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      "Selecionar data"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                    locale={ptBR}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              
              {selectedDate && (
                <div className="flex-1">
                  <Badge variant="outline" className="mb-2">
                    {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {Math.ceil((selectedDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias a partir de hoje
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <Label htmlFor="descricao" className="text-sm font-medium mb-2 block">
              Descrição do prazo (opcional)
            </Label>
            <Textarea
              id="descricao"
              placeholder="Ex: Prazo para entrega de documentos, Audiência marcada, etc."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>

          {/* Notification Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Configurações de notificação</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notificar"
                checked={notificar}
                onCheckedChange={(checked) => setNotificar(!!checked)}
              />
              <Label htmlFor="notificar" className="text-sm">
                Enviar notificações de lembrete
              </Label>
            </div>

            {notificar && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="dias-antecedencia" className="text-sm">
                  Notificar com quantos dias de antecedência?
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="dias-antecedencia"
                    type="number"
                    min="1"
                    max="30"
                    value={diasAntecedencia}
                    onChange={(e) => setDiasAntecedencia(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">dias</span>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedDate && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="text-sm font-medium text-primary mb-2">Resumo da operação</h4>
              <div className="space-y-1 text-sm">
                <p>• Data do prazo: <strong>{format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}</strong></p>
                <p>• Processos afetados: <strong>{selectedCount}</strong></p>
                {processosComPrazoCount > 0 && (
                  <p>• Processos com prazos existentes: <strong>{processosComPrazoCount}</strong> 
                    {substituirExistentes ? ' (serão substituídos)' : ' (serão mantidos)'}
                  </p>
                )}
                {notificar && (
                  <p>• Notificação: <strong>{diasAntecedencia} dias antes</strong></p>
                )}
              </div>
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
            onClick={handleUpdate}
            disabled={isLoading || !selectedDate}
          >
            {isLoading ? 'Definindo prazos...' : 'Definir Prazos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}