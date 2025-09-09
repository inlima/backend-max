'use client'

import { useEffect } from 'react'

interface WebVital {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
}

export function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // Web Vitals thresholds
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 }
    }

    const getRating = (name: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
      const threshold = thresholds[name as keyof typeof thresholds]
      if (!threshold) return 'good'
      
      if (value <= threshold.good) return 'good'
      if (value <= threshold.poor) return 'needs-improvement'
      return 'poor'
    }

    const reportWebVital = (vital: WebVital) => {
      // In development, log to console
      if (process.env.NODE_ENV === 'development') {
        console.log(`${vital.name}: ${vital.value}ms (${vital.rating})`)
      }
      
      // In production, send to analytics service
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true') {
        // Send to your analytics service (e.g., Google Analytics, Sentry, etc.)
        try {
          fetch('/api/analytics/web-vitals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vital)
          }).catch(() => {
            // Silently fail if analytics endpoint is not available
          })
        } catch (error) {
          // Silently fail
        }
      }
    }

    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        let vital: WebVital | null = null

        if (entry.entryType === 'largest-contentful-paint') {
          vital = {
            name: 'LCP',
            value: entry.startTime,
            rating: getRating('LCP', entry.startTime),
            delta: entry.startTime,
            id: `lcp-${Date.now()}`
          }
        }

        if (entry.entryType === 'first-input') {
          const fidEntry = entry as PerformanceEventTiming
          const fidValue = fidEntry.processingStart - fidEntry.startTime
          vital = {
            name: 'FID',
            value: fidValue,
            rating: getRating('FID', fidValue),
            delta: fidValue,
            id: `fid-${Date.now()}`
          }
        }

        if (entry.entryType === 'layout-shift') {
          const clsEntry = entry as any
          if (!clsEntry.hadRecentInput) {
            vital = {
              name: 'CLS',
              value: clsEntry.value,
              rating: getRating('CLS', clsEntry.value * 1000), // Convert to ms for threshold comparison
              delta: clsEntry.value,
              id: `cls-${Date.now()}`
            }
          }
        }

        if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
          vital = {
            name: 'FCP',
            value: entry.startTime,
            rating: getRating('FCP', entry.startTime),
            delta: entry.startTime,
            id: `fcp-${Date.now()}`
          }
        }

        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming
          const ttfb = navEntry.responseStart - navEntry.requestStart
          vital = {
            name: 'TTFB',
            value: ttfb,
            rating: getRating('TTFB', ttfb),
            delta: ttfb,
            id: `ttfb-${Date.now()}`
          }
        }

        if (vital) {
          reportWebVital(vital)
        }
      }
    })

    // Observe different performance metrics
    try {
      observer.observe({ entryTypes: ['navigation', 'paint'] })
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
      observer.observe({ entryTypes: ['first-input'] })
      observer.observe({ entryTypes: ['layout-shift'] })
    } catch (e) {
      // Some metrics might not be supported
      console.log('Some performance metrics not supported')
    }

    return () => observer.disconnect()
  }, [])

  return null
}