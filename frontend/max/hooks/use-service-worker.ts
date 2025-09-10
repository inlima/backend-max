import { useEffect, useState } from 'react'
import { offlineSync } from '@/lib/offline-sync'
import { offlineStorage } from '@/lib/offline-storage'

export interface ServiceWorkerState {
  isRegistered: boolean
  isUpdating: boolean
  hasUpdate: boolean
  registration: ServiceWorkerRegistration | null
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isRegistered: false,
    isUpdating: false,
    hasUpdate: false,
    registration: null
  })

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      registerServiceWorker()
    }
  }, [])

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      
      setState(prev => ({
        ...prev,
        isRegistered: true,
        registration
      }))

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          setState(prev => ({ ...prev, isUpdating: true }))
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState(prev => ({
                ...prev,
                isUpdating: false,
                hasUpdate: true
              }))
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)

      // Register background sync
      await offlineSync.registerBackgroundSync()

      // Preload critical data for offline use
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        await offlineSync.preloadCriticalData()
      }

      console.log('Service Worker registered successfully')
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    const { type, data } = event.data

    switch (type) {
      case 'ACTION_QUEUED':
        console.log('Action queued for offline sync:', data)
        break
      case 'ACTION_SYNCED':
        console.log('Action synced successfully:', data)
        break
      case 'CACHE_UPDATED':
        console.log('Cache updated:', data)
        break
    }
  }

  const updateServiceWorker = () => {
    if (state.registration?.waiting) {
      // Send message to skip waiting
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // Reload page after update
      state.registration.waiting.addEventListener('statechange', (event) => {
        const worker = event.target as ServiceWorker
        if (worker.state === 'activated') {
          window.location.reload()
        }
      })
    }
  }

  const clearCache = async () => {
    if (state.registration) {
      // Send message to service worker to clear cache
      const messageChannel = new MessageChannel()
      
      return new Promise<void>((resolve, reject) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            resolve()
          } else {
            reject(new Error('Failed to clear cache'))
          }
        }

        state.registration!.active?.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        )
      })
    }
  }

  const getOfflineData = async (key: string): Promise<any> => {
    if (state.registration) {
      const messageChannel = new MessageChannel()
      
      return new Promise((resolve, reject) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data)
        }

        messageChannel.port1.onerror = (error) => {
          reject(error)
        }

        state.registration!.active?.postMessage(
          { type: 'GET_OFFLINE_DATA', data: { key } },
          [messageChannel.port2]
        )
      })
    }
    
    return null
  }

  const syncNow = async (): Promise<void> => {
    if (state.registration) {
      const messageChannel = new MessageChannel()
      
      return new Promise<void>((resolve, reject) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            resolve()
          } else {
            reject(new Error('Sync failed'))
          }
        }

        state.registration!.active?.postMessage(
          { type: 'SYNC_NOW' },
          [messageChannel.port2]
        )
      })
    }
  }

  return {
    ...state,
    updateServiceWorker,
    clearCache,
    getOfflineData,
    syncNow
  }
}