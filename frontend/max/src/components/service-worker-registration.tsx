'use client'

import { useServiceWorker } from '@/hooks/use-service-worker'

export function ServiceWorkerRegistration() {
  useServiceWorker()
  return null
}