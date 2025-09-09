'use client'

import { useAuth } from '@/providers/auth-provider'
import { User } from '@/types'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { LoadingIndicator } from '@/components/loading/loading-indicators'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: User['role'] | User['role'][]
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallback 
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingIndicator size="lg" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return null
  }

  // Check role-based access
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    const hasRequiredRole = allowedRoles.includes(user.role)

    if (!hasRequiredRole) {
      return (
        fallback || (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-2">
                Acesso Negado
              </h1>
              <p className="text-gray-600">
                Você não tem permissão para acessar esta página.
              </p>
            </div>
          </div>
        )
      )
    }
  }

  return <>{children}</>
}

// Higher-order component for page-level protection
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: User['role'] | User['role'][]
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}