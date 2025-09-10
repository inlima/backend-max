"use client"

import * as React from "react"
import {
  IconDownload,
  IconFileTypeCsv,
  IconFileTypeXls,
  IconFileTypePdf,
  IconCheck,
  IconCalendar,
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
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface BulkExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: { id: string; nome: string }[]
  onExport: (options: ExportOptions) => Promise<void>
  isLoading?: boolean
}

interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf'
  fields: string[]
  dateRange?: {
    from: Date
    to: Date
  }
  includeConversations: boolean
  includeProcessos: boolean
}

const availableFields = [
  { id: 'nome', label: 'Nome', required: true },
  { id: 'telefone', label: 'Telefone', required: true },
  { id: 'email', label: 'Email', required: false },
  { id: 'status', label: 'Status', required: false },
  { id: 'origem', label: 'Origem', required: false },
  { id: 'areaInteresse', label: 'Área de Interesse', required: false },
  { id: 'tipoSolicitacao', label: 'Tipo de Solicitação', required: false },
  { id: 'primeiroContato', label: 'Primeiro Contato', required: false },
  { id: 'ultimaInteracao', label: 'Última Interação', required: false },
  { id: 'tags', label: 'Tags', required: false },
  { id: 'endereco', label: 'Endereço', required: false },
  { id: 'observacoes', label: 'Observações', required: false },
]

const formatOptions = [
  {
    value: 'csv' as const,
    label: 'CSV',
    description: 'Arquivo de texto separado por vírgulas',
    icon: IconFileTypeCsv,
    color: 'text-green-600',
  },
  {
    value: 'xlsx' as const,
    label: 'Excel',
    description: 'Planilha do Microsoft Excel',
    icon: IconFileTypeXls,
    color: 'text-green-700',
  },
  {
    value: 'pdf' as const,
    label: 'PDF',
    description: 'Documento PDF formatado',
    icon: IconFileTypePdf,
    color: 'text-red-600',
  },
]

export function BulkExportDialog({
  open,
  onOpenChange,
  selectedItems,
  onExport,
  isLoading = false,
}: BulkExportDialogProps) {
  const [format, setFormat] = React.useState<'csv' | 'xlsx' | 'pdf'>('csv')
  const [selectedFields, setSelectedFields] = React.useState<string[]>(() => 
    availableFields.filter(field => field.required).map(field => field.id)
  )
  const [includeConversations, setIncludeConversations] = React.useState(false)
  const [includeProcessos, setIncludeProcessos] = React.useState(false)
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date }>({})

  const handleFieldToggle = (fieldId: string) => {
    const field = availableFields.find(f => f.id === fieldId)
    if (field?.required) return // Can't uncheck required fields

    setSelectedFields(prev => 
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    )
  }

  const handleSelectAll = () => {
    setSelectedFields(availableFields.map(field => field.id))
  }

  const handleSelectRequired = () => {
    setSelectedFields(availableFields.filter(field => field.required).map(field => field.id))
  }

  const handleExport = async () => {
    const options: ExportOptions = {
      format,
      fields: selectedFields,
      includeConversations,
      includeProcessos,
      ...(dateRange.from && dateRange.to && {
        dateRange: {
          from: dateRange.from,
          to: dateRange.to,
        }
      }),
    }

    try {
      await onExport(options)
      onOpenChange(false)
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  const selectedCount = selectedItems.length
  const selectedFieldsCount = selectedFields.length
  const requiredFieldsCount = availableFields.filter(f => f.required).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <IconDownload className="w-5 h-5" />
            <span>Exportar Contatos</span>
          </DialogTitle>
          <DialogDescription>
            Exportar {selectedCount} contato{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Formato do arquivo</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as any)}>
              <div className="grid grid-cols-1 gap-3">
                {formatOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-3">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label
                      htmlFor={option.value}
                      className="flex items-center space-x-3 cursor-pointer flex-1 p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <option.icon className={`w-6 h-6 ${option.color}`} />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Field Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium">
                Campos para exportar ({selectedFieldsCount} selecionados)
              </Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectRequired}
                >
                  Apenas obrigatórios
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  Selecionar todos
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 border rounded-lg">
              {availableFields.map((field) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`field-${field.id}`}
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={() => handleFieldToggle(field.id)}
                    disabled={field.required}
                  />
                  <Label
                    htmlFor={`field-${field.id}`}
                    className={cn(
                      "text-sm cursor-pointer",
                      field.required && "font-medium"
                    )}
                  >
                    {field.label}
                    {field.required && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Obrigatório
                      </Badge>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Additional Options */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Opções adicionais</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-conversations"
                  checked={includeConversations}
                  onCheckedChange={(checked) => setIncludeConversations(!!checked)}
                />
                <Label htmlFor="include-conversations" className="text-sm">
                  Incluir histórico de conversas
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-processos"
                  checked={includeProcessos}
                  onCheckedChange={(checked) => setIncludeProcessos(!!checked)}
                />
                <Label htmlFor="include-processos" className="text-sm">
                  Incluir processos relacionados
                </Label>
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Filtro por período (opcional)</Label>
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <IconCalendar className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                          {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                      )
                    ) : (
                      "Selecionar período"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              {dateRange.from && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({})}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
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
            onClick={handleExport}
            disabled={isLoading || selectedFieldsCount === 0}
          >
            {isLoading ? 'Exportando...' : `Exportar ${format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}