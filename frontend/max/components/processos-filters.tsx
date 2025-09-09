"use client"

import * as React from "react"
import { Search, X } from "lucide-react"

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
import { ProcessosFilters as ProcessosFiltersType } from "@/types"

interface ProcessosFiltersProps {
  filters: ProcessosFiltersType
  onFiltersChange: (filters: ProcessosFiltersType) => void
  onClearFilters: () => void
}

// Common legal areas for the select options
const AREAS_JURIDICAS = [
  "Direito Civil",
  "Direito Penal",
  "Direito Trabalhista",
  "Direito Empresarial",
  "Direito de Família",
  "Direito Imobiliário",
  "Direito Tributário",
  "Direito do Consumidor",
  "Direito Previdenciário",
  "Direito Administrativo",
]

// Common lawyers for the select options
const ADVOGADOS = [
  "Dr. João Silva",
  "Dra. Maria Santos",
  "Dr. Pedro Oliveira",
  "Dra. Ana Costa",
  "Dr. Carlos Ferreira",
]

export function ProcessosFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: ProcessosFiltersProps) {
  const [searchValue, setSearchValue] = React.useState(filters.search || "")

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

  const handleStatusChange = (status: string) => {
    onFiltersChange({
      ...filters,
      status: status === "all" ? undefined : status,
    })
  }

  const handleAreaJuridicaChange = (areaJuridica: string) => {
    onFiltersChange({
      ...filters,
      areaJuridica: areaJuridica === "all" ? undefined : areaJuridica,
    })
  }

  const handlePrioridadeChange = (prioridade: string) => {
    onFiltersChange({
      ...filters,
      prioridade: prioridade === "all" ? undefined : prioridade,
    })
  }

  const handleAdvogadoChange = (advogado: string) => {
    onFiltersChange({
      ...filters,
      advogado: advogado === "all" ? undefined : advogado,
    })
  }

  const clearSearch = () => {
    setSearchValue("")
  }

  // Count active filters
  const activeFiltersCount = React.useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.status) count++
    if (filters.areaJuridica) count++
    if (filters.prioridade) count++
    if (filters.advogado) count++
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
            placeholder="Buscar por título, número ou cliente..."
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
              <SelectTrigger className="w-44" id="status-filter">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Área Jurídica filter */}
          <div className="flex items-center gap-2">
            <Label htmlFor="area-filter" className="text-sm font-medium whitespace-nowrap">
              Área:
            </Label>
            <Select
              value={filters.areaJuridica || "all"}
              onValueChange={handleAreaJuridicaChange}
            >
              <SelectTrigger className="w-44" id="area-filter">
                <SelectValue placeholder="Todas as áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                {AREAS_JURIDICAS.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prioridade filter */}
          <div className="flex items-center gap-2">
            <Label htmlFor="prioridade-filter" className="text-sm font-medium whitespace-nowrap">
              Prioridade:
            </Label>
            <Select
              value={filters.prioridade || "all"}
              onValueChange={handlePrioridadeChange}
            >
              <SelectTrigger className="w-32" id="prioridade-filter">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advogado filter */}
          <div className="flex items-center gap-2">
            <Label htmlFor="advogado-filter" className="text-sm font-medium whitespace-nowrap">
              Advogado:
            </Label>
            <Select
              value={filters.advogado || "all"}
              onValueChange={handleAdvogadoChange}
            >
              <SelectTrigger className="w-40" id="advogado-filter">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {ADVOGADOS.map((advogado) => (
                  <SelectItem key={advogado} value={advogado}>
                    {advogado}
                  </SelectItem>
                ))}
                <SelectItem value="unassigned">Não atribuído</SelectItem>
              </SelectContent>
            </Select>
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
                      filters.status === 'em_andamento' ? 'Em Andamento' :
                      filters.status === 'aguardando_cliente' ? 'Aguardando Cliente' :
                      filters.status === 'finalizado' ? 'Finalizado' :
                      'Arquivado'}
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
          
          {filters.areaJuridica && (
            <Badge variant="secondary" className="gap-1">
              Área: {filters.areaJuridica}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleAreaJuridicaChange("all")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.prioridade && (
            <Badge variant="secondary" className="gap-1">
              Prioridade: {filters.prioridade === 'baixa' ? 'Baixa' :
                          filters.prioridade === 'media' ? 'Média' :
                          filters.prioridade === 'alta' ? 'Alta' :
                          'Urgente'}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handlePrioridadeChange("all")}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.advogado && (
            <Badge variant="secondary" className="gap-1">
              Advogado: {filters.advogado === 'unassigned' ? 'Não atribuído' : filters.advogado}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleAdvogadoChange("all")}
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