import React from 'react'
import { render, screen, waitFor, act } from '../utils/test-utils'
import { WebSocketProvider, useWebSocket } from '@/providers/websocket-provider'
import { io } from 'socket.io-client'

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}))

const mockIo = io as jest.MockedFunction<typeof io>

// Test component that uses the WebSocket context
function TestComponent() {
  const { socket, isConnected, connectionStatus } = useWebSocket()
  
  return (
    <div>
      <div data-testid="connection-status">{connectionStatus}</div>
      <div data-testid="is-connected">{isConnected.toString()}</div>
      <div data-testid="socket-exists">{socket ? 'true' : 'false'}</div>
    </div>
  )
}

describe('WebSocketProvider', () => {
  let mockSocket: any

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      close: jest.fn(),
      connected: false,
    }
    
    mockIo.mockReturnValue(mockSocket)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('provides initial WebSocket context values', () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )

    expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected')
    expect(screen.getByTestId('is-connected')).toHaveTextContent('false')
    expect(screen.getByTestId('socket-exists')).toHaveTextContent('true')
  })

  it('creates socket connection with correct configuration', () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )

    expect(mockIo).toHaveBeenCalledWith('ws://localhost:8000', {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      timeout: 20000,
    })
  })

  it('sets up event listeners on socket creation', () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )

    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('reconnect', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('reconnect_error', expect.any(Function))
    expect(mockSocket.on).toHaveBeenCalledWith('reconnect_failed', expect.any(Function))
  })

  it('updates connection status on connect event', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )

    // Get the connect event handler
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )[1]

    // Simulate connect event
    act(() => {
      connectHandler()
    })

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('connected')
      expect(screen.getByTestId('is-connected')).toHaveTextContent('true')
    })
  })

  it('updates connection status on disconnect event', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )

    // First connect
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )[1]
    
    act(() => {
      connectHandler()
    })

    // Then disconnect
    const disconnectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'disconnect'
    )[1]

    act(() => {
      disconnectHandler('transport close')
    })

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected')
      expect(screen.getByTestId('is-connected')).toHaveTextContent('false')
    })
  })

  it('updates connection status on connection error', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )

    const errorHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect_error'
    )[1]

    act(() => {
      errorHandler(new Error('Connection failed'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('error')
    })
  })

  it('handles reconnection events', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )

    const reconnectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'reconnect'
    )[1]

    act(() => {
      reconnectHandler(3) // Reconnected after 3 attempts
    })

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('connected')
      expect(screen.getByTestId('is-connected')).toHaveTextContent('true')
    })
  })

  it('handles reconnection failure', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )

    const reconnectFailedHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'reconnect_failed'
    )[1]

    act(() => {
      reconnectFailedHandler()
    })

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('error')
    })
  })

  it('closes socket on unmount', () => {
    const { unmount } = render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )

    unmount()

    expect(mockSocket.close).toHaveBeenCalled()
  })

  it('throws error when useWebSocket is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useWebSocket must be used within a WebSocketProvider')

    consoleSpy.mockRestore()
  })

  it('uses custom WebSocket URL from environment variable', () => {
    const originalEnv = process.env.NEXT_PUBLIC_WEBSOCKET_URL
    process.env.NEXT_PUBLIC_WEBSOCKET_URL = 'ws://custom-url:3000'

    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )

    expect(mockIo).toHaveBeenCalledWith('ws://custom-url:3000', expect.any(Object))

    // Restore original env
    process.env.NEXT_PUBLIC_WEBSOCKET_URL = originalEnv
  })
})