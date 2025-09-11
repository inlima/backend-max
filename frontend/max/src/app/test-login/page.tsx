'use client'

import { useState } from 'react'

export default function TestLoginPage() {
  const [email, setEmail] = useState('admin@advocacia.com')
  const [password, setPassword] = useState('admin123')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult('')

    try {
      console.log('Attempting login with:', { email, password })
      
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      const data = await response.json()
      console.log('Response data:', data)

      if (response.ok) {
        setResult(`Success! Token: ${data.token.substring(0, 20)}... User: ${JSON.stringify(data.user, null, 2)}`)
      } else {
        setResult(`Error: ${data.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Login error:', error)
      setResult(`Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Test Login</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-medium mb-2">Result:</h3>
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Test credentials:</p>
          <p>admin@advocacia.com / admin123</p>
          <p>recepcionista@advocacia.com / recep123</p>
        </div>
      </div>
    </div>
  )
}