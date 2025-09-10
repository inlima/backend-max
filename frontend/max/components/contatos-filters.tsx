"use client"

import * as React from "react"
import { Search, X, Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ContatosFilters as ContatosFiltersType } from "@/types"
import { debounce } from "@/lib/performance-utils"

interface ContatosFiltersProps {
  filters: ContatosFiltersType
  onFiltersChange: (filters: ContatosFiltersType) => void
  onClearFilters: () => void
}

export function ContatosFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: ContatosFiltersProps) {
  const [searchValue, setSearchValue] = React.useState(filters.search || "")
  const [dateRange, setDateRange] = React.useState<{
    from: Date | undefined
    to: Date | undefined
  }>({
    from: filters.dataInicio ? new Date(filters.dataInicio) : undefined,
    to: filters.dataFim ? new Date(filters.dataFim) : undefined,
  })

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({
        ...filters,
        search: searchValue || undefined,
      })
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue])

  // Handle date range changes
  React.useEffect(() => {
    onFiltersChange({
      ...filters,
      dataInicio: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      dataFim: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    })
  }, [dateRange])

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status: status === "all" ? undefined : status,
    })
  }

  const handleOrigemChange = (origem: string) => {
    onFiltersChange({
      ...filters,
      origem: origem === "all" ? undefined : origem,
    })
  }

  const clearSearch = () => {
    setSearchValue("")
  }

  const clearDateRange = () => {
    setDateRange({ from: undefined, to: undefined })
  }

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.status) count++
    if (filters.origem) count++
    if (filters.areaInteresse) count++
    if (filters.dataInicio || filters.dataFim) count++
    return count
  }, [filters])

  return (
    <div className="space-y-4">
      {/* Search and main filters row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
              onClick={clearSearch}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Label htmlFor="status-filter" className="text-sm font-medium whitespace-nowrap">
              Status:
            </Label>
            <Select
              value={filters.status || "all"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-40" id="status-filter">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="existente">Existente</SelectItem>
                <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Origem filter */}
          <div className="flex items-center gap-2">
            <Label htmlFor="origem-filter" className="text-sm font-medium whitespace-nowrap">
              Origem:
            </Label>
            <Select
              value={filters.origem || "all"}
              onValueChange={handleOrigemChange}
            >
              <SelectTrigger className="w-32" id="origem-filter">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Area de Interesse filter */}
          <div className="flex items-center gap-2">
            <Label htmlFor="area-filter" className="text-sm font-medium whitespace-nowrap">
              Área:
            </Label>
            <Select
              value={filters.areaInteresse || "all"}
              onValueChange={(value) => onFiltersChange({
                ...filters,
                areaInteresse: value === "all" ? undefined : value,
              })}
            >
              <SelectTrigger className="w-40" id="area-filter">
                <SelectValue placeholder="Todas as áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                <SelectItem value="civil">Direito Civil</SelectItem>
                <SelectItem value="trabalhista">Direito Trabalhista</SelectItem>
                <SelectItem value="criminal">Direito Criminal</SelectItem>
                <SelectItem value="familia">Direito de Família</SelectItem>
                <SelectItem value="empresarial">Direito Empresarial</SelectItem>
                <SelectItem value="tributario">Direito Tributário</SelectItem>
                <SelectItem value="previdenciario">Direito Previdenciário</SelectItem>
                <SelectItem value="consumidor">Direito do Consumidor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date range filter - simplified version using date inputs */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">
              De:
            </Label>
            <Input
              type="date"
              value={dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : undefined
                setDateRange(prev => ({ ...prev, from: date }))
              }}
              className="w-36"
            />
            <Label className="text-sm font-medium whitespace-nowrap">
              Até:
            </Label>
            <Input
              type="date"
              value={dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : undefined
                setDateRange(prev => ({ ...prev, to: date }))
              }}
              className="w-36"
            />
            {(dateRange.from || dateRange.to) && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearDateRange}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Clear all filters */}
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="ml-2"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar ({activeFiltersCount})
            </Button>
          )}
        </div>
      </div>

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtros ativos:</span>
          
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Busca: "{filters.search}"
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => {
                  setSearchValue("")
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status === 'novo' ? 'Novo' : 
                      filters.status === 'existente' ? 'Existente' :
                      filters.status === 'em_atendimento' ? 'Em Atendimento' :
                      'Finalizado'}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleStatusChange("all")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.origem && (
            <Badge variant="secondary" className="gap-1">
              Origem: {filters.origem === 'whatsapp' ? 'WhatsApp' : 'Manual'}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleOrigemChange("all")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.areaInteresse && (
            <Badge variant="secondary" className="gap-1">
              Área: {filters.areaInteresse === 'civil' ? 'Direito Civil' :
                     filters.areaInteresse === 'trabalhista' ? 'Direito Trabalhista' :
                     filters.areaInteresse === 'criminal' ? 'Direito Criminal' :
                     filters.areaInteresse === 'familia' ? 'Direito de Família' :
                     filters.areaInteresse === 'empresarial' ? 'Direito Empresarial' :
                     filters.areaInteresse === 'tributario' ? 'Direito Tributário' :
                     filters.areaInteresse === 'previdenciario' ? 'Direito Previdenciário' :
                     filters.areaInteresse === 'consumidor' ? 'Direito do Consumidor' :
                     filters.areaInteresse}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onFiltersChange({
                  ...filters,
                  areaInteresse: undefined,
                })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {(filters.dataInicio || filters.dataFim) && (
            <Badge variant="secondary" className="gap-1">
              Período: {filters.dataInicio && format(new Date(filters.dataInicio), "dd/MM/yy", { locale: ptBR })}
              {filters.dataInicio && filters.dataFim && " - "}
              {filters.dataFim && format(new Date(filters.dataFim), "dd/MM/yy", { locale: ptBR })}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={clearDateRange}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}