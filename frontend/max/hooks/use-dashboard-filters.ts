'use client'

import { useState, useCallback, useEffect } from 'react'

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

interface ExportOptions {
  includeCharts: boolean
  includeMetrics: boolean
  includeActivities: boolean
  dateRange: { start: Date | null; end: Date | null }
  format: 'pdf' | 'excel' | 'csv'
}

interface UseDashboardFiltersOptions {
  persistFilters?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseDashboardFiltersReturn {
  filters: DashboardFilters
  setFilters: (filters: DashboardFilters) => void
  updateFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void
  clearFilters: () => void
  exportDashboard: (format: 'pdf' | 'excel' | 'csv', options: ExportOptions) => Promise<void>
  isExporting: boolean
  lastRefresh: Date | null
  autoRefreshEnabled: boolean
  toggleAutoRefresh: () => void
}

const defaultFilters: DashboardFilters = {
  dateRange: {
    start: null,
    end: null,
    preset: '30d'
  },
  metrics: [],
  departments: [],
  users: [],
  status: [],
  priority: []
}

// Storage key for persisting filters
const FILTERS_STORAGE_KEY = 'dashboard-filters'

export function useDashboardFilters(options: UseDashboardFiltersOptions = {}): UseDashboardFiltersReturn {
  const {
    persistFilters = true,
    autoRefresh = false,
    refreshInterval = 60000
  } = options

  const [filters, setFiltersState] = useState<DashboardFilters>(() => {
    if (persistFilters && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(FILTERS_STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          // Convert date strings back to Date objects
          if (parsed.dateRange.start) {
            parsed.dateRange.start = new Date(parsed.dateRange.start)
          }
          if (parsed.dateRange.end) {
            parsed.dateRange.end = new Date(parsed.dateRange.end)
          }
          return parsed
        }
      } catch (error) {
        console.warn('Failed to load saved filters:', error)
      }
    }
    return defaultFilters
  })

  const [isExporting, setIsExporting] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh)

  // Persist filters to localStorage
  useEffect(() => {
    if (persistFilters && typeof window !== 'undefined') {
      try {
        localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
      } catch (error) {
        console.warn('Failed to save filters:', error)
      }
    }
  }, [filters, persistFilters])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshEnabled || refreshInterval <= 0) return

    const interval = setInterval(() => {
      setLastRefresh(new Date())
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefreshEnabled, refreshInterval])

  const setFilters = useCallback((newFilters: DashboardFilters) => {
    setFiltersState(newFilters)
  }, [])

  const updateFilter = useCallback(<K extends keyof DashboardFilters>(
    key: K, 
    value: DashboardFilters[K]
  ) => {
    setFiltersState(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters)
  }, [])

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled(prev => !prev)
  }, [])

  const exportDashboard = useCallback(async (
    format: 'pdf' | 'excel' | 'csv', 
    options: ExportOptions
  ): Promise<void> => {
    setIsExporting(true)
    
    try {
      // In a real implementation, this would call an API
      const exportData = {
        filters,
        options,
        format,
        timestamp: new Date().toISOString(),
        metadata: {
          totalMetrics: filters.metrics.length || 6, // Default to all metrics
          dateRange: filters.dateRange,
          appliedFilters: {
            departments: filters.departments.length,
            users: filters.users.length,
            status: filters.status.length,
            priority: filters.priority.length
          }
        }
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Generate mock file download
      const filename = `dashboard-export-${new Date().toISOString().split('T')[0]}.${format}`
      
      if (format === 'pdf') {
        // Mock PDF generation
        console.log('Generating PDF report with:', exportData)
        
        // In a real app, you might use libraries like jsPDF or call a backend service
        const mockPdfContent = `
          Dashboard Report
          Generated: ${new Date().toLocaleString('pt-BR')}
          
          Filters Applied:
          - Date Range: ${filters.dateRange.preset}
          - Departments: ${filters.departments.join(', ') || 'All'}
          - Users: ${filters.users.join(', ') || 'All'}
          
          Export Options:
          - Include Charts: ${options.includeCharts ? 'Yes' : 'No'}
          - Include Metrics: ${options.includeMetrics ? 'Yes' : 'No'}
          - Include Activities: ${options.includeActivities ? 'Yes' : 'No'}
        `
        
        // Create blob and download
        const blob = new Blob([mockPdfContent], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
        
      } else if (format === 'excel') {
        // Mock Excel generation
        console.log('Generating Excel spreadsheet with:', exportData)
        
        // In a real app, you might use libraries like SheetJS
        const mockExcelData = [
          ['Dashboard Export', '', '', ''],
          ['Generated', new Date().toLocaleString('pt-BR'), '', ''],
          ['', '', '', ''],
          ['Metric', 'Value', 'Change', 'Period'],
          ['Total Contatos', '156', '+12%', filters.dateRange.preset],
          ['Processos Ativos', '23', '+8%', filters.dateRange.preset],
          ['Taxa Conversão', '28%', '+5%', filters.dateRange.preset],
          ['Receita Mensal', 'R$ 45.000', '+15%', filters.dateRange.preset]
        ]
        
        const csvContent = mockExcelData.map(row => row.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
        
      } else if (format === 'csv') {
        // Mock CSV generation
        console.log('Generating CSV data with:', exportData)
        
        const mockCsvData = [
          ['Date', 'Contatos', 'Processos', 'Conversas', 'Revenue'],
          ...Array.from({ length: 30 }, (_, i) => {
            const date = new Date()
            date.setDate(date.getDate() - (29 - i))
            return [
              date.toISOString().split('T')[0],
              Math.floor(Math.random() * 20 + 5).toString(),
              Math.floor(Math.random() * 15 + 3).toString(),
              Math.floor(Math.random() * 25 + 8).toString(),
              (Math.random() * 5000 + 1000).toFixed(2)
            ]
          })
        ]
        
        const csvContent = mockCsvData.map(row => row.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
      }

      console.log(`Dashboard exported successfully as ${format}`)
      
    } catch (error) {
      console.error('Export failed:', error)
      throw new Error(`Failed to export dashboard as ${format}`)
    } finally {
      setIsExporting(false)
    }
  }, [filters])

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    exportDashboard,
    isExporting,
    lastRefresh,
    autoRefreshEnabled,
    toggleAutoRefresh
  }
}

// Hook for managing export history and templates
export function useExportHistory() {
  const [exportHistory, setExportHistory] = useState<Array<{
    id: string
    format: string
    timestamp: Date
    filters: DashboardFilters
    options: ExportOptions
  }>>([])

  const addToHistory = useCallback((
    format: string,
    filters: DashboardFilters,
    options: ExportOptions
  ) => {
    const entry = {
      id: Math.random().toString(36).substr(2, 9),
      format,
      timestamp: new Date(),
      filters,
      options
    }
    
    setExportHistory(prev => [entry, ...prev].slice(0, 10)) // Keep last 10 exports
  }, [])

  const clearHistory = useCallback(() => {
    setExportHistory([])
  }, [])

  return {
    exportHistory,
    addToHistory,
    clearHistory
  }
}