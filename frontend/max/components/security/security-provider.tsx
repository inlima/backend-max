'use client'

import { useEffect } from 'react'
import { enforceHTTPS, isSecureConnection } from '@/lib/security-config'
import { csrfProtection } from '@/lib/csrf-protection'

interface SecurityProviderProps {
  children: React.ReactNode
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  useEffect(() => {
    // Enforce HTTPS in production
    enforceHTTPS()
    
    // Initialize CSRF protection
    if (!csrfProtection.getToken()) {
      csrfProtection.generateNewToken()
    }
    
    // Security headers check (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log('Security Provider initialized')
      console.log('HTTPS enforced:', isSecureConnection())
      console.log('CSRF token:', csrfProtection.getToken())
    }
  }, [])

  return <>{children}</>
}