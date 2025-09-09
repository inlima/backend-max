'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { User, LoginCredentials } from '@/types'

interface SimpleAuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined)

export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext)
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider')
  }
  return context
}

interface SimpleAuthProviderProps {
  children: ReactNode
}

export function SimpleAuthProvider({ children }: SimpleAuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const isAuthenticated = !!user

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        
        // Save to localStorage
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        // Save to cookies for middleware
        document.cookie = `auth_token=${data.token}; path=/; max-age=86400; SameSite=Lax`
      } else {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Erro ao fazer login')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    
    // Clear cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }

  const value: SimpleAuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
  }

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  )
}