import React from 'react'
import { render, screen, waitFor, act } from '../utils/test-utils'
import { WebSocketProvider, useWebSocket } from '@/providers/websocket-provider'
import { io } from 'socket.io-client'
import { mockContato, mockProcesso } from '../utils/test-utils'

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}))

const mockIo = io as jest.MockedFunction<typeof io>

// Test component that simulates real-time updates
function WebSocketTestComponent() {
  const { socket, isConnected, connectionStatus } = useWebSocket()
  const [contatos, setContatos] = React.useState([mockContato])
  const [processos, setProcessos] = React.useState([mockProcesso])
  const [notifications, setNotifications] = React.useState<string[]>([])

  React.useEffect(() => {
    if (socket) {
      // Listen for real-time events
      socket.on('novo_contato', (novoContato) => {
        setContatos(prev => [novoContato, ...prev])
        setNotifications(prev => [...prev, `Novo contato: ${novoContato.nome}`])
      })

      socket.on('contato_atualizado', (contatoAtualizado) => {
        setContatos(prev => 
          prev.map(c => c.id === contatoAtualizado.id ? contatoAtualizado : c)
        )
        setNotifications(prev => [...prev, `Contato atualizado: ${contatoAtualizado.nome}`])
      })

      socket.on('processo_atualizado', (processoAtualizado) => {
        setProcessos(prev => 
          prev.map(p => p.id === processoAtualizado.id ? processoAtualizado : p)
        )
        setNotifications(prev => [...prev, `Processo atualizado: ${processoAtualizado.titulo}`])
      })

      socket.on('novo_processo', (novoProcesso) => {
        setProcessos(prev => [novoProcesso, ...prev])
        setNotifications(prev => [...prev, `Novo processo: ${novoProcesso.titulo}`])
      })

      return () => {
        socket.off('novo_contato')
        socket.off('contato_atualizado')
        socket.off('processo_atualizado')
        socket.off('novo_processo')
      }
    }
  }, [socket])

  return (
    <div>
      <div data-testid="connection-status">{connectionStatus}</div>
      <div data-testid="is-connected">{isConnected.toString()}</div>
      
      <div data-testid="contatos-count">{contatos.length}</div>
      <div data-testid="processos-count">{processos.length}</div>
      
      <div data-testid="notifications">
        {notifications.map((notification, index) => (
          <div key={index} data-testid={`notification-${index}`}>
            {notification}
          </div>
        ))}
      </div>

      <div data-testid="contatos-list">
        {contatos.map(contato => (
          <div key={contato.id} data-testid={`contato-${contato.id}`}>
            {contato.nome}
          </div>
        ))}
      </div>

      <div data-testid="processos-list">
        {processos.map(processo => (
          <div key={processo.id} data-testid={`processo-${processo.id}`}>
            {processo.titulo}
          </div>
        ))}
      </div>
    </div>
  )
}

