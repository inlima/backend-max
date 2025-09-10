import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { 
  navigationContextService, 
  NavigationContext, 
  NavigationState, 
  BreadcrumbItem 
} from '@/lib/navigation-context-service'

export function useNavigationContext() {
  const router = useRouter()
  const pathname = usePathname()
  const [context, setContext] = useState<NavigationContext>(
    navigationContextService.getContext()
  )

  // Subscribe to context changes
  useEffect(() => {
    const unsubscribe = navigationContextService.subscribe(setContext)
    return unsubscribe
  }, [])

  // Update context when pathname changes
  useEffect(() => {
    if (pathname !== context.currentPath) {
      navigationContextService.navigate(pathname, { updateBreadcrumbs: true })
    }
  }, [pathname, context.currentPath])

  // Navigation functions
  const navigateWithContext = useCallback((
    path: string, 
    options?: { preserveState?: boolean; replace?: boolean }
  ) => {
    navigationContextService.navigate(path, { 
      preserveState: options?.preserveState,
      updateBreadcrumbs: true 
    })
    
    if (options?.replace) {
      router.replace(path)
    } else {
      router.push(path)
    }
  }, [router])

  const goBack = useCallback(() => {
    const previousPath = navigationContextService.goBack()
    if (previousPath) {
      router.push(previousPath)
    } else {
      router.back()
    }
  }, [router])

  // State management functions
  const updatePageState = useCallback(<K extends keyof NavigationState>(
    page: K,
    updates: Partial<NavigationState[K]>
  ) => {
    navigationContextService.updatePageState(page, updates)
  }, [])

  const getPageState = useCallback(<K extends keyof NavigationState>(page: K) => {
    return navigationContextService.getPageState(page)
  }, [])

  const clearPageState = useCallback(<K extends keyof NavigationState>(page: K) => {
    navigationContextService.clearPageState(page)
  }, [])

  return {
    context,
    navigateWithContext,
    goBack,
    updatePageState,
    getPageState,
    clearPageState,
    breadcrumbs: context.breadcrumbs,
    currentPath: context.currentPath,
    previousPath: context.previousPath
  }
}

// Hook for page-specific state management
export function usePageState<K extends keyof NavigationState>(page: K) {
  const { getPageState, updatePageState } = useNavigationContext()
  const [state, setState] = useState(getPageState(page))

  useEffect(() => {
    const unsubscribe = navigationContextService.subscribe((context) => {
      setState(context.state[page])
    })
    return unsubscribe
  }, [page])

  const updateState = useCallback((updates: Partial<NavigationState[K]>) => {
    updatePageState(page, updates)
  }, [page, updatePageState])

  return [state, updateState] as const
}

// Hook for breadcrumb navigation
export function useBreadcrumbs() {
  const { context } = useNavigationContext()
  const router = useRouter()

  const navigateToBreadcrumb = useCallback((breadcrumb: BreadcrumbItem) => {
    navigationContextService.navigate(breadcrumb.href, { updateBreadcrumbs: true })
    router.push(breadcrumb.href)
  }, [router])

  return {
    breadcrumbs: context.breadcrumbs,
    navigateToBreadcrumb
  }
}

// Hook for search state management
export function useSearchState(page: 'contatos' | 'processos') {
  const [pageState, updatePageState] = usePageState(page)
  
  const setSearchTerm = useCallback((searchTerm: string) => {
    updatePageState({ searchTerm } as Partial<NavigationState[typeof page]>)
  }, [updatePageState])

  const setFilters = useCallback((filters: any) => {
    updatePageState({ filters } as Partial<NavigationState[typeof page]>)
  }, [updatePageState])

  const setSorting = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    updatePageState({ sortBy, sortOrder } as Partial<NavigationState[typeof page]>)
  }, [updatePageState])

  const setViewMode = useCallback((viewMode: 'table' | 'cards') => {
    updatePageState({ viewMode } as Partial<NavigationState[typeof page]>)
  }, [updatePageState])

  const setPagination = useCallback((page: number, pageSize?: number) => {
    const updates: any = { page }
    if (pageSize !== undefined) {
      updates.pageSize = pageSize
    }
    updatePageState(updates)
  }, [updatePageState])

  const setSelectedIds = useCallback((selectedIds: string[]) => {
    updatePageState({ selectedIds } as Partial<NavigationState[typeof page]>)
  }, [updatePageState])

  const clearFilters = useCallback(() => {
    updatePageState({ 
      filters: {}, 
      searchTerm: '', 
      selectedIds: [],
      page: 1 
    } as Partial<NavigationState[typeof page]>)
  }, [updatePageState])

  const getSuggestions = useCallback(() => {
    return navigationContextService.getSearchSuggestions(page)
  }, [page])

  return {
    searchTerm: pageState.searchTerm,
    filters: pageState.filters,
    sortBy: pageState.sortBy,
    sortOrder: pageState.sortOrder,
    viewMode: pageState.viewMode,
    page: pageState.page,
    pageSize: pageState.pageSize,
    selectedIds: pageState.selectedIds,
    setSearchTerm,
    setFilters,
    setSorting,
    setViewMode,
    setPagination,
    setSelectedIds,
    clearFilters,
    getSuggestions
  }
}

