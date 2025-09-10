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
import { Processo } from "@/types"

interface BulkExportProcessosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: Processo[]
  onExport: (options: ExportProcessosOptions) => Promise<void>
  isLoading?: boolean
}

interface ExportProcessosOptions {
  format: 'csv' | 'xlsx' | 'pdf'
  fields: string[]
  dateRange?: {
    from: Date
    to: Date
  }
  includeDocuments: boolean
  includeTimeline: boolean
  includeFinancial: boolean
  groupBy?: 'status' | 'area' | 'advogado' | 'none'
}

const availableFields = [
  { id: 'titulo', label: 'Título', required: true },
  { id: 'numero', label: 'Número do Processo', required: false },
  { id: 'cliente', label: 'Cliente', required: true },
  { id: 'areaJuridica', label: 'Área Jurídica', required: false },
  { id: 'status', label: 'Status', required: false },
  { id: 'prioridade', label: 'Prioridade', required: false },
  { id: 'advogadoResponsavel', label: 'Advogado Responsável', required: false },
  { id: 'dataAbertura', label: 'Data de Abertura', required: false },
  { id: 'dataUltimaAtualizacao', label: 'Última Atualização', required: false },
  { id: 'prazoLimite', label: 'Prazo Limite', required: false },
  { id: 'origem', label: 'Origem', required: false },
  { id: 'descricao', label: 'Descrição', required: false },
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
    description: 'Relatório PDF formatado',
    icon: IconFileTypePdf,
    color: 'text-red-600',
  },
]

const groupByOptions = [
  { value: 'none', label: 'Sem agrupamento' },
  { value: 'status', label: 'Agrupar por Status' },
  { value: 'area', label: 'Agrupar por Área Jurídica' },
  { value: 'advogado', label: 'Agrupar por Advogado' },
]

export function BulkExportProcessosDialog({
  open,
  onOpenChange,
  selectedItems,
  onExport,
  isLoading = false,
}: BulkExportProcessosDialogProps) {
  const [format, setFormat] = React.useState<'csv' | 'xlsx' | 'pdf'>('csv')
  const [selectedFields, setSelectedFields] = React.useState<string[]>(() => 
    availableFields.filter(field => field.required).map(field => field.id)
  )
  const [includeDocuments, setIncludeDocuments] = React.useState(false)
  const [includeTimeline, setIncludeTimeline] = React.useState(false)
  const [includeFinancial, setIncludeFinancial] = React.useState(false)
  const [groupBy, setGroupBy] = React.useState<'status' | 'area' | 'advogado' | 'none'>('none')
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
    const options: ExportProcessosOptions = {
      format,
      fields: selectedFields,
      includeDocuments,
      includeTimeline,
      includeFinancial,
      groupBy,
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
      console.error('Error exporting processos:', error)
    }
  }

  const selectedCount = selectedItems.length
  const selectedFieldsCount = selectedFields.length

  // Get statistics from selected items
  const stats = React.useMemo(() => {
    const statusCount = selectedItems.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const areaCount = selectedItems.reduce((acc, item) => {
      acc[item.areaJuridica] = (acc[item.areaJuridica] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { statusCount, areaCount }
  }, [selectedItems])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <IconDownload className="w-5 h-5" />
            <span>Exportar Processos</span>
          </DialogTitle>
          <DialogDescription>
            Exportar {selectedCount} processo{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <h4 className="text-sm font-medium mb-2">Por Status</h4>
              <div className="space-y-1">
                {Object.entries(stats.statusCount).map(([status, count]) => (
                  <div key={status} className="flex justify-between text-sm">
                    <span className="capitalize">{status.replace('_', ' ')}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Por Área</h4>
              <div className="space-y-1">
                {Object.entries(stats.areaCount).slice(0, 4).map(([area, count]) => (
                  <div key={area} className="flex justify-between text-sm">
                    <span className="truncate">{area}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
                {Object.keys(stats.areaCount).length > 4 && (
                  <div className="text-xs text-muted-foreground">
                    +{Object.keys(stats.areaCount).length - 4} outras áreas
                  </div>
                )}
              </div>
            </div>
          </div>

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

          {/* Additional Data Options */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Dados adicionais</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-documents"
                  checked={includeDocuments}
                  onCheckedChange={(checked) => setIncludeDocuments(!!checked)}
                />
                <Label htmlFor="include-documents" className="text-sm">
                  Incluir lista de documentos anexados
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-timeline"
                  checked={includeTimeline}
                  onCheckedChange={(checked) => setIncludeTimeline(!!checked)}
                />
                <Label htmlFor="include-timeline" className="text-sm">
                  Incluir histórico de eventos (timeline)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-financial"
                  checked={includeFinancial}
                  onCheckedChange={(checked) => setIncludeFinancial(!!checked)}
                />
                <Label htmlFor="include-financial" className="text-sm">
                  Incluir informações financeiras
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Grouping Options */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Organização dos dados</Label>
            <RadioGroup value={groupBy} onValueChange={(value) => setGroupBy(value as any)}>
              <div className="grid grid-cols-2 gap-2">
                {groupByOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={`group-${option.value}`} />
                    <Label htmlFor={`group-${option.value}`} className="text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
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