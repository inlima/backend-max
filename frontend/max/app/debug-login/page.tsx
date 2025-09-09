'use client'

import { useState } from 'react'

export default function DebugLoginPage() {
  const [email, setEmail] = useState('admin@advocacia.com')
  const [password, setPassword] = useState('admin123')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult('Iniciando login...')

    try {
      console.log('=== DEBUG LOGIN ===')
      console.log('Email:', email)
      console.log('Password:', password)
      console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
      
      const apiUrl = 'http://localhost:8000/api/auth/login'
      console.log('Full API URL:', apiUrl)
      
      setResult(prev => prev + '\nFazendo requisição para: ' + apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      setResult(prev => prev + '\nStatus da resposta: ' + response.status)

      const data = await response.json()
      console.log('Response data:', data)
      
      setResult(prev => prev + '\nDados recebidos: ' + JSON.stringify(data, null, 2))

      if (response.ok) {
        setResult(prev => prev + '\n\n✅ LOGIN SUCESSO!')
        setResult(prev => prev + '\nToken: ' + data.token.substring(0, 20) + '...')
        setResult(prev => prev + '\nUsuário: ' + JSON.stringify(data.user, null, 2))
        
        // Test storing token
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setResult(prev => prev + '\n\n✅ Token salvo no localStorage')
        
      } else {
        setResult(prev => prev + '\n\n❌ ERRO NO LOGIN')
        setResult(prev => prev + '\nDetalhes: ' + (data.detail || 'Erro desconhecido'))
      }
    } catch (error) {
      console.error('Login error:', error)
      setResult(prev => prev + '\n\n❌ ERRO DE REDE')
      setResult(prev => prev + '\nDetalhes: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    setResult('Testando conexão com o backend...')
    
    try {
      const response = await fetch('http://localhost:8000/')
      const data = await response.json()
      
      setResult(prev => prev + '\n✅ Backend conectado!')
      setResult(prev => prev + '\nResposta: ' + JSON.stringify(data, null, 2))
    } catch (error) {
      setResult(prev => prev + '\n❌ Erro de conexão com backend')
      setResult(prev => prev + '\nDetalhes: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
    }
  }

  const clearStorage = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    setResult('✅ localStorage limpo')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Debug Login Page</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Login Form */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Teste de Login</h2>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Senha:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Testando Login...' : 'Testar Login'}
              </button>
            </form>

            <div className="mt-4 space-y-2">
              <button
                onClick={testConnection}
                className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700"
              >
                Testar Conexão Backend
              </button>
              
              <button
                onClick={clearStorage}
                className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700"
              >
                Limpar localStorage
              </button>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <p><strong>Credenciais de teste:</strong></p>
              <p>admin@advocacia.com / admin123</p>
              <p>recepcionista@advocacia.com / recep123</p>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Resultado do Teste</h2>
            
            {result ? (
              <div className="bg-gray-100 p-4 rounded border">
                <pre className="text-sm whitespace-pre-wrap font-mono overflow-auto max-h-96">
                  {result}
                </pre>
              </div>
            ) : (
              <p className="text-gray-500 italic">Nenhum teste executado ainda...</p>
            )}
          </div>
        </div>

        <div className="mt-6 bg-yellow-100 border border-yellow-400 rounded p-4">
          <h3 className="font-semibold text-yellow-800">Informações de Debug:</h3>
          <ul className="text-sm text-yellow-700 mt-2 space-y-1">
            <li>• Esta página não usa o AuthProvider para evitar interferências</li>
            <li>• Verifique o console do navegador para logs detalhados</li>
            <li>• Backend deve estar rodando em http://localhost:8000</li>
            <li>• Frontend está em http://localhost:3000</li>
          </ul>
        </div>
      </div>
    </div>
  )
}