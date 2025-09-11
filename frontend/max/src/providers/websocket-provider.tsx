'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { WebSocketEvents } from '@/types'

interface WebSocketContextType {
  socket: Socket | null
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
  connectionStatus: 'disconnected'
})

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

interface WebSocketProviderProps {
  children: ReactNode
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')

  useEffect(() => {
    const websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8000'
    
    setConnectionStatus('connecting')
    
    const newSocket = io(websocketUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5, // Adds randomization to prevent thundering herd
      timeout: 20000,
    })

    newSocket.on('connect', () => {
      setIsConnected(true)
      setConnectionStatus('connected')
      console.log('WebSocket connected to:', websocketUrl)
    })

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false)
      setConnectionStatus('disconnected')
      console.log('WebSocket disconnected:', reason)
    })

    newSocket.on('connect_error', (error) => {
      setConnectionStatus('error')
      console.error('WebSocket connection error:', error)
    })

    newSocket.on('reconnect', (attemptNumber) => {
      setIsConnected(true)
      setConnectionStatus('connected')
      console.log('WebSocket reconnected after', attemptNumber, 'attempts')
    })

    newSocket.on('reconnect_error', (error) => {
      setConnectionStatus('error')
      console.error('WebSocket reconnection error:', error)
    })

    newSocket.on('reconnect_failed', () => {
      setConnectionStatus('error')
      console.error('WebSocket reconnection failed')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  const value = {
    socket,
    isConnected,
    connectionStatus
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}