describe('WebSocket Integration Tests', () => {
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

  it('should handle real-time contato updates', async () => {
    render(
      <WebSocketProvider>
        <WebSocketTestComponent />
      </WebSocketProvider>
    )

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )[1]
    
    act(() => {
      connectHandler()
    })

    await waitFor(() => {
      expect(screen.getByTestId('is-connected')).toHaveTextContent('true')
    })

    // Simulate novo_contato event
    const novoContatoHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'novo_contato'
    )[1]

    const novoContato = {
      ...mockContato,
      id: '2',
      nome: 'Maria Santos',
      telefone: '+5511888888888',
    }

    act(() => {
      novoContatoHandler(novoContato)
    })

    await waitFor(() => {
      expect(screen.getByTestId('contatos-count')).toHaveTextContent('2')
      expect(screen.getByTestId('contato-2')).toHaveTextContent('Maria Santos')
      expect(screen.getByTestId('notification-0')).toHaveTextContent('Novo contato: Maria Santos')
    })
  })

  it('should handle contato updates', async () => {
    render(
      <WebSocketProvider>
        <WebSocketTestComponent />
      </WebSocketProvider>
    )

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )[1]
    
    act(() => {
      connectHandler()
    })

    // Simulate contato_atualizado event
    const contatoAtualizadoHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'contato_atualizado'
    )[1]

    const contatoAtualizado = {
      ...mockContato,
      nome: 'João Silva Atualizado',
      status: 'em_atendimento' as const,
    }

    act(() => {
      contatoAtualizadoHandler(contatoAtualizado)
    })

    await waitFor(() => {
      expect(screen.getByTestId('contato-1')).toHaveTextContent('João Silva Atualizado')
      expect(screen.getByTestId('notification-0')).toHaveTextContent('Contato atualizado: João Silva Atualizado')
    })
  })

  it('should handle real-time processo updates', async () => {
    render(
      <WebSocketProvider>
        <WebSocketTestComponent />
      </WebSocketProvider>
    )

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )[1]
    
    act(() => {
      connectHandler()
    })

    // Simulate novo_processo event
    const novoProcessoHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'novo_processo'
    )[1]

    const novoProcesso = {
      ...mockProcesso,
      id: '2',
      titulo: 'Novo Processo de Família',
      areaJuridica: 'Direito de Família',
    }

    act(() => {
      novoProcessoHandler(novoProcesso)
    })

    await waitFor(() => {
      expect(screen.getByTestId('processos-count')).toHaveTextContent('2')
      expect(screen.getByTestId('processo-2')).toHaveTextContent('Novo Processo de Família')
      expect(screen.getByTestId('notification-0')).toHaveTextContent('Novo processo: Novo Processo de Família')
    })
  })

  it('should handle processo updates', async () => {
    render(
      <WebSocketProvider>
        <WebSocketTestComponent />
      </WebSocketProvider>
    )

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )[1]
    
    act(() => {
      connectHandler()
    })

    // Simulate processo_atualizado event
    const processoAtualizadoHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'processo_atualizado'
    )[1]

    const processoAtualizado = {
      ...mockProcesso,
      titulo: 'Ação de Divórcio - Atualizada',
      status: 'finalizado' as const,
    }

    act(() => {
      processoAtualizadoHandler(processoAtualizado)
    })

    await waitFor(() => {
      expect(screen.getByTestId('processo-1')).toHaveTextContent('Ação de Divórcio - Atualizada')
      expect(screen.getByTestId('notification-0')).toHaveTextContent('Processo atualizado: Ação de Divórcio - Atualizada')
    })
  })

  it('should handle multiple rapid updates', async () => {
    render(
      <WebSocketProvider>
        <WebSocketTestComponent />
      </WebSocketProvider>
    )

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )[1]
    
    act(() => {
      connectHandler()
    })

    // Get event handlers
    const novoContatoHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'novo_contato'
    )[1]
    
    const novoProcessoHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'novo_processo'
    )[1]

    // Simulate rapid updates
    act(() => {
      // Add multiple contatos
      novoContatoHandler({ ...mockContato, id: '2', nome: 'Contato 2' })
      novoContatoHandler({ ...mockContato, id: '3', nome: 'Contato 3' })
      
      // Add multiple processos
      novoProcessoHandler({ ...mockProcesso, id: '2', titulo: 'Processo 2' })
      novoProcessoHandler({ ...mockProcesso, id: '3', titulo: 'Processo 3' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('contatos-count')).toHaveTextContent('3')
      expect(screen.getByTestId('processos-count')).toHaveTextContent('3')
      expect(screen.getByTestId('notification-3')).toBeInTheDocument()
    })
  })

  it('should handle connection loss and reconnection', async () => {
    render(
      <WebSocketProvider>
        <WebSocketTestComponent />
      </WebSocketProvider>
    )

    // Simulate initial connection
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )[1]
    
    act(() => {
      connectHandler()
    })

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('connected')
    })

    // Simulate disconnection
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

    // Simulate reconnection
    const reconnectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'reconnect'
    )[1]

    act(() => {
      reconnectHandler(2) // Reconnected after 2 attempts
    })

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('connected')
      expect(screen.getByTestId('is-connected')).toHaveTextContent('true')
    })
  })

  it('should clean up event listeners on unmount', () => {
    const { unmount } = render(
      <WebSocketProvider>
        <WebSocketTestComponent />
      </WebSocketProvider>
    )

    // Simulate connection to set up event listeners
    const connectHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect'
    )[1]
    
    act(() => {
      connectHandler()
    })

    // Unmount component
    unmount()

    // Check that socket.off was called for cleanup
    expect(mockSocket.off).toHaveBeenCalledWith('novo_contato')
    expect(mockSocket.off).toHaveBeenCalledWith('contato_atualizado')
    expect(mockSocket.off).toHaveBeenCalledWith('processo_atualizado')
    expect(mockSocket.off).toHaveBeenCalledWith('novo_processo')
  })

  it('should handle connection errors gracefully', async () => {
    render(
      <WebSocketProvider>
        <WebSocketTestComponent />
      </WebSocketProvider>
    )

    // Simulate connection error
    const errorHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'connect_error'
    )[1]

    act(() => {
      errorHandler(new Error('Connection failed'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('error')
      expect(screen.getByTestId('is-connected')).toHaveTextContent('false')
    })
  })
})