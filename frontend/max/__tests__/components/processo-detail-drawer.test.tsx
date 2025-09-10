import React from 'react'
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import { ProcessoDetailDrawer } from '@/components/processo-detail-drawer'
import { mockProcesso } from '../utils/test-utils'

// Mock the API hooks
jest.mock('@/hooks/use-api', () => ({
  useUpdateProcesso: () => ({
    mutate: jest.fn(),
    isLoading: false,
  }),
  useProcessoTimeline: () => ({
    data: [
      {
        id: '1',
        tipo: 'criacao',
        titulo: 'Processo criado',
        descricao: 'Processo criado no sistema',
        usuario: 'Sistema',
        timestamp: new Date('2024-01-15T09:00:00Z'),
      },
    ],
    isLoading: false,
  }),
  useProcessoDocumentos: () => ({
    data: [],
    isLoading: false,
  }),
}))

describe('ProcessoDetailDrawer', () => {
  const mockProps = {
    processo: mockProcesso,
    open: true,
    onOpenChange: jest.fn(),
    onUpdate: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders processo details correctly', () => {
    render(<ProcessoDetailDrawer {...mockProps} />)

    expect(screen.getByText('Ação de Divórcio')).toBeInTheDocument()
    expect(screen.getByText('1234567-89.2024.8.26.0001')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('Direito de Família')).toBeInTheDocument()
  })

  it('displays all tabs correctly', () => {
    render(<ProcessoDetailDrawer {...mockProps} />)

    expect(screen.getByText('Detalhes')).toBeInTheDocument()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(screen.getByText('Documentos')).toBeInTheDocument()
    expect(screen.getByText('Prazos')).toBeInTheDocument()
    expect(screen.getByText('Anotações')).toBeInTheDocument()
  })

  it('switches between tabs correctly', async () => {
    render(<ProcessoDetailDrawer {...mockProps} />)

    // Initially shows detalhes tab
    expect(screen.getByText('Status do Processo')).toBeInTheDocument()

    // Switch to timeline tab
    fireEvent.click(screen.getByText('Timeline'))
    await waitFor(() => {
      expect(screen.getByText('Histórico do Processo')).toBeInTheDocument()
    })

    // Switch to documentos tab
    fireEvent.click(screen.getByText('Documentos'))
    await waitFor(() => {
      expect(screen.getByText('Documentos do Processo')).toBeInTheDocument()
    })
  })

  it('displays status badge correctly', () => {
    render(<ProcessoDetailDrawer {...mockProps} />)

    expect(screen.getByText('Em Andamento')).toBeInTheDocument()
    expect(screen.getByTestId('status-badge')).toHaveClass('bg-yellow-100')
  })

  it('displays priority indicator correctly', () => {
    render(<ProcessoDetailDrawer {...mockProps} />)

    expect(screen.getByText('Média')).toBeInTheDocument()
    expect(screen.getByTestId('priority-badge')).toHaveClass('bg-blue-100')
  })

  it('shows prazo proximity warning', () => {
    const processoComPrazoProximo = {
      ...mockProcesso,
      prazoLimite: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    }
    render(<ProcessoDetailDrawer {...mockProps} processo={processoComPrazoProximo} />)

    expect(screen.getByText('Prazo próximo!')).toBeInTheDocument()
    expect(screen.getByTestId('prazo-warning')).toHaveClass('text-orange-600')
  })

  it('shows prazo overdue warning', () => {
    const processoAtrasado = {
      ...mockProcesso,
      prazoLimite: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    }
    render(<ProcessoDetailDrawer {...mockProps} processo={processoAtrasado} />)

    expect(screen.getByText('Prazo vencido!')).toBeInTheDocument()
    expect(screen.getByTestId('prazo-warning')).toHaveClass('text-red-600')
  })

  it('allows editing processo information', async () => {
    render(<ProcessoDetailDrawer {...mockProps} />)

    const editButton = screen.getByLabelText('Editar processo')
    fireEvent.click(editButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Ação de Divórcio')).toBeInTheDocument()
    })

    const titleInput = screen.getByDisplayValue('Ação de Divórcio')
    fireEvent.change(titleInput, { target: { value: 'Ação de Divórcio Consensual' } })

    const saveButton = screen.getByText('Salvar')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockProps.onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: 'Ação de Divórcio Consensual',
        })
      )
    })
  })

  it('validates required fields when editing', async () => {
    render(<ProcessoDetailDrawer {...mockProps} />)

    const editButton = screen.getByLabelText('Editar processo')
    fireEvent.click(editButton)

    const titleInput = screen.getByDisplayValue('Ação de Divórcio')
    fireEvent.change(titleInput, { target: { value: '' } })

    const saveButton = screen.getByText('Salvar')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Título é obrigatório')).toBeInTheDocument()
    })
  })

  it('displays timeline events correctly', async () => {
    render(<ProcessoDetailDrawer {...mockProps} />)

    fireEvent.click(screen.getByText('Timeline'))

    await waitFor(() => {
      expect(screen.getByText('Processo criado')).toBeInTheDocument()
      expect(screen.getByText('Processo criado no sistema')).toBeInTheDocument()
      expect(screen.getByText('Sistema')).toBeInTheDocument()
    })
  })

  it('allows adding new anotação', async () => {
    render(<ProcessoDetailDrawer {...mockProps} />)

    fireEvent.click(screen.getByText('Anotações'))

    const anotacaoInput = screen.getByPlaceholderText('Adicionar anotação...')
    fireEvent.change(anotacaoInput, { target: { value: 'Nova anotação importante' } })

    const addButton = screen.getByText('Adicionar')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(mockProps.onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          anotacoes: expect.arrayContaining([
            expect.objectContaining({
              texto: 'Nova anotação importante',
            }),
          ]),
        })
      )
    })
  })

  it('handles document upload', async () => {
    render(<ProcessoDetailDrawer {...mockProps} />)

    fireEvent.click(screen.getByText('Documentos'))

    const fileInput = screen.getByLabelText('Selecionar arquivo')
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })

    const uploadButton = screen.getByText('Fazer Upload')
    fireEvent.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByText('Documento enviado com sucesso')).toBeInTheDocument()
    })
  })

  it('displays advogado responsável correctly', () => {
    render(<ProcessoDetailDrawer {...mockProps} />)

    expect(screen.getByText('Dr. Carlos Oliveira')).toBeInTheDocument()
  })

  it('allows changing advogado responsável', async () => {
    render(<ProcessoDetailDrawer {...mockProps} />)

    const editButton = screen.getByLabelText('Editar processo')
    fireEvent.click(editButton)

    const advogadoSelect = screen.getByLabelText('Advogado Responsável')
    fireEvent.change(advogadoSelect, { target: { value: 'Dr. Maria Silva' } })

    const saveButton = screen.getByText('Salvar')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockProps.onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          advogadoResponsavel: 'Dr. Maria Silva',
        })
      )
    })
  })

  it('closes drawer when close button is clicked', () => {
    render(<ProcessoDetailDrawer {...mockProps} />)

    const closeButton = screen.getByLabelText('Fechar')
    fireEvent.click(closeButton)

    expect(mockProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('displays loading state when updating', () => {
    const mockUseUpdateProcesso = require('@/hooks/use-api').useUpdateProcesso
    mockUseUpdateProcesso.mockReturnValue({
      mutate: jest.fn(),
      isLoading: true,
    })

    render(<ProcessoDetailDrawer {...mockProps} />)

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })
})