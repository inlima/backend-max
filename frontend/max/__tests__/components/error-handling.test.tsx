import React from 'react'
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import { ContatosErrorBoundary } from '@/components/error-boundaries/contatos-error-boundary'
import { ProcessosErrorBoundary } from '@/components/error-boundaries/processos-error-boundary'
import { DashboardErrorBoundary } from '@/components/error-boundaries/dashboard-error-boundary'

// Mock error reporting
jest.mock('@/lib/error-reporting', () => ({
  reportError: jest.fn(),
}))

const mockReportError = require('@/lib/error-reporting').reportError

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('Error Boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console.error for these tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    ;(console.error as jest.Mock).mockRestore()
  })

  describe('ContatosErrorBoundary', () => {
    it('catches and displays error correctly', () => {
      render(
        <ContatosErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ContatosErrorBoundary>
      )

      expect(screen.getByText('Erro na página de contatos')).toBeInTheDocument()
      expect(screen.getByText('Ocorreu um erro inesperado. Tente recarregar a página.')).toBeInTheDocument()
      expect(screen.getByText('Recarregar página')).toBeInTheDocument()
    })

    it('renders children when no error occurs', () => {
      render(
        <ContatosErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ContatosErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('reports error to error reporting service', () => {
      render(
        <ContatosErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ContatosErrorBoundary>
      )

      expect(mockReportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          component: 'ContatosErrorBoundary',
          errorBoundary: true,
        })
      )
    })

    it('reloads page when reload button is clicked', () => {
      const mockReload = jest.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      })

      render(
        <ContatosErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ContatosErrorBoundary>
      )

      fireEvent.click(screen.getByText('Recarregar página'))
      expect(mockReload).toHaveBeenCalled()
    })
  })

  describe('ProcessosErrorBoundary', () => {
    it('catches and displays error correctly', () => {
      render(
        <ProcessosErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ProcessosErrorBoundary>
      )

      expect(screen.getByText('Erro na página de processos')).toBeInTheDocument()
      expect(screen.getByText('Ocorreu um erro inesperado. Tente recarregar a página.')).toBeInTheDocument()
    })

    it('provides option to go back to dashboard', () => {
      render(
        <ProcessosErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ProcessosErrorBoundary>
      )

      expect(screen.getByText('Voltar ao Dashboard')).toBeInTheDocument()
    })
  })

  describe('DashboardErrorBoundary', () => {
    it('catches and displays error correctly', () => {
      render(
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )

      expect(screen.getByText('Erro no dashboard')).toBeInTheDocument()
      expect(screen.getByText('Não foi possível carregar o dashboard.')).toBeInTheDocument()
    })

    it('provides fallback dashboard content', () => {
      render(
        <DashboardErrorBoundary>
          <ThrowError shouldThrow={true} />
        </DashboardErrorBoundary>
      )

      expect(screen.getByText('Dashboard Simplificado')).toBeInTheDocument()
      expect(screen.getByText('Ir para Contatos')).toBeInTheDocument()
      expect(screen.getByText('Ir para Processos')).toBeInTheDocument()
    })
  })

  describe('Error Recovery', () => {
    it('recovers from error when component re-renders without error', () => {
      const { rerender } = render(
        <ContatosErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ContatosErrorBoundary>
      )

      expect(screen.getByText('Erro na página de contatos')).toBeInTheDocument()

      rerender(
        <ContatosErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ContatosErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
    })
  })

  describe('Error Details', () => {
    it('shows error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(
        <ContatosErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ContatosErrorBoundary>
      )

      expect(screen.getByText('Detalhes do erro:')).toBeInTheDocument()
      expect(screen.getByText('Test error')).toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })

    it('hides error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      render(
        <ContatosErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ContatosErrorBoundary>
      )

      expect(screen.queryByText('Detalhes do erro:')).not.toBeInTheDocument()
      expect(screen.queryByText('Test error')).not.toBeInTheDocument()

      process.env.NODE_ENV = originalEnv
    })
  })
})

describe('Form Error Handling', () => {
  const FormWithValidation = () => {
    const [errors, setErrors] = React.useState<Record<string, string>>({})
    const [values, setValues] = React.useState({ nome: '', email: '' })

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      const newErrors: Record<string, string> = {}

      if (!values.nome) {
        newErrors.nome = 'Nome é obrigatório'
      }
      if (!values.email) {
        newErrors.email = 'Email é obrigatório'
      } else if (!/\S+@\S+\.\S+/.test(values.email)) {
        newErrors.email = 'Email inválido'
      }

      setErrors(newErrors)
    }

    return (
      <form onSubmit={handleSubmit}>
        <input
          name="nome"
          value={values.nome}
          onChange={(e) => setValues({ ...values, nome: e.target.value })}
          placeholder="Nome"
        />
        {errors.nome && <span role="alert">{errors.nome}</span>}

        <input
          name="email"
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          placeholder="Email"
        />
        {errors.email && <span role="alert">{errors.email}</span>}

        <button type="submit">Salvar</button>
      </form>
    )
  }

  it('displays validation errors correctly', async () => {
    render(<FormWithValidation />)

    fireEvent.click(screen.getByText('Salvar'))

    await waitFor(() => {
      expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument()
      expect(screen.getByText('Email é obrigatório')).toBeInTheDocument()
    })
  })

  it('validates email format', async () => {
    render(<FormWithValidation />)

    fireEvent.change(screen.getByPlaceholderText('Nome'), {
      target: { value: 'João' },
    })
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'invalid-email' },
    })

    fireEvent.click(screen.getByText('Salvar'))

    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument()
    })
  })

  it('clears errors when valid input is provided', async () => {
    render(<FormWithValidation />)

    // First trigger errors
    fireEvent.click(screen.getByText('Salvar'))

    await waitFor(() => {
      expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument()
    })

    // Then provide valid input
    fireEvent.change(screen.getByPlaceholderText('Nome'), {
      target: { value: 'João' },
    })
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'joao@email.com' },
    })

    fireEvent.click(screen.getByText('Salvar'))

    await waitFor(() => {
      expect(screen.queryByText('Nome é obrigatório')).not.toBeInTheDocument()
      expect(screen.queryByText('Email é obrigatório')).not.toBeInTheDocument()
    })
  })
})