// Hook for dashboard state management
export function useDashboardState() {
  const [dashboardState, updateDashboardState] = usePageState('dashboard')

  const setDateRange = useCallback((start: Date, end: Date) => {
    updateDashboardState({ dateRange: { start, end } })
  }, [updateDashboardState])

  const setSelectedMetrics = useCallback((selectedMetrics: string[]) => {
    updateDashboardState({ selectedMetrics })
  }, [updateDashboardState])

  const setChartType = useCallback((chartId: string, type: string) => {
    updateDashboardState({ 
      chartTypes: { 
        ...dashboardState.chartTypes, 
        [chartId]: type 
      } 
    })
  }, [updateDashboardState, dashboardState.chartTypes])

  const setRefreshInterval = useCallback((refreshInterval: number) => {
    updateDashboardState({ refreshInterval })
  }, [updateDashboardState])

  const markRefreshed = useCallback(() => {
    updateDashboardState({ lastRefresh: new Date() })
  }, [updateDashboardState])

  return {
    dateRange: dashboardState.dateRange,
    selectedMetrics: dashboardState.selectedMetrics,
    chartTypes: dashboardState.chartTypes,
    refreshInterval: dashboardState.refreshInterval,
    lastRefresh: dashboardState.lastRefresh,
    setDateRange,
    setSelectedMetrics,
    setChartType,
    setRefreshInterval,
    markRefreshed
  }
}

// Hook for configuration state management
export function useConfigurationState() {
  const [configState, updateConfigState] = usePageState('configuracoes')

  const setActiveTab = useCallback((activeTab: string) => {
    updateConfigState({ activeTab })
  }, [updateConfigState])

  const addUnsavedChange = useCallback((key: string, value: any) => {
    navigationContextService.addUnsavedChange(key, value)
  }, [])

  const markChangesSaved = useCallback(() => {
    navigationContextService.markChangesSaved()
  }, [])

  const hasUnsavedChanges = useCallback(() => {
    return navigationContextService.hasUnsavedChanges()
  }, [])

  return {
    activeTab: configState.activeTab,
    unsavedChanges: configState.unsavedChanges,
    lastModified: configState.lastModified,
    setActiveTab,
    addUnsavedChange,
    markChangesSaved,
    hasUnsavedChanges
  }
}

// Hook for navigation history
export function useNavigationHistory() {
  const history = navigationContextService.getHistory()
  const frequentPaths = navigationContextService.getFrequentPaths()

  return {
    history,
    frequentPaths
  }
}

// Hook for unsaved changes warning
export function useUnsavedChangesWarning() {
  const { hasUnsavedChanges } = useConfigurationState()
  const router = useRouter()

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const confirmNavigation = useCallback((path: string) => {
    if (hasUnsavedChanges()) {
      const confirmed = window.confirm(
        'Você tem alterações não salvas. Deseja realmente navegar para outra página?'
      )
      if (confirmed) {
        navigationContextService.markChangesSaved()
        router.push(path)
      }
      return confirmed
    }
    router.push(path)
    return true
  }, [hasUnsavedChanges, router])

  return {
    hasUnsavedChanges: hasUnsavedChanges(),
    confirmNavigation
  }
}