'use client'

import { useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  IconCalendar,
  IconFilter,
  IconDownload,
  IconRefresh,
  IconX,
  IconFileTypePdf,
  IconFileTypeXls,
  IconFileTypeCsv,
  IconSettings,
  IconClock,
  IconTrendingUp
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'

interface DashboardFilters {
  dateRange: {
    start: Date | null
    end: Date | null
    preset: string
  }
  metrics: string[]
  departments: string[]
  users: string[]
  status: string[]
  priority: string[]
}

interface DashboardFiltersExportProps {
  filters: DashboardFilters
  onFiltersChange: (filters: DashboardFilters) => void
  onExport: (format: 'pdf' | 'excel' | 'csv', options: ExportOptions) => Promise<void>
  onRefresh: () => void
  isLoading?: boolean
  className?: string
}

interface ExportOptions {
  includeCharts: boolean
  includeMetrics: boolean
  includeActivities: boolean
  dateRange: { start: Date | null; end: Date | null }
  format: 'pdf' | 'excel' | 'csv'
}

// Predefined date ranges
const datePresets = [
  { label: 'Hoje', value: 'today', days: 0 },
  { label: 'Ontem', value: 'yesterday', days: 1 },
  { label: 'Últimos 7 dias', value: '7d', days: 7 },
  { label: 'Últimos 30 dias', value: '30d', days: 30 },
  { label: 'Últimos 90 dias', value: '90d', days: 90 },
  { label: 'Este mês', value: 'thisMonth', days: null },
  { label: 'Mês passado', value: 'lastMonth', days: null },
  { label: 'Este ano', value: 'thisYear', days: null },
  { label: 'Personalizado', value: 'custom', days: null }
]

const availableMetrics = [
  { label: 'Total de Contatos', value: 'totalContatos' },
  { label: 'Processos Ativos', value: 'processosAtivos' },
  { label: 'Taxa de Conversão', value: 'taxaConversao' },
  { label: 'Receita Mensal', value: 'receitaMensal' },
  { label: 'Satisfação (NPS)', value: 'npsScore' },
  { label: 'Taxa de Resposta', value: 'taxaResposta' }
]

const departments = [
  { label: 'Direito Civil', value: 'civil' },
  { label: 'Direito Trabalhista', value: 'trabalhista' },
  { label: 'Direito Criminal', value: 'criminal' },
  { label: 'Direito Empresarial', value: 'empresarial' },
  { label: 'Direito de Família', value: 'familia' }
]

const users = [
  { label: 'João Silva', value: 'joao' },
  { label: 'Maria Santos', value: 'maria' },
  { label: 'Carlos Oliveira', value: 'carlos' },
  { label: 'Ana Costa', value: 'ana' },
  { label: 'Pedro Lima', value: 'pedro' }
]

const statusOptions = [
  { label: 'Novo', value: 'novo' },
  { label: 'Em Andamento', value: 'em_andamento' },
  { label: 'Aguardando Cliente', value: 'aguardando_cliente' },
  { label: 'Finalizado', value: 'finalizado' },
  { label: 'Arquivado', value: 'arquivado' }
]

const priorityOptions = [
  { label: 'Baixa', value: 'baixa' },
  { label: 'Média', value: 'media' },
  { label: 'Alta', value: 'alta' },
  { label: 'Urgente', value: 'urgente' }
]

function DateRangePicker({ 
  value, 
  onChange 
}: { 
  value: { start: Date | null; end: Date | null; preset: string }
  onChange: (value: { start: Date | null; end: Date | null; preset: string }) => void 
}) {
  const [isOpen, setIsOpen] = useState(false)

  const handlePresetChange = (preset: string) => {
    const presetConfig = datePresets.find(p => p.value === preset)
    if (!presetConfig) return

    let start: Date | null = null
    let end: Date | null = null

    const now = new Date()
    
    if (presetConfig.days !== null) {
      if (presetConfig.value === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      } else if (presetConfig.value === 'yesterday') {
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
        end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)
      } else {
        start = new Date(now)
        start.setDate(start.getDate() - presetConfig.days)
        end = now
      }
    } else {
      // Handle month/year presets
      if (presetConfig.value === 'thisMonth') {
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      } else if (presetConfig.value === 'lastMonth') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      } else if (presetConfig.value === 'thisYear') {
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59)
      }
    }

    onChange({ start, end, preset })
  }

  const formatDateRange = () => {
    if (value.preset === 'custom' && value.start && value.end) {
      return `${value.start.toLocaleDateString('pt-BR')} - ${value.end.toLocaleDateString('pt-BR')}`
    }
    
    const preset = datePresets.find(p => p.value === value.preset)
    return preset?.label || 'Selecionar período'
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-64 justify-start text-left font-normal">
          <IconCalendar className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r p-3 space-y-2">
            <div className="text-sm font-medium">Períodos</div>
            {datePresets.map((preset) => (
              <Button
                key={preset.value}
                variant={value.preset === preset.value ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => handlePresetChange(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          {value.preset === 'custom' && (
            <div className="p-3">
              <Calendar
                mode="range"
                selected={{
                  from: value.start || undefined,
                  to: value.end || undefined
                }}
                onSelect={(range) => {
                  onChange({
                    start: range?.from || null,
                    end: range?.to || null,
                    preset: 'custom'
                  })
                }}
                numberOfMonths={2}
              />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ExportDialog({ 
  onExport, 
  isOpen, 
  onClose 
}: { 
  onExport: (format: 'pdf' | 'excel' | 'csv', options: ExportOptions) => Promise<void>
  isOpen: boolean
  onClose: () => void 
}) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeCharts: true,
    includeMetrics: true,
    includeActivities: true,
    dateRange: { start: null, end: null },
    format: 'pdf'
  })
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await onExport(exportOptions.format, exportOptions)
      onClose()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Exportar Dashboard</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <IconX className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Configure as opções de exportação do dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Formato</Label>
            <Select
              value={exportOptions.format}
              onValueChange={(value: 'pdf' | 'excel' | 'csv') =>
                setExportOptions(prev => ({ ...prev, format: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <IconFileTypePdf className="h-4 w-4" />
                    PDF Report
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <IconFileTypeXls className="h-4 w-4" />
                    Excel Spreadsheet
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <IconFileTypeCsv className="h-4 w-4" />
                    CSV Data
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Incluir no Export</Label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMetrics}
                  onChange={(e) =>
                    setExportOptions(prev => ({ ...prev, includeMetrics: e.target.checked }))
                  }
                />
                <span className="text-sm">Métricas e KPIs</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeCharts}
                  onChange={(e) =>
                    setExportOptions(prev => ({ ...prev, includeCharts: e.target.checked }))
                  }
                />
                <span className="text-sm">Gráficos e Visualizações</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeActivities}
                  onChange={(e) =>
                    setExportOptions(prev => ({ ...prev, includeActivities: e.target.checked }))
                  }
                />
                <span className="text-sm">Feed de Atividades</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={isExporting} className="flex-1">
              {isExporting ? (
                <>
                  <IconClock className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <IconDownload className="mr-2 h-4 w-4" />
                  Exportar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function DashboardFiltersExport({
  filters,
  onFiltersChange,
  onExport,
  onRefresh,
  isLoading,
  className
}: DashboardFiltersExportProps) {
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const handleFilterChange = useCallback((key: keyof DashboardFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }, [filters, onFiltersChange])

  const clearAllFilters = () => {
    onFiltersChange({
      dateRange: { start: null, end: null, preset: '30d' },
      metrics: [],
      departments: [],
      users: [],
      status: [],
      priority: []
    })
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.metrics.length > 0) count++
    if (filters.departments.length > 0) count++
    if (filters.users.length > 0) count++
    if (filters.status.length > 0) count++
    if (filters.priority.length > 0) count++
    return count
  }

  const handleExport = async (format: 'pdf' | 'excel' | 'csv', options: ExportOptions) => {
    try {
      // In a real implementation, this would call an API to generate the export
      console.log('Exporting dashboard:', { format, options, filters })
      
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Create mock download
      const filename = `dashboard-report-${new Date().toISOString().split('T')[0]}.${format}`
      const link = document.createElement('a')
      link.href = '#'
      link.download = filename
      link.click()
      
      // Show success message
      console.log(`Dashboard exported as ${format}`)
      
    } catch (error) {
      console.error('Export failed:', error)
      throw error
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Filter Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconFilter className="h-5 w-5" />
                Filtros do Dashboard
                {getActiveFiltersCount() > 0 && (
                  <Badge variant="secondary">
                    {getActiveFiltersCount()} ativo{getActiveFiltersCount() > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Personalize a visualização dos dados do dashboard
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={cn(autoRefresh && "bg-green-50 border-green-200")}
              >
                <IconTrendingUp className={cn("h-4 w-4 mr-2", autoRefresh && "text-green-600")} />
                Auto-refresh
              </Button>
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                <IconRefresh className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
                <IconDownload className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Período</Label>
              <DateRangePicker
                value={filters.dateRange}
                onChange={(value) => handleFilterChange('dateRange', value)}
              />
            </div>

            {/* Metrics Filter */}
            <div className="space-y-2">
              <Label>Métricas</Label>
              <Select
                value={filters.metrics.length > 0 ? filters.metrics[0] : 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    handleFilterChange('metrics', [])
                  } else {
                    handleFilterChange('metrics', [value])
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as métricas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as métricas</SelectItem>
                  {availableMetrics.map((metric) => (
                    <SelectItem key={metric.value} value={metric.value}>
                      {metric.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="space-y-2">
              <Label>Área Jurídica</Label>
              <Select
                value={filters.departments.length > 0 ? filters.departments[0] : 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    handleFilterChange('departments', [])
                  } else {
                    handleFilterChange('departments', [value])
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as áreas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as áreas</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select
                value={filters.users.length > 0 ? filters.users[0] : 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    handleFilterChange('users', [])
                  } else {
                    handleFilterChange('users', [value])
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.value} value={user.value}>
                      {user.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {getActiveFiltersCount() > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">Filtros ativos:</span>
                  {filters.metrics.length > 0 && (
                    <Badge variant="outline">
                      Métricas: {filters.metrics.length}
                    </Badge>
                  )}
                  {filters.departments.length > 0 && (
                    <Badge variant="outline">
                      Áreas: {filters.departments.length}
                    </Badge>
                  )}
                  {filters.users.length > 0 && (
                    <Badge variant="outline">
                      Usuários: {filters.users.length}
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <IconX className="h-4 w-4 mr-2" />
                  Limpar filtros
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <ExportDialog
        onExport={handleExport}
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
    </div>
  )
}