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
  IconMail,
  IconClock,
  IconMessageCircle,
  IconUser,
  IconBrandWhatsapp,
  IconEdit,
} from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"
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
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useIsMobile } from "@/hooks/use-mobile"
import { Contato } from "@/types"
import { BulkActionsToolbar } from "@/components/bulk-actions-toolbar"
import { TagManagementDialog } from "@/components/tag-management-dialog"
import { BulkExportDialog } from "@/components/bulk-export-dialog"

interface ContatosTableProps {
  data: Contato[]
  isLoading?: boolean
  onSelectContato?: (contato: Contato) => void
  onEditContato?: (contato: Contato) => void
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  onBulkStatusUpdate?: (ids: string[], status: Contato['status']) => Promise<void>
  onBulkFavoriteToggle?: (ids: string[], favorite: boolean) => Promise<void>
  onBulkTagAssignment?: (ids: string[], tags: string[]) => Promise<void>
  onBulkExport?: (ids: string[], options: any) => Promise<void>
  onBulkDelete?: (ids: string[]) => Promise<void>
  availableTags?: string[]
}

// Memoized Status badge component
const StatusBadge = React.memo(({ status }: { status: Contato['status'] }) => {
  const variants = React.useMemo(() => ({
    novo: { variant: "default" as const, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
    existente: { variant: "secondary" as const, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
    em_atendimento: { variant: "default" as const, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
    finalizado: { variant: "outline" as const, color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
  }), [])

  const config = variants[status] || variants.novo

  return (
    <Badge variant={config.variant} className={config.color}>
      {status === 'novo' && 'Novo'}
      {status === 'existente' && 'Existente'}
      {status === 'em_atendimento' && 'Em Atendimento'}
      {status === 'finalizado' && 'Finalizado'}
    </Badge>
  )
})
StatusBadge.displayName = 'StatusBadge'

// Memoized Origem badge component
const OrigemBadge = React.memo(({ origem }: { origem: Contato['origem'] }) => {
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
})
OrigemBadge.displayName = 'OrigemBadge'

// Memoized Unread messages indicator
const UnreadIndicator = React.memo(({ count }: { count: number }) => {
  if (count === 0) return null
  
  return (
    <Badge variant="destructive" className="ml-2">
      <IconMessageCircle className="w-3 h-3 mr-1" />
      {count}
    </Badge>
  )
})
UnreadIndicator.displayName = 'UnreadIndicator'

// Memoized Mobile card view for contatos
const ContatoCard = React.memo(({ contato, onSelect, onEdit }: { 
  contato: Contato
  onSelect?: (contato: Contato) => void
  onEdit?: (contato: Contato) => void 
}) => {
  const data = React.useMemo(() => new Date(contato.ultimaInteracao), [contato.ultimaInteracao])
  
  const handleSelect = React.useCallback(() => {
    onSelect?.(contato)
  }, [onSelect, contato])

  const handleEdit = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(contato)
  }, [onEdit, contato])

  const handleSelectFromMenu = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect?.(contato)
  }, [onSelect, contato])
  
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleSelect}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{contato.nome}</h3>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
              <IconPhone className="w-3 h-3" />
              <span className="truncate">{contato.telefone}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 ml-2">
            <UnreadIndicator count={contato.mensagensNaoLidas} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <IconDotsVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSelectFromMenu}>
                  <IconMessageCircle className="w-4 h-4 mr-2" />
                  Ver conversa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEdit}>
                  <IconEdit className="w-4 h-4 mr-2" />
                  Editar contato
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2 mb-3">
          <StatusBadge status={contato.status} />
          <OrigemBadge origem={contato.origem} />
          {contato.areaInteresse && (
            <Badge variant="outline" className="text-xs">{contato.areaInteresse}</Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <IconClock className="w-3 h-3" />
            <span className="text-xs">
              {formatDistanceToNow(data, { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
          </div>
          {contato.tipoSolicitacao && (
            <Badge variant="secondary" className="text-xs">
              {contato.tipoSolicitacao === 'agendamento' && 'Agendamento'}
              {contato.tipoSolicitacao === 'consulta' && 'Consulta'}
              {contato.tipoSolicitacao === 'informacao' && 'Informação'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
ContatoCard.displayName = 'ContatoCard'

// Memoized Loading Skeleton
const LoadingSkeleton = React.memo(() => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <Card key={i} className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
            <div className="h-6 w-6 bg-muted rounded"></div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2 mb-3">
            <div className="h-5 bg-muted rounded w-16"></div>
            <div className="h-5 bg-muted rounded w-20"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-3 bg-muted rounded w-24"></div>
            <div className="h-3 bg-muted rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
))
LoadingSkeleton.displayName = 'LoadingSkeleton'

// Memoized Table Loading Skeleton
const TableLoadingSkeleton = React.memo(({ columnsLength }: { columnsLength: number }) => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i} className="animate-pulse">
        <TableCell>
          <div className="h-4 w-4 bg-muted rounded"></div>
        </TableCell>
        <TableCell>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </TableCell>
        {Array.from({ length: columnsLength - 3 }).map((_, j) => (
          <TableCell key={j}>
            <div className="h-5 bg-muted rounded w-16"></div>
          </TableCell>
        ))}
        <TableCell>
          <div className="h-6 w-6 bg-muted rounded"></div>
        </TableCell>
      </TableRow>
    ))}
  </>
))
TableLoadingSkeleton.displayName = 'TableLoadingSkeleton'

export const ContatosTable = React.memo(({ 
  data, 
  isLoading = false, 
  onSelectContato, 
  onEditContato,
  selectedIds = [],
  onSelectionChange,
  onBulkStatusUpdate,
  onBulkFavoriteToggle,
  onBulkTagAssignment,
  onBulkExport,
  onBulkDelete,
  availableTags = []
}: ContatosTableProps) => {
  const isMobile = useIsMobile()
  
  // Memoized row selection state
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>(() => {
    const selection: Record<string, boolean> = {}
    selectedIds.forEach(id => {
      selection[id] = true
    })
    return selection
  })

  // Update row selection when selectedIds prop changes
  React.useEffect(() => {
    const selection: Record<string, boolean> = {}
    selectedIds.forEach(id => {
      selection[id] = true
    })
    setRowSelection(selection)
  }, [selectedIds])

  // Memoized callback for selection changes
  const handleSelectionChange = React.useCallback((newSelection: Record<string, boolean>) => {
    setRowSelection(newSelection)
    const selectedRowIds = Object.keys(newSelection).filter(id => newSelection[id])
    onSelectionChange?.(selectedRowIds)
  }, [onSelectionChange])

  // Memoized column visibility state
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => ({
    areaInteresse: !isMobile,
    tipoSolicitacao: !isMobile,
    conversaCompleta: !isMobile,
  }))

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "ultimaInteracao", desc: true }
  ])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: isMobile ? 5 : 10,
  })

  // Bulk operations state
  const [showTagDialog, setShowTagDialog] = React.useState(false)
  const [showExportDialog, setShowExportDialog] = React.useState(false)
  const [bulkLoading, setBulkLoading] = React.useState(false)

  // Memoized selected items data
  const selectedItems = React.useMemo(() => {
    return data.filter(item => selectedIds.includes(item.id))
  }, [data, selectedIds])

  // Memoized bulk operation handlers
  const handleBulkStatusUpdate = React.useCallback(async (status: Contato['status']) => {
    if (!onBulkStatusUpdate || selectedIds.length === 0) return
    
    setBulkLoading(true)
    try {
      await onBulkStatusUpdate(selectedIds, status)
    } finally {
      setBulkLoading(false)
    }
  }, [onBulkStatusUpdate, selectedIds])

  const handleBulkFavoriteToggle = React.useCallback(async (favorite: boolean) => {
    if (!onBulkFavoriteToggle || selectedIds.length === 0) return
    
    setBulkLoading(true)
    try {
      await onBulkFavoriteToggle(selectedIds, favorite)
    } finally {
      setBulkLoading(false)
    }
  }, [onBulkFavoriteToggle, selectedIds])

  const handleBulkTagAssignment = React.useCallback(async (tags: string[]) => {
    if (!onBulkTagAssignment || selectedIds.length === 0) return
    
    setBulkLoading(true)
    try {
      await onBulkTagAssignment(selectedIds, tags)
      setShowTagDialog(false)
    } finally {
      setBulkLoading(false)
    }
  }, [onBulkTagAssignment, selectedIds])

  const handleBulkExport = React.useCallback(async (options: any) => {
    if (!onBulkExport || selectedIds.length === 0) return
    
    setBulkLoading(true)
    try {
      await onBulkExport(selectedIds, options)
      setShowExportDialog(false)
    } finally {
      setBulkLoading(false)
    }
  }, [onBulkExport, selectedIds])

  const handleBulkDelete = React.useCallback(async () => {
    if (!onBulkDelete || selectedIds.length === 0) return
    
    setBulkLoading(true)
    try {
      await onBulkDelete(selectedIds)
    } finally {
      setBulkLoading(false)
    }
  }, [onBulkDelete, selectedIds])

  const handleClearSelection = React.useCallback(() => {
    setRowSelection({})
    onSelectionChange?.([])
  }, [onSelectionChange])

  // Memoized columns definition
  const columns: ColumnDef<Contato>[] = React.useMemo(() => [
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
      accessorKey: "nome",
      header: "Nome",
      cell: ({ row }) => {
        const contato = row.original
        return (
          <div className="flex items-center space-x-2">
            <div className="flex flex-col">
              <button
                className="font-medium text-left hover:underline"
                onClick={() => onSelectContato?.(contato)}
              >
                {contato.nome}
              </button>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <IconPhone className="w-3 h-3" />
                <span>{contato.telefone}</span>
                {contato.email && (
                  <>
                    <IconMail className="w-3 h-3 ml-2" />
                    <span>{contato.email}</span>
                  </>
                )}
              </div>
            </div>
            <UnreadIndicator count={contato.mensagensNaoLidas} />
          </div>
        )
      },
      enableHiding: false,
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
      accessorKey: "origem",
      header: "Origem",
      cell: ({ row }) => <OrigemBadge origem={row.original.origem} />,
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "areaInteresse",
      header: "Área de Interesse",
      cell: ({ row }) => {
        const area = row.original.areaInteresse
        return area ? (
          <Badge variant="outline">{area}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">Não informado</span>
        )
      },
    },
    {
      accessorKey: "ultimaInteracao",
      header: "Última Interação",
      cell: ({ row }) => {
        const data = new Date(row.original.ultimaInteracao)
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
        const dateA = new Date(rowA.original.ultimaInteracao).getTime()
        const dateB = new Date(rowB.original.ultimaInteracao).getTime()
        return dateA - dateB
      },
    },
    {
      accessorKey: "tipoSolicitacao",
      header: "Tipo de Solicitação",
      cell: ({ row }) => {
        const tipo = row.original.tipoSolicitacao
        if (!tipo) return <span className="text-muted-foreground text-sm">-</span>
        
        const labels = {
          agendamento: 'Agendamento',
          consulta: 'Consulta',
          informacao: 'Informação'
        }
        
        return <Badge variant="secondary">{labels[tipo]}</Badge>
      },
    },
    {
      accessorKey: "conversaCompleta",
      header: "Conversa",
      cell: ({ row }) => {
        const completa = row.original.conversaCompleta
        return (
          <Badge variant={completa ? "default" : "secondary"}>
            {completa ? "Completa" : "Em andamento"}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const contato = row.original
        
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
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onSelectContato?.(contato)}>
                <IconMessageCircle className="w-4 h-4 mr-2" />
                Ver conversa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditContato?.(contato)}>
                <IconEdit className="w-4 h-4 mr-2" />
                Editar contato
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                Excluir contato
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [onSelectContato, onEditContato])

  // Memoized table instance
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
    onRowSelectionChange: handleSelectionChange,
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
      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedItems={selectedItems}
        onClearSelection={handleClearSelection}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        onBulkFavoriteToggle={handleBulkFavoriteToggle}
        onBulkTagAssignment={() => setShowTagDialog(true)}
        onBulkExport={() => setShowExportDialog(true)}
        onBulkDelete={handleBulkDelete}
        isLoading={bulkLoading}
      />

      {/* Table controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} de{" "}
            {table.getFilteredRowModel().rows.length} contato(s) selecionado(s)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Colunas</span>
                <IconChevronDown className="w-4 h-4 sm:ml-2" />
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
                      {column.id === 'nome' && 'Nome'}
                      {column.id === 'status' && 'Status'}
                      {column.id === 'origem' && 'Origem'}
                      {column.id === 'areaInteresse' && 'Área de Interesse'}
                      {column.id === 'ultimaInteracao' && 'Última Interação'}
                      {column.id === 'tipoSolicitacao' && 'Tipo de Solicitação'}
                      {column.id === 'conversaCompleta' && 'Conversa'}
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
          {isLoading ? (
            <LoadingSkeleton />
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <ContatoCard
                key={row.id}
                contato={row.original}
                onSelect={onSelectContato}
                onEdit={onEditContato}
              />
            ))
          ) : (
            <div className="rounded-lg border p-8 text-center">
              <p className="text-muted-foreground">Nenhum contato encontrado.</p>
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
                {isLoading ? (
                  <TableLoadingSkeleton columnsLength={columns.length} />
                ) : table.getRowModel().rows?.length ? (
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
                      Nenhum contato encontrado.
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

      {/* Tag Management Dialog */}
      <TagManagementDialog
        open={showTagDialog}
        onOpenChange={setShowTagDialog}
        selectedItems={selectedItems}
        availableTags={availableTags}
        onApplyTags={handleBulkTagAssignment}
        isLoading={bulkLoading}
      />

      {/* Bulk Export Dialog */}
      <BulkExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        selectedItems={selectedItems}
        onExport={handleBulkExport}
        isLoading={bulkLoading}
      />
    </div>
  )
})

ContatosTable.displayName = 'ContatosTable'