'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ClearAuthPage() {
  const router = useRouter()

  const clearAuth = () => {
    // Clear all auth-related data
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    
    // Clear any other potential auth data
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.includes('auth') || key.includes('token') || key.includes('user')) {
        localStorage.removeItem(key)
      }
    })
    
    // Force reload to clear any cached state
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Limpar Autenticação</CardTitle>
          <CardDescription>
            Use esta página para limpar todos os dados de autenticação e resolver problemas de login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={clearAuth}
            className="w-full"
            variant="destructive"
          >
            Limpar Dados de Autenticação
          </Button>
          
          <Button 
            onClick={() => router.push('/login')}
            className="w-full"
            variant="outline"
          >
            Ir para Login
          </Button>
          
          <Button 
            onClick={() => router.push('/debug-login')}
            className="w-full"
            variant="outline"
          >
            Ir para Debug Login
          </Button>

          <div className="text-sm text-gray-600 mt-4">
            <p><strong>Esta página irá:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Limpar tokens de autenticação</li>
              <li>Remover dados do usuário</li>
              <li>Resetar o estado da aplicação</li>
              <li>Redirecionar para login</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}