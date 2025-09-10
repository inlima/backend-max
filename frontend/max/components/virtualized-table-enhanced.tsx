"use client"

import * as React from "react"
import { FixedSizeList as List } from "react-window"
import { VariableSizeList as VariableList } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import { cn } from "@/lib/utils"

interface VirtualizedTableProps<T> {
  data: T[]
  itemHeight?: number
  containerHeight?: number
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  getItemSize?: (index: number) => number
  className?: string
  overscan?: number
  onScroll?: (scrollTop: number) => void
  isLoading?: boolean
  loadingComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
}

interface VirtualizedListItemProps<T> {
  index: number
  style: React.CSSProperties
  data: {
    items: T[]
    renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  }
}

// Memoized list item component
const VirtualizedListItem = React.memo(<T,>({ 
  index, 
  style, 
  data 
}: VirtualizedListItemProps<T>) => {
  const { items, renderItem } = data
  const item = items[index]
  
  if (!item) return null
  
  return (
    <div style={style}>
      {renderItem(item, index, style)}
    </div>
  )
}) as <T>(props: VirtualizedListItemProps<T>) => JSX.Element

VirtualizedListItem.displayName = 'VirtualizedListItem'

// Default loading component
const DefaultLoadingComponent = React.memo(() => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
))
DefaultLoadingComponent.displayName = 'DefaultLoadingComponent'

// Default empty component
const DefaultEmptyComponent = React.memo(() => (
  <div className="flex items-center justify-center h-64 text-muted-foreground">
    <p>Nenhum item encontrado</p>
  </div>
))
DefaultEmptyComponent.displayName = 'DefaultEmptyComponent'

export function VirtualizedTable<T>({
  data,
  itemHeight = 60,
  containerHeight = 400,
  renderItem,
  getItemSize,
  className,
  overscan = 5,
  onScroll,
  isLoading = false,
  loadingComponent = <DefaultLoadingComponent />,
  emptyComponent = <DefaultEmptyComponent />
}: VirtualizedTableProps<T>) {
  const listRef = React.useRef<List | VariableList>(null)
  
  // Memoized item data for react-window
  const itemData = React.useMemo(() => ({
    items: data,
    renderItem
  }), [data, renderItem])

  // Memoized scroll handler
  const handleScroll = React.useCallback(({ scrollTop }: { scrollTop: number }) => {
    onScroll?.(scrollTop)
  }, [onScroll])

  // Scroll to top when data changes
  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(0)
    }
  }, [data])

  if (isLoading) {
    return (
      <div className={cn("w-full", className)}>
        {loadingComponent}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={cn("w-full", className)}>
        {emptyComponent}
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)} style={{ height: containerHeight }}>
      <AutoSizer>
        {({ height, width }) => {
          if (getItemSize) {
            // Variable size list
            return (
              <VariableList
                ref={listRef as React.RefObject<VariableList>}
                height={height}
                width={width}
                itemCount={data.length}
                itemSize={getItemSize}
                itemData={itemData}
                overscanCount={overscan}
                onScroll={handleScroll}
              >
                {VirtualizedListItem}
              </VariableList>
            )
          } else {
            // Fixed size list
            return (
              <List
                ref={listRef as React.RefObject<List>}
                height={height}
                width={width}
                itemCount={data.length}
                itemSize={itemHeight}
                itemData={itemData}
                overscanCount={overscan}
                onScroll={handleScroll}
              >
                {VirtualizedListItem}
              </List>
            )
          }
        }}
      </AutoSizer>
    </div>
  )
}

// Hook for managing virtualized table state
export function useVirtualizedTable<T>(
  data: T[],
  options: {
    itemHeight?: number
    containerHeight?: number
    overscan?: number
    threshold?: number // Threshold for enabling virtualization
  } = {}
) {
  const {
    itemHeight = 60,
    containerHeight = 400,
    overscan = 5,
    threshold = 100
  } = options

  // Only enable virtualization for large datasets
  const shouldVirtualize = React.useMemo(() => {
    return data.length > threshold
  }, [data.length, threshold])

  // Memoized scroll position state
  const [scrollTop, setScrollTop] = React.useState(0)

  const handleScroll = React.useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop)
  }, [])

  // Calculate visible range for optimization
  const visibleRange = React.useMemo(() => {
    if (!shouldVirtualize) return { start: 0, end: data.length }
    
    const start = Math.floor(scrollTop / itemHeight)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const end = Math.min(start + visibleCount + overscan, data.length)
    
    return { start: Math.max(0, start - overscan), end }
  }, [scrollTop, itemHeight, containerHeight, overscan, data.length, shouldVirtualize])

  return {
    shouldVirtualize,
    visibleRange,
    scrollTop,
    handleScroll,
    itemHeight,
    containerHeight,
    overscan
  }
}

// Virtualized Contatos Table implementation
interface VirtualizedContatosTableProps {
  data: any[]
  onSelectContato?: (contato: any) => void
  onEditContato?: (contato: any) => void
  isLoading?: boolean
}

export const VirtualizedContatosTable = React.memo(({
  data,
  onSelectContato,
  onEditContato,
  isLoading = false
}: VirtualizedContatosTableProps) => {
  const { shouldVirtualize, handleScroll } = useVirtualizedTable(data, {
    itemHeight: 80,
    containerHeight: 600,
    threshold: 50
  })

  // Memoized render item function
  const renderContatoItem = React.useCallback((
    contato: any, 
    index: number, 
    style: React.CSSProperties
  ) => {
    return (
      <div 
        style={style} 
        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <div className="p-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {contato.nome}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              {contato.telefone} • {contato.email}
            </p>
            <div className="flex items-center mt-1 space-x-2">
              <span className={cn(
                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                contato.status === 'novo' && "bg-green-100 text-green-800",
                contato.status === 'existente' && "bg-blue-100 text-blue-800",
                contato.status === 'em_atendimento' && "bg-yellow-100 text-yellow-800",
                contato.status === 'finalizado' && "bg-gray-100 text-gray-800"
              )}>
                {contato.status}
              </span>
              <span className="text-xs text-gray-400">
                {contato.origem}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onSelectContato?.(contato)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Ver
            </button>
            <button
              onClick={() => onEditContato?.(contato)}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Editar
            </button>
          </div>
        </div>
      </div>
    )
  }, [onSelectContato, onEditContato])

  if (shouldVirtualize) {
    return (
      <VirtualizedTable
        data={data}
        itemHeight={80}
        containerHeight={600}
        renderItem={renderContatoItem}
        onScroll={handleScroll}
        isLoading={isLoading}
        className="border rounded-lg"
      />
    )
  }

  // Fallback to regular rendering for small datasets
  return (
    <div className="border rounded-lg max-h-[600px] overflow-y-auto">
      {isLoading ? (
        <DefaultLoadingComponent />
      ) : data.length === 0 ? (
        <DefaultEmptyComponent />
      ) : (
        data.map((contato, index) => (
          <div key={contato.id || index}>
            {renderContatoItem(contato, index, {})}
          </div>
        ))
      )}
    </div>
  )
})

VirtualizedContatosTable.displayName = 'VirtualizedContatosTable'