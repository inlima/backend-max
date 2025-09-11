"use client"

import * as React from "react"
import { useAccessibleTable } from "@/hooks/use-accessibility"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  IconChevronUp, 
  IconChevronDown, 
  IconChevronsUpDown,
  IconLoader2
} from "@tabler/icons-react"

export interface AccessibleTableColumn<T = any> {
  id: string
  header: string
  accessorKey?: keyof T
  cell?: (item: T, index: number) => React.ReactNode
  sortable?: boolean
  width?: string | number
  align?: 'left' | 'center' | 'right'
  ariaLabel?: string
}

export interface AccessibleTableProps<T = any> {
  data: T[]
  columns: AccessibleTableColumn<T>[]
  caption?: string
  isLoading?: boolean
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  onRowClick?: (item: T, index: number) => void
  onRowDoubleClick?: (item: T, index: number) => void
  getRowId?: (item: T, index: number) => string
  getRowAriaLabel?: (item: T, index: number) => string
  emptyMessage?: string
  loadingMessage?: string
  className?: string
  tableClassName?: string
  headerClassName?: string
  bodyClassName?: string
  rowClassName?: string | ((item: T, index: number) => string)
  cellClassName?: string | ((column: AccessibleTableColumn<T>, item: T, index: number) => string)
}

