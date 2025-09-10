import React from 'react'
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import { ContatoDetailDrawer } from '@/components/contato-detail-drawer'
import { mockContato } from '../utils/test-utils'

// Mock the API hooks
jest.mock('@/hooks/use-api', () => ({
  useUpdateContato: () => ({
    mutate: jest.fn(),
    isLoading: false,
  }),
  useConversaHistory: () => ({
    data: [],
    isLoading: false,
  }),
  useProcessosRelacionados: () => ({
    data: [],
    isLoading: false,
  }),
}))

describe('ContatoDetailDrawer', () => {
  const mockProps = {
    contato: mockContato,
    open: true,
    onOpenChange: jest.fn(),
    onUpdate: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders contato details correctly', () => {
    render(<ContatoDetailDrawer {...mockProps} />)

    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('+5511999999999')).toBeInTheDocument()
    expect(screen.getByText('joao@email.com')).toBeInTheDocument()
    expect(screen.getByText('Direito Civil')).toBeInTheDocument()
  })

  it('displays all tabs correctly', () => {
    render(<ContatoDetailDrawer {...mockProps} />)

    expect(screen.getByText('Informações')).toBeInTheDocument()
    expect(screen.getByText('Conversas')).toBeInTheDocument()
    expect(screen.getByText('Processos')).toBeInTheDocument()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
  })

  it('switches between tabs correctly', async () => {
    render(<ContatoDetailDrawer {...mockProps} />)

    // Initially shows informações tab
    expect(screen.getByText('Status do Contato')).toBeInTheDocument()

    // Switch to conversas tab
    fireEvent.click(screen.getByText('Conversas'))
    await waitFor(() => {
      expect(screen.getByText('Histórico de Conversas')).toBeInTheDocument()
    })

    // Switch to processos tab
    fireEvent.click(screen.getByText('Processos'))
    await waitFor(() => {
      expect(screen.getByText('Processos Relacionados')).toBeInTheDocument()
    })

    // Switch to timeline tab
    fireEvent.click(screen.getByText('Timeline'))
    await waitFor(() => {
      expect(screen.getByText('Histórico de Interações')).toBeInTheDocument()
    })
  })

  it('allows editing contato information', async () => {
    render(<ContatoDetailDrawer {...mockProps} />)

    const editButton = screen.getByLabelText('Editar contato')
    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue('João Silva')).toBeInTheDocument()
      expect(screen.getByDisplayValue('+5511999999999')).toBeInTheDocument()
    })

    const nameInput = screen.getByDisplayValue('João Silva')
    fireEvent.change(nameInput, { target: { value: 'João Santos' } })

    const saveButton = screen.getByText('Salvar')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockProps.onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'João Santos',
        })
      )
    })
  })

  it('validates required fields when editing', async () => {
    render(<ContatoDetailDrawer {...mockProps} />)

    const editButton = screen.getByLabelText('Editar contato')
    fireEvent.click(editButton)

    const nameInput = screen.getByDisplayValue('João Silva')
    fireEvent.change(nameInput, { target: { value: '' } })

    const saveButton = screen.getByText('Salvar')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument()
    })
  })

  it('displays status badge correctly', () => {
    render(<ContatoDetailDrawer {...mockProps} />)

    expect(screen.getByText('Novo')).toBeInTheDocument()
    expect(screen.getByTestId('status-badge')).toHaveClass('bg-blue-100')
  })

  it('shows favorite status correctly', () => {
    const favoriteContato = { ...mockContato, favorito: true }
    render(<ContatoDetailDrawer {...mockProps} contato={favoriteContato} />)

    expect(screen.getByLabelText('Remover dos favoritos')).toBeInTheDocument()
  })

  it('toggles favorite status when clicked', async () => {
    render(<ContatoDetailDrawer {...mockProps} />)

    const favoriteButton = screen.getByLabelText('Adicionar aos favoritos')
    fireEvent.click(favoriteButton)

    await waitFor(() => {
      expect(mockProps.onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          favorito: true,
        })
      )
    })
  })

  it('displays tags correctly', () => {
    const contatoWithTags = {
      ...mockContato,
      tags: ['Cliente VIP', 'Urgente'],
    }
    render(<ContatoDetailDrawer {...mockProps} contato={contatoWithTags} />)

    expect(screen.getByText('Cliente VIP')).toBeInTheDocument()
    expect(screen.getByText('Urgente')).toBeInTheDocument()
  })

  it('allows adding new tags', async () => {
    render(<ContatoDetailDrawer {...mockProps} />)

    const editButton = screen.getByLabelText('Editar contato')
    fireEvent.click(editButton)

    const tagInput = screen.getByPlaceholderText('Adicionar tag')
    fireEvent.change(tagInput, { target: { value: 'Nova Tag' } })
    fireEvent.keyDown(tagInput, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('Nova Tag')).toBeInTheDocument()
    })
  })

  it('closes drawer when close button is clicked', () => {
    render(<ContatoDetailDrawer {...mockProps} />)

    const closeButton = screen.getByLabelText('Fechar')
    fireEvent.click(closeButton)

    expect(mockProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('displays loading state when updating', () => {
    const mockUseUpdateContato = require('@/hooks/use-api').useUpdateContato
    mockUseUpdateContato.mockReturnValue({
      mutate: jest.fn(),
      isLoading: true,
    })

    render(<ContatoDetailDrawer {...mockProps} />)

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('handles keyboard navigation correctly', async () => {
    render(<ContatoDetailDrawer {...mockProps} />)

    // Tab navigation
    fireEvent.keyDown(screen.getByText('Informações'), { key: 'Tab' })
    await waitFor(() => {
      expect(screen.getByText('Conversas')).toHaveFocus()
    })

    // Arrow key navigation
    fireEvent.keyDown(screen.getByText('Conversas'), { key: 'ArrowRight' })
    await waitFor(() => {
      expect(screen.getByText('Processos')).toHaveFocus()
    })

    // Enter to activate tab
    fireEvent.keyDown(screen.getByText('Processos'), { key: 'Enter' })
    await waitFor(() => {
      expect(screen.getByText('Processos Relacionados')).toBeInTheDocument()
    })
  })
})