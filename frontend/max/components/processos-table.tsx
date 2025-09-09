"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconLayoutColumns,
  IconPhone,
  IconClock,
  IconUser,
  IconBrandWhatsapp,
  IconEdit,
  IconFileDescription,
  IconCalendar,
  IconAlertTriangle,
} from "@tabler/icons-react"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Processo } from "@/types"

interface ProcessosTableProps {
  data: Processo[]
  onSelectProcesso?: (processo: Processo) => void
  onEditProcesso?: (processo: Processo) => void
  onUpdateStatus?: (processo: Processo, newStatus: Processo['status']) => void
}

// Status badge component
function StatusBadge({ status }: { status: Processo['status'] }) {
  const variants = {
    novo: { variant: "default" as const, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
    em_andamento: { variant: "default" as const, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
    aguardando_cliente: { variant: "default" as const, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
    finalizado: { variant: "outline" as const, color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
    arquivado: { variant: "secondary" as const, color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  }

  const config = variants[status] || variants.novo

  return (
    <Badge variant={config.variant} className={config.color}>
      {status === 'novo' && 'Novo'}
      {status === 'em_andamento' && 'Em Andamento'}
      {status === 'aguardando_cliente' && 'Aguardando Cliente'}
      {status === 'finalizado' && 'Finalizado'}
      {status === 'arquivado' && 'Arquivado'}
    </Badge>
  )
}

// Prioridade badge component
function PrioridadeBadge({ prioridade }: { prioridade: Processo['prioridade'] }) {
  const variants = {
    baixa: { variant: "outline" as const, color: "text-green-700 border-green-300" },
    media: { variant: "outline" as const, color: "text-blue-700 border-blue-300" },
    alta: { variant: "default" as const, color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
    urgente: { variant: "destructive" as const, color: "" },
  }

  const config = variants[prioridade] || variants.media

  return (
    <Badge variant={config.variant} className={config.color}>
      {prioridade === 'urgente' && <IconAlertTriangle className="w-3 h-3 mr-1" />}
      {prioridade === 'baixa' && 'Baixa'}
      {prioridade === 'media' && 'Média'}
      {prioridade === 'alta' && 'Alta'}
      {prioridade === 'urgente' && 'Urgente'}
    </Badge>
  )
}

// Origem badge component
function OrigemBadge({ origem }: { origem: Processo['origem'] }) {
  return (
    <Badge variant="outline" className={origem === 'whatsapp' ? 'text-green-700 border-green-300' : 'text-blue-700 border-blue-300'}>
      {origem === 'whatsapp' ? (
        <>
          <IconBrandWhatsapp className="w-3 h-3 mr-1" />
          WhatsApp
        </>
      ) : (
        <>
          <IconUser className="w-3 h-3 mr-1" />
          Manual
        </>
      )}
    </Badge>
  )
}

// Prazo indicator
function PrazoIndicator({ prazoLimite }: { prazoLimite?: Date }) {
  if (!prazoLimite) return null
  
  const now = new Date()
  const prazo = new Date(prazoLimite)
  const diffDays = Math.ceil((prazo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  let variant: "default" | "destructive" | "secondary" = "default"
  let color = ""
  
  if (diffDays < 0) {
    variant = "destructive"
  } else if (diffDays <= 3) {
    variant = "default"
    color = "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
  } else if (diffDays <= 7) {
    variant = "default"
    color = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
  } else {
    variant = "secondary"
  }
  
  return (
    <Badge variant={variant} className={color}>
      <IconCalendar className="w-3 h-3 mr-1" />
      {diffDays < 0 ? `${Math.abs(diffDays)}d atrasado` : `${diffDays}d restantes`}
    </Badge>
  )
}

// Mobile card view for processos
function ProcessoCard({ processo, onSelect, onEdit, onUpdateStatus }: { 
  processo: Processo
  onSelect?: (processo: Processo) => void
  onEdit?: (processo: Processo) => void
  onUpdateStatus?: (processo: Processo, newStatus: Processo['status']) => void
}) {
  const dataAbertura = new Date(processo.dataAbertura)
  const dataUltimaAtualizacao = new Date(processo.dataUltimaAtualizacao)
  
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onSelect?.(processo)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{processo.titulo}</h3>
            {processo.numero && (
              <p className="text-sm text-muted-foreground mt-1">Nº {processo.numero}</p>
            )}
            <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
              <IconUser className="w-3 h-3" />
              <span className="truncate">{processo.contato.nome}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 ml-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <IconDotsVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect?.(processo) }}>
                  <IconFileDescription className="w-4 h-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(processo) }}>
                  <IconEdit className="w-4 h-4 mr-2" />
                  Editar processo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onUpdateStatus?.(processo, 'em_andamento') }}
                  disabled={processo.status === 'em_andamento'}
                >
                  Marcar como Em Andamento
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onUpdateStatus?.(processo, 'finalizado') }}
                  disabled={processo.status === 'finalizado'}
                >
                  Marcar como Finalizado
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2 mb-3">
          <StatusBadge status={processo.status} />
          <PrioridadeBadge prioridade={processo.prioridade} />
          <OrigemBadge origem={processo.origem} />
          {processo.areaJuridica && (
            <Badge variant="outline" className="text-xs">{processo.areaJuridica}</Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <IconClock className="w-3 h-3" />
            <span className="text-xs">
              {formatDistanceToNow(dataUltimaAtualizacao, { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
          </div>
          {processo.prazoLimite && (
            <PrazoIndicator prazoLimite={processo.prazoLimite} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ProcessosTable({ data, onSelectProcesso, onEditProcesso, onUpdateStatus }: ProcessosTableProps) {
  const isMobile = useIsMobile()
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    // Hide less important columns on mobile by default
    numero: !isMobile,
    dataAbertura: !isMobile,
    advogadoResponsavel: !isMobile,
  })
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "dataUltimaAtualizacao", desc: true } // Default sort by last update
  ])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: isMobile ? 5 : 10, // Smaller page size on mobile
  })

  const columns: ColumnDef<Processo>[] = React.useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Selecionar todos"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Selecionar linha"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "titulo",
      header: "Processo",
      cell: ({ row }) => {
        const processo = row.original
        return (
          <div className="flex flex-col space-y-1">
            <button
              className="font-medium text-left hover:underline"
              onClick={() => onSelectProcesso?.(processo)}
            >
              {processo.titulo}
            </button>
            {processo.numero && (
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <IconFileDescription className="w-3 h-3" />
                <span>{processo.numero}</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <OrigemBadge origem={processo.origem} />
              <PrazoIndicator prazoLimite={processo.prazoLimite} />
            </div>
          </div>
        )
      },
      enableHiding: false,
    },
    {
      accessorKey: "contato",
      header: "Cliente",
      cell: ({ row }) => {
        const contato = row.original.contato
        return (
          <div className="flex flex-col space-y-1">
            <span className="font-medium">{contato.nome}</span>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <IconPhone className="w-3 h-3" />
              <span>{contato.telefone}</span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "areaJuridica",
      header: "Área Jurídica",
      cell: ({ row }) => {
        const area = row.original.areaJuridica
        return <Badge variant="outline">{area}</Badge>
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "prioridade",
      header: "Prioridade",
      cell: ({ row }) => <PrioridadeBadge prioridade={row.original.prioridade} />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "advogadoResponsavel",
      header: "Advogado",
      cell: ({ row }) => {
        const advogado = row.original.advogadoResponsavel
        return advogado ? (
          <Badge variant="secondary">{advogado}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Não atribuído</span>
        )
      },
    },
    {
      accessorKey: "dataAbertura",
      header: "Data de Abertura",
      cell: ({ row }) => {
        const data = new Date(row.original.dataAbertura)
        return (
          <div className="text-sm">
            {format(data, "dd/MM/yyyy", { locale: ptBR })}
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(rowA.original.dataAbertura).getTime()
        const dateB = new Date(rowB.original.dataAbertura).getTime()
        return dateA - dateB
      },
    },
    {
      accessorKey: "dataUltimaAtualizacao",
      header: "Última Atualização",
      cell: ({ row }) => {
        const data = new Date(row.original.dataUltimaAtualizacao)
        return (
          <div className="flex items-center space-x-1 text-sm">
            <IconClock className="w-3 h-3" />
            <span>
              {formatDistanceToNow(data, { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(rowA.original.dataUltimaAtualizacao).getTime()
        const dateB = new Date(rowB.original.dataUltimaAtualizacao).getTime()
        return dateA - dateB
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const processo = row.original
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                size="icon"
              >
                <IconDotsVertical className="w-4 h-4" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onSelectProcesso?.(processo)}>
                <IconFileDescription className="w-4 h-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditProcesso?.(processo)}>
                <IconEdit className="w-4 h-4 mr-2" />
                Editar processo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onUpdateStatus?.(processo, 'em_andamento')}
                disabled={processo.status === 'em_andamento'}
              >
                Marcar como Em Andamento
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onUpdateStatus?.(processo, 'aguardando_cliente')}
                disabled={processo.status === 'aguardando_cliente'}
              >
                Aguardando Cliente
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onUpdateStatus?.(processo, 'finalizado')}
                disabled={processo.status === 'finalizado'}
              >
                Marcar como Finalizado
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                Arquivar processo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [onSelectProcesso, onEditProcesso, onUpdateStatus])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return (
    <div className="space-y-4">
      {/* Table controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} de{" "}
            {table.getFilteredRowModel().rows.length} processo(s) selecionado(s)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns className="w-4 h-4 mr-2" />
                Colunas
                <IconChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id === 'titulo' && 'Processo'}
                      {column.id === 'contato' && 'Cliente'}
                      {column.id === 'areaJuridica' && 'Área Jurídica'}
                      {column.id === 'status' && 'Status'}
                      {column.id === 'prioridade' && 'Prioridade'}
                      {column.id === 'advogadoResponsavel' && 'Advogado'}
                      {column.id === 'dataAbertura' && 'Data de Abertura'}
                      {column.id === 'dataUltimaAtualizacao' && 'Última Atualização'}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Card View */}
      {isMobile ? (
        <div className="space-y-3">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <ProcessoCard
                key={row.id}
                processo={row.original}
                onSelect={onSelectProcesso}
                onEdit={onEditProcesso}
                onUpdateStatus={onUpdateStatus}
              />
            ))
          ) : (
            <div className="rounded-lg border p-8 text-center">
              <p className="text-muted-foreground">Nenhum processo encontrado.</p>
            </div>
          )}
        </div>
      ) : (
        /* Desktop Table View */
        <div className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan} className="min-w-[120px]">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="hover:bg-muted/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      Nenhum processo encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden items-center space-x-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Linhas por página
          </Label>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue
                placeholder={table.getState().pagination.pageSize}
              />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-2">
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center justify-center space-x-1 sm:space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Ir para primeira página</span>
              <IconChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Página anterior</span>
              <IconChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Próxima página</span>
              <IconChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Ir para última página</span>
              <IconChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}