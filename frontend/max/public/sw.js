const CACHE_NAME = 'advocacia-direta-v2'
const DATA_CACHE_NAME = 'advocacia-data-v2'
const OFFLINE_QUEUE_NAME = 'offline-queue-v2'

// Static resources to cache
const urlsToCache = [
  '/',
  '/dashboard',
  '/contatos',
  '/processos',
  '/configuracoes',
  '/manifest.json',
  '/offline.html'
]

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/dashboard\/metrics/,
  /\/api\/contatos/,
  /\/api\/processos/,
  /\/api\/dashboard\/chart-data/,
  /\/api\/dashboard\/recent-activity/,
  /\/api\/settings\//
]

// Critical data keys for offline storage
const CRITICAL_DATA_KEYS = [
  'contatos',
  'processos',
  'dashboard-metrics',
  'user-profile'
]

// Install event - cache resources and critical data
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(urlsToCache)
      }),
      // Initialize data cache
      caches.open(DATA_CACHE_NAME),
      // Initialize offline queue
      caches.open(OFFLINE_QUEUE_NAME),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  )
})

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== DATA_CACHE_NAME && 
                cacheName !== OFFLINE_QUEUE_NAME) {
              return caches.delete(cacheName)
            }
          })
        )
      }),
      // Claim all clients
      self.clients.claim()
    ])
  )
})

// Fetch event - implement cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  // Handle static resources
  event.respondWith(handleStaticRequest(request))
})

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url)
  const shouldCache = API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))

  if (!shouldCache) {
    return fetch(request).catch(() => new Response('Offline', { status: 503 }))
  }

  try {
    // Try network first
    const networkResponse = await fetch(request.clone())
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DATA_CACHE_NAME)
      cache.put(request, networkResponse.clone())
      
      // Store critical data in IndexedDB for offline access
      if (request.method === 'GET') {
        storeCriticalData(request, networkResponse.clone())
      }
    }
    
    return networkResponse
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // If it's a write operation, queue it for later
    if (request.method !== 'GET') {
      await queueOfflineAction(request)
      return new Response(JSON.stringify({ 
        success: true, 
        queued: true,
        message: 'Ação salva para sincronização quando voltar online' 
      }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Return offline response
    return new Response(JSON.stringify({ 
      error: 'Offline', 
      message: 'Dados não disponíveis offline' 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request)
    return networkResponse
  } catch (error) {
    // Return cached page or offline page
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page
    return caches.match('/offline.html')
  }
}

// Handle static resources with cache-first strategy
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    return new Response('Resource not available offline', { status: 503 })
  }
}

// Store critical data in IndexedDB
async function storeCriticalData(request, response) {
  try {
    const url = new URL(request.url)
    const data = await response.json()
    
    // Determine data type and store accordingly
    let key = null
    if (url.pathname.includes('/contatos')) {
      key = 'contatos'
    } else if (url.pathname.includes('/processos')) {
      key = 'processos'
    } else if (url.pathname.includes('/dashboard/metrics')) {
      key = 'dashboard-metrics'
    } else if (url.pathname.includes('/settings/profile')) {
      key = 'user-profile'
    }

    if (key && CRITICAL_DATA_KEYS.includes(key)) {
      await storeInIndexedDB(key, data)
    }
  } catch (error) {
    console.warn('Failed to store critical data:', error)
  }
}

// Queue offline actions for later synchronization
async function queueOfflineAction(request) {
  try {
    const action = {
      id: Date.now() + Math.random(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now()
    }

    await storeInIndexedDB('offline-queue', action, true)
    
    // Notify clients about queued action
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'ACTION_QUEUED',
          action: action
        })
      })
    })
  } catch (error) {
    console.error('Failed to queue offline action:', error)
  }
}

// IndexedDB helper functions
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AdvocaciaOfflineDB', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      // Create object stores
      if (!db.objectStoreNames.contains('critical-data')) {
        db.createObjectStore('critical-data', { keyPath: 'key' })
      }
      
      if (!db.objectStoreNames.contains('offline-queue')) {
        db.createObjectStore('offline-queue', { keyPath: 'id' })
      }
    }
  })
}

async function storeInIndexedDB(key, data, isQueue = false) {
  try {
    const db = await openIndexedDB()
    const transaction = db.transaction([isQueue ? 'offline-queue' : 'critical-data'], 'readwrite')
    const store = transaction.objectStore(isQueue ? 'offline-queue' : 'critical-data')
    
    if (isQueue) {
      await store.add(data)
    } else {
      await store.put({ key, data, timestamp: Date.now() })
    }
  } catch (error) {
    console.error('IndexedDB storage failed:', error)
  }
}

// Handle background sync for queued actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-sync') {
    event.waitUntil(syncOfflineActions())
  }
})

// Sync queued offline actions
async function syncOfflineActions() {
  try {
    const db = await openIndexedDB()
    const transaction = db.transaction(['offline-queue'], 'readwrite')
    const store = transaction.objectStore('offline-queue')
    const actions = await store.getAll()

    for (const action of actions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        })

        if (response.ok) {
          // Remove successfully synced action
          await store.delete(action.id)
          
          // Notify clients about successful sync
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'ACTION_SYNCED',
                action: action
              })
            })
          })
        }
      } catch (error) {
        console.warn('Failed to sync action:', action.id, error)
      }
    }
  } catch (error) {
    console.error('Sync failed:', error)
  }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  const { type, data } = event.data

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'GET_OFFLINE_DATA':
      getOfflineData(data.key).then(result => {
        event.ports[0].postMessage(result)
      })
      break
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true })
      })
      break
      
    case 'SYNC_NOW':
      syncOfflineActions().then(() => {
        event.ports[0].postMessage({ success: true })
      })
      break
  }
})

// Get offline data from IndexedDB
async function getOfflineData(key) {
  try {
    const db = await openIndexedDB()
    const transaction = db.transaction(['critical-data'], 'readonly')
    const store = transaction.objectStore('critical-data')
    const result = await store.get(key)
    
    return result ? result.data : null
  } catch (error) {
    console.error('Failed to get offline data:', error)
    return null
  }
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.map(name => caches.delete(name)))
}