export function AccessibleTable<T = any>({
  data,
  columns,
  caption,
  isLoading = false,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  onRowDoubleClick,
  getRowId = (item, index) => `row-${index}`,
  getRowAriaLabel,
  emptyMessage = "Nenhum item encontrado",
  loadingMessage = "Carregando dados...",
  className,
  tableClassName,
  headerClassName,
  bodyClassName,
  rowClassName,
  cellClassName
}: AccessibleTableProps<T>) {
  const [ref, state, actions] = useAccessibleTable({
    caption,
    sortable: columns.some(col => col.sortable)
  })

  // Selection state
  const [internalSelectedIds, setInternalSelectedIds] = React.useState<string[]>(selectedIds)
  
  React.useEffect(() => {
    setInternalSelectedIds(selectedIds)
  }, [selectedIds])

  const handleSelectionChange = React.useCallback((newSelectedIds: string[]) => {
    setInternalSelectedIds(newSelectedIds)
    onSelectionChange?.(newSelectedIds)
  }, [onSelectionChange])

  // Handle row selection
  const handleRowSelect = React.useCallback((rowId: string, selected: boolean) => {
    const newSelectedIds = selected
      ? [...internalSelectedIds, rowId]
      : internalSelectedIds.filter(id => id !== rowId)
    
    handleSelectionChange(newSelectedIds)
  }, [internalSelectedIds, handleSelectionChange])

  // Handle select all
  const handleSelectAll = React.useCallback((selected: boolean) => {
    const newSelectedIds = selected
      ? data.map((item, index) => getRowId(item, index))
      : []
    
    handleSelectionChange(newSelectedIds)
  }, [data, getRowId, handleSelectionChange])

  // Handle sort
  const handleSort = React.useCallback((columnId: string) => {
    if (!onSort) return

    const newDirection = sortColumn === columnId && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(columnId, newDirection)
  }, [sortColumn, sortDirection, onSort])

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent, item: T, index: number) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (selectable) {
          const rowId = getRowId(item, index)
          const isSelected = internalSelectedIds.includes(rowId)
          handleRowSelect(rowId, !isSelected)
        } else {
          onRowClick?.(item, index)
        }
        break
      
      case 'ArrowUp':
        event.preventDefault()
        const prevRow = event.currentTarget.previousElementSibling as HTMLElement
        prevRow?.focus()
        break
      
      case 'ArrowDown':
        event.preventDefault()
        const nextRow = event.currentTarget.nextElementSibling as HTMLElement
        nextRow?.focus()
        break
    }
  }, [selectable, internalSelectedIds, getRowId, handleRowSelect, onRowClick])

  // Calculate selection state
  const isAllSelected = data.length > 0 && internalSelectedIds.length === data.length
  const isPartiallySelected = internalSelectedIds.length > 0 && internalSelectedIds.length < data.length

  // Render sort button
  const renderSortButton = (column: AccessibleTableColumn<T>) => {
    if (!column.sortable || !onSort) return column.header

    const isSorted = sortColumn === column.id
    const direction = isSorted ? sortDirection : undefined

    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 font-medium hover:bg-transparent"
        onClick={() => handleSort(column.id)}
        aria-label={`Ordenar por ${column.header} ${
          direction === 'asc' ? 'decrescente' : 'crescente'
        }`}
        aria-sort={
          isSorted 
            ? direction === 'asc' ? 'ascending' : 'descending'
            : 'none'
        }
      >
        <span>{column.header}</span>
        <span className="ml-2 flex-shrink-0">
          {direction === 'asc' && <IconChevronUp className="h-4 w-4" />}
          {direction === 'desc' && <IconChevronDown className="h-4 w-4" />}
          {!direction && <IconChevronsUpDown className="h-4 w-4 opacity-50" />}
        </span>
      </Button>
    )
  }

  // Render cell content
  const renderCell = (column: AccessibleTableColumn<T>, item: T, index: number) => {
    if (column.cell) {
      return column.cell(item, index)
    }
    
    if (column.accessorKey) {
      const value = item[column.accessorKey]
      return value?.toString() || ''
    }
    
    return ''
  }

  // Get cell class name
  const getCellClassName = (column: AccessibleTableColumn<T>, item: T, index: number) => {
    const baseClasses = "px-4 py-3 text-sm"
    const alignClasses = {
      left: "text-left",
      center: "text-center", 
      right: "text-right"
    }
    
    let classes = cn(baseClasses, alignClasses[column.align || 'left'])
    
    if (typeof cellClassName === 'string') {
      classes = cn(classes, cellClassName)
    } else if (typeof cellClassName === 'function') {
      classes = cn(classes, cellClassName(column, item, index))
    }
    
    return classes
  }

  // Get row class name
  const getRowClassName = (item: T, index: number) => {
    const baseClasses = "border-b hover:bg-muted/50 focus:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset"
    
    if (typeof rowClassName === 'string') {
      return cn(baseClasses, rowClassName)
    } else if (typeof rowClassName === 'function') {
      return cn(baseClasses, rowClassName(item, index))
    }
    
    return baseClasses
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      <div className="overflow-x-auto">
        <table
          ref={ref}
          className={cn("w-full border-collapse", tableClassName)}
          role="table"
          aria-label={caption}
          aria-rowcount={data.length + 1} // +1 for header
          aria-colcount={columns.length + (selectable ? 1 : 0)}
        >
          {caption && (
            <caption className="sr-only">
              {caption}
            </caption>
          )}
          
          <thead className={cn("bg-muted/50", headerClassName)}>
            <tr role="row" aria-rowindex={1}>
              {selectable && (
                <th 
                  className="w-12 px-4 py-3"
                  role="columnheader"
                  aria-colindex={1}
                  scope="col"
                >
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isPartiallySelected}
                    onCheckedChange={handleSelectAll}
                    aria-label={
                      isAllSelected 
                        ? "Desmarcar todos os itens"
                        : "Selecionar todos os itens"
                    }
                  />
                </th>
              )}
              
              {columns.map((column, index) => (
                <th
                  key={column.id}
                  className={cn(
                    "px-4 py-3 text-left font-medium",
                    column.align === 'center' && "text-center",
                    column.align === 'right' && "text-right"
                  )}
                  style={{ width: column.width }}
                  role="columnheader"
                  aria-colindex={index + (selectable ? 2 : 1)}
                  scope="col"
                  aria-label={column.ariaLabel || column.header}
                >
                  {renderSortButton(column)}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className={bodyClassName}>
            {isLoading ? (
              <tr role="row">
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted-foreground"
                  role="cell"
                >
                  <div className="flex items-center justify-center gap-2">
                    <IconLoader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>{loadingMessage}</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr role="row">
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-muted-foreground"
                  role="cell"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => {
                const rowId = getRowId(item, index)
                const isSelected = internalSelectedIds.includes(rowId)
                const ariaLabel = getRowAriaLabel?.(item, index)
                
                return (
                  <tr
                    key={rowId}
                    className={getRowClassName(item, index)}
                    role="row"
                    aria-rowindex={index + 2} // +2 because header is row 1
                    aria-selected={selectable ? isSelected : undefined}
                    aria-label={ariaLabel}
                    tabIndex={0}
                    onClick={() => onRowClick?.(item, index)}
                    onDoubleClick={() => onRowDoubleClick?.(item, index)}
                    onKeyDown={(e) => handleKeyDown(e, item, index)}
                    data-selected={isSelected}
                  >
                    {selectable && (
                      <td 
                        className="w-12 px-4 py-3"
                        role="cell"
                        aria-colindex={1}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleRowSelect(rowId, !!checked)}
                          aria-label={`Selecionar item ${index + 1}`}
                        />
                      </td>
                    )}
                    
                    {columns.map((column, colIndex) => (
                      <td
                        key={column.id}
                        className={getCellClassName(column, item, index)}
                        role="cell"
                        aria-colindex={colIndex + (selectable ? 2 : 1)}
                      >
                        {renderCell(column, item, index)}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Screen reader summary */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading 
          ? loadingMessage
          : `Tabela com ${data.length} ${data.length === 1 ? 'item' : 'itens'}${
              selectable ? `, ${internalSelectedIds.length} selecionado${internalSelectedIds.length === 1 ? '' : 's'}` : ''
            }`
        }
      </div>
    </div>
  )
}

// Utility component for table actions
export function TableActions({ 
  children, 
  className,
  ariaLabel = "Ações da tabela"
}: {
  children: React.ReactNode
  className?: string
  ariaLabel?: string
}) {
  return (
    <div 
      className={cn("flex items-center gap-2", className)}
      role="toolbar"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}

// Utility component for table filters
export function TableFilters({
  children,
  className,
  ariaLabel = "Filtros da tabela"
}: {
  children: React.ReactNode
  className?: string
  ariaLabel?: string
}) {
  return (
    <div 
      className={cn("flex flex-wrap items-center gap-4", className)}
      role="search"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  )
}