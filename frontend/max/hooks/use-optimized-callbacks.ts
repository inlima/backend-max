import { useCallback, useMemo, useRef, useEffect } from 'react'

// Deep comparison utility for complex objects
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true
  
  if (a == null || b == null) return a === b
  
  if (typeof a !== typeof b) return false
  
  if (typeof a !== 'object') return a === b
  
  if (Array.isArray(a) !== Array.isArray(b)) return false
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }
  
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  
  if (keysA.length !== keysB.length) return false
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false
    if (!deepEqual(a[key], b[key])) return false
  }
  
  return true
}

// Enhanced useCallback with deep dependency comparison
export function useDeepCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: any[]
): T {
  const ref = useRef<{ deps: any[]; callback: T }>()
  
  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = { deps, callback }
  }
  
  return useCallback(ref.current.callback, [ref.current])
}

// Enhanced useMemo with deep dependency comparison
export function useDeepMemo<T>(
  factory: () => T,
  deps: any[]
): T {
  const ref = useRef<{ deps: any[]; value: T }>()
  
  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() }
  }
  
  return ref.current.value
}

// Debounced callback hook
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: any[] = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay, ...deps]
  ) as T
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return debouncedCallback
}

// Throttled callback hook
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: any[] = []
): T {
  const lastCallRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      const timeSinceLastCall = now - lastCallRef.current
      
      if (timeSinceLastCall >= delay) {
        lastCallRef.current = now
        callback(...args)
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        
        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now()
          callback(...args)
        }, delay - timeSinceLastCall)
      }
    },
    [callback, delay, ...deps]
  ) as T
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return throttledCallback
}

// Stable reference hook - prevents unnecessary re-renders
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback)
  
  useEffect(() => {
    callbackRef.current = callback
  })
  
  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    []
  )
}

// Memoized event handlers for table operations
export function useTableEventHandlers<T>(
  data: T[],
  callbacks: {
    onSelect?: (item: T) => void
    onEdit?: (item: T) => void
    onDelete?: (item: T) => void
    onBulkAction?: (items: T[], action: string) => void
  }
) {
  const { onSelect, onEdit, onDelete, onBulkAction } = callbacks
  
  // Stable callbacks that don't cause re-renders
  const handleSelect = useStableCallback((item: T) => {
    onSelect?.(item)
  })
  
  const handleEdit = useStableCallback((item: T) => {
    onEdit?.(item)
  })
  
  const handleDelete = useStableCallback((item: T) => {
    onDelete?.(item)
  })
  
  const handleBulkAction = useStableCallback((items: T[], action: string) => {
    onBulkAction?.(items, action)
  })
  
  // Memoized handlers for specific items to prevent re-renders
  const getItemHandlers = useCallback((item: T) => {
    return {
      onSelect: () => handleSelect(item),
      onEdit: () => handleEdit(item),
      onDelete: () => handleDelete(item)
    }
  }, [handleSelect, handleEdit, handleDelete])
  
  return {
    handleSelect,
    handleEdit,
    handleDelete,
    handleBulkAction,
    getItemHandlers
  }
}

// Optimized filter and search handlers
export function useOptimizedFilters<T>(
  data: T[],
  filterConfig: {
    searchFields?: (keyof T)[]
    filterFields?: (keyof T)[]
    sortField?: keyof T
    sortDirection?: 'asc' | 'desc'
  }
) {
  const { searchFields = [], filterFields = [], sortField, sortDirection = 'asc' } = filterConfig
  
  // Debounced search to prevent excessive filtering
  const debouncedSearch = useDebouncedCallback((searchTerm: string) => {
    return data.filter(item => {
      if (!searchTerm) return true
      
      return searchFields.some(field => {
        const value = item[field]
        return String(value).toLowerCase().includes(searchTerm.toLowerCase())
      })
    })
  }, 300, [data, searchFields])
  
  // Memoized filter function
  const applyFilters = useDeepMemo(() => {
    return (filters: Record<string, any>) => {
      return data.filter(item => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value || value === 'all') return true
          
          const itemValue = item[key as keyof T]
          if (Array.isArray(value)) {
            return value.includes(itemValue)
          }
          return itemValue === value
        })
      })
    }
  }, [data, filterFields])
  
  // Memoized sort function
  const applySorting = useDeepMemo(() => {
    return (items: T[]) => {
      if (!sortField) return items
      
      return [...items].sort((a, b) => {
        const aValue = a[sortField]
        const bValue = b[sortField]
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }
  }, [sortField, sortDirection])
  
  return {
    debouncedSearch,
    applyFilters,
    applySorting
  }
}

// Optimized pagination handlers
export function useOptimizedPagination(
  totalItems: number,
  initialPageSize: number = 10
) {
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(initialPageSize)
  
  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / pageSize)
  }, [totalItems, pageSize])
  
  const paginationInfo = useMemo(() => {
    const start = currentPage * pageSize
    const end = Math.min(start + pageSize, totalItems)
    
    return {
      start,
      end,
      currentPage,
      totalPages,
      pageSize,
      hasNextPage: currentPage < totalPages - 1,
      hasPreviousPage: currentPage > 0
    }
  }, [currentPage, pageSize, totalItems, totalPages])
  
  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)))
  }, [totalPages])
  
  const nextPage = useCallback(() => {
    if (paginationInfo.hasNextPage) {
      setCurrentPage(prev => prev + 1)
    }
  }, [paginationInfo.hasNextPage])
  
  const previousPage = useCallback(() => {
    if (paginationInfo.hasPreviousPage) {
      setCurrentPage(prev => prev - 1)
    }
  }, [paginationInfo.hasPreviousPage])
  
  const changePageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(0) // Reset to first page
  }, [])
  
  return {
    paginationInfo,
    goToPage,
    nextPage,
    previousPage,
    changePageSize
  }
}

// Hook for preventing unnecessary re-renders in lists
export function useListOptimization<T>(
  items: T[],
  keyExtractor: (item: T, index: number) => string | number
) {
  // Memoize the key extraction
  const getItemKey = useCallback(keyExtractor, [])
  
  // Memoize the items with their keys
  const itemsWithKeys = useMemo(() => {
    return items.map((item, index) => ({
      key: getItemKey(item, index),
      item,
      index
    }))
  }, [items, getItemKey])
  
  // Track which items have changed
  const previousItemsRef = useRef<typeof itemsWithKeys>([])
  
  const changedItems = useMemo(() => {
    const changed = new Set<string | number>()
    const previous = previousItemsRef.current
    
    itemsWithKeys.forEach(({ key, item }, index) => {
      const prevItem = previous.find(p => p.key === key)
      if (!prevItem || !deepEqual(prevItem.item, item)) {
        changed.add(key)
      }
    })
    
    previousItemsRef.current = itemsWithKeys
    return changed
  }, [itemsWithKeys])
  
  const hasItemChanged = useCallback((key: string | number) => {
    return changedItems.has(key)
  }, [changedItems])
  
  return {
    itemsWithKeys,
    hasItemChanged,
    changedItemsCount: changedItems.size
  }
}