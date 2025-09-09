'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, LoginCredentials } from '@/types'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = apiClient.getAuthToken()
        
        if (token) {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 5000)
          )
          
          const userPromise = apiClient.getCurrentUser()
          
          const currentUser = await Promise.race([userPromise, timeoutPromise]) as User
          setUser(currentUser)
        }
      } catch (error) {
        // Token is invalid or request failed, clear it
        apiClient.clearAuthToken()
        console.error('Failed to get current user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true)
      const response = await apiClient.login(credentials)
      setUser(response.user)
      toast.success('Login realizado com sucesso!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao fazer login'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  }

  const refreshToken = async () => {
    try {
      await apiClient.refreshToken()
    } catch (error) {
      console.error('Token refresh failed:', error)
      throw error
    }
  }

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!isAuthenticated) return

    const refreshInterval = setInterval(async () => {
      try {
        await refreshToken()
      } catch (error) {
        console.error('Failed to refresh token:', error)
        await logout()
      }
    }, 15 * 60 * 1000) // Refresh every 15 minutes

    return () => clearInterval(refreshInterval)
  }, [isAuthenticated]) // Removed function dependencies to avoid initialization issues

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}