/**
 * Offline Hook
 * Provides offline functionality and state management
 */

import { useState, useEffect, useCallback } from 'react'
import { offlineStorage, type StorageQuota } from '@/lib/offline-storage'
import { offlineSync, type SyncProgress, type SyncResult } from '@/lib/offline-sync'

export interface OfflineState {
  isOnline: boolean
  isOfflineReady: boolean
  hasPendingActions: boolean
  pendingActionsCount: number
  syncProgress: SyncProgress | null
  storageQuota: StorageQuota | null
  lastSyncTime: Date | null
}

export interface OfflineActions {
  syncNow: () => Promise<SyncResult>
  clearOfflineData: () => Promise<void>
  preloadData: () => Promise<void>
  getOfflineData: (key: string) => Promise<any>
  storeOfflineData: (key: string, data: any, ttl?: number) => Promise<void>
  queueAction: (url: string, method: string, headers?: Record<string, string>, body?: string) => Promise<string>
}

export function useOffline(): OfflineState & OfflineActions {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOfflineReady: false,
    hasPendingActions: false,
    pendingActionsCount: 0,
    syncProgress: null,
    storageQuota: null,
    lastSyncTime: null
  })

  // Initialize offline functionality
  useEffect(() => {
    initializeOffline()
    setupEventListeners()
    
    return () => {
      cleanupEventListeners()
    }
  }, [])

  // Update pending actions count periodically
  useEffect(() => {
    const interval = setInterval(updatePendingActions, 5000) // Check every 5 seconds
    updatePendingActions() // Initial check
    
    return () => clearInterval(interval)
  }, [])

  const initializeOffline = async () => {
    try {
      await offlineStorage.init()
      const quota = await offlineStorage.getStorageQuota()
      const pendingCount = await offlineSync.getPendingActionsCount()
      
      setState(prev => ({
        ...prev,
        isOfflineReady: true,
        storageQuota: quota,
        pendingActionsCount: pendingCount,
        hasPendingActions: pendingCount > 0
      }))

      // Clean up expired data
      await offlineStorage.cleanupExpiredData()
    } catch (error) {
      console.error('Failed to initialize offline functionality:', error)
    }
  }

  const setupEventListeners = () => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Listen for sync progress
    const unsubscribe = offlineSync.addSyncListener(handleSyncProgress)
    
    // Store unsubscribe function for cleanup
    ;(window as any).__offlineSyncUnsubscribe = unsubscribe
  }

  const cleanupEventListeners = () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    
    // Unsubscribe from sync progress
    const unsubscribe = (window as any).__offlineSyncUnsubscribe
    if (unsubscribe) {
      unsubscribe()
      delete (window as any).__offlineSyncUnsubscribe
    }
  }

  const handleOnline = () => {
    setState(prev => ({ ...prev, isOnline: true }))
    
    // Auto-sync when coming back online
    setTimeout(() => {
      syncNow().catch(console.error)
    }, 1000)
  }

  const handleOffline = () => {
    setState(prev => ({ ...prev, isOnline: false }))
  }

  const handleSyncProgress = (progress: SyncProgress) => {
    setState(prev => ({ ...prev, syncProgress: progress }))
    
    if (progress.status === 'completed') {
      setState(prev => ({
        ...prev,
        lastSyncTime: new Date(),
        pendingActionsCount: 0,
        hasPendingActions: false
      }))
    }
  }

  const updatePendingActions = async () => {
    try {
      const count = await offlineSync.getPendingActionsCount()
      setState(prev => ({
        ...prev,
        pendingActionsCount: count,
        hasPendingActions: count > 0
      }))
    } catch (error) {
      console.error('Failed to update pending actions count:', error)
    }
  }

  // Actions
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    try {
      const result = await offlineSync.forceSyncNow()
      await updatePendingActions()
      return result
    } catch (error) {
      console.error('Sync failed:', error)
      throw error
    }
  }, [])

  const clearOfflineData = useCallback(async (): Promise<void> => {
    try {
      await offlineStorage.clearAllData()
      
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }
      
      setState(prev => ({
        ...prev,
        pendingActionsCount: 0,
        hasPendingActions: false,
        storageQuota: null
      }))
      
      // Reinitialize
      await initializeOffline()
    } catch (error) {
      console.error('Failed to clear offline data:', error)
      throw error
    }
  }, [])

  const preloadData = useCallback(async (): Promise<void> => {
    try {
      await offlineSync.preloadCriticalData()
      const quota = await offlineStorage.getStorageQuota()
      setState(prev => ({ ...prev, storageQuota: quota }))
    } catch (error) {
      console.error('Failed to preload data:', error)
      throw error
    }
  }, [])

  const getOfflineData = useCallback(async (key: string): Promise<any> => {
    try {
      return await offlineStorage.getCriticalData(key)
    } catch (error) {
      console.error('Failed to get offline data:', error)
      return null
    }
  }, [])

  const storeOfflineData = useCallback(async (key: string, data: any, ttl?: number): Promise<void> => {
    try {
      await offlineStorage.storeCriticalData(key, data, ttl)
      const quota = await offlineStorage.getStorageQuota()
      setState(prev => ({ ...prev, storageQuota: quota }))
    } catch (error) {
      console.error('Failed to store offline data:', error)
      throw error
    }
  }, [])

  const queueAction = useCallback(async (
    url: string, 
    method: string, 
    headers: Record<string, string> = {}, 
    body?: string
  ): Promise<string> => {
    try {
      const actionId = await offlineStorage.queueOfflineAction({
        url,
        method,
        headers,
        body
      })
      
      await updatePendingActions()
      return actionId
    } catch (error) {
      console.error('Failed to queue action:', error)
      throw error
    }
  }, [])

  return {
    ...state,
    syncNow,
    clearOfflineData,
    preloadData,
    getOfflineData,
    storeOfflineData,
    queueAction
  }
}

// Helper hook for offline-aware data fetching
export function useOfflineData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    ttl?: number
    fallbackToCache?: boolean
    autoRefresh?: boolean
  } = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { isOnline, getOfflineData, storeOfflineData } = useOffline()

  const { ttl, fallbackToCache = true, autoRefresh = true } = options

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      // Try to get cached data first if offline or fallback enabled
      if (!forceRefresh && (fallbackToCache || !isOnline)) {
        const cachedData = await getOfflineData(key)
        if (cachedData) {
          setData(cachedData)
          setLoading(false)
          
          // If online and auto-refresh enabled, fetch fresh data in background
          if (isOnline && autoRefresh) {
            fetchFreshData()
          }
          return
        }
      }

      // Fetch fresh data if online
      if (isOnline) {
        await fetchFreshData()
      } else if (!data) {
        throw new Error('No cached data available offline')
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [key, isOnline, fallbackToCache, autoRefresh])

  const fetchFreshData = async () => {
    try {
      const freshData = await fetchFn()
      setData(freshData)
      
      // Store in offline cache
      await storeOfflineData(key, freshData, ttl)
    } catch (err) {
      // If we have cached data, use it; otherwise throw error
      const cachedData = await getOfflineData(key)
      if (cachedData && fallbackToCache) {
        setData(cachedData)
      } else {
        throw err
      }
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refetch when coming back online
  useEffect(() => {
    if (isOnline && autoRefresh) {
      fetchData()
    }
  }, [isOnline, autoRefresh, fetchData])

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true),
    isStale: !isOnline && !!data
  }
}