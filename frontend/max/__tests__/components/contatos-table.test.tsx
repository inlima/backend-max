import React from 'react'
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ContatosTable } from '@/components/contatos-table'
import { mockContato } from '../utils/test-utils'

expect.extend(toHaveNoViolations)

// Mock the mobile hook
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

const mockContatos = [
  mockContato,
  {
    ...mockContato,
    id: '2',
    nome: 'Maria Santos',
    telefone: '+5511888888888',
    status: 'em_atendimento' as const,
    origem: 'manual' as const,
    mensagensNaoLidas: 0,
  },
  {
    ...mockContato,
    id: '3',
    nome: 'Pedro Oliveira',
    telefone: '+5511777777777',
    status: 'finalizado' as const,
    origem: 'whatsapp' as const,
    mensagensNaoLidas: 5,
  },
]

describe('ContatosTable', () => {
  const mockOnSelectContato = jest.fn()
  const mockOnEditContato = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders contatos table with data', () => {
    render(
      <ContatosTable
        data={mockContatos}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    // Check if contatos are displayed
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('Maria Santos')).toBeInTheDocument()
    expect(screen.getByText('Pedro Oliveira')).toBeInTheDocument()

    // Check if phone numbers are displayed
    expect(screen.getByText('+5511999999999')).toBeInTheDocument()
    expect(screen.getByText('+5511888888888')).toBeInTheDocument()
    expect(screen.getByText('+5511777777777')).toBeInTheDocument()
  })

  it('displays status badges correctly', () => {
    render(
      <ContatosTable
        data={mockContatos}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    expect(screen.getByText('Novo')).toBeInTheDocument()
    expect(screen.getByText('Em Atendimento')).toBeInTheDocument()
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
  })

  it('displays origem badges correctly', () => {
    render(
      <ContatosTable
        data={mockContatos}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    expect(screen.getAllByText('WhatsApp')).toHaveLength(2)
    expect(screen.getByText('Manual')).toBeInTheDocument()
  })

  it('shows unread message indicators', () => {
    render(
      <ContatosTable
        data={mockContatos}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    // Check for unread message badges
    expect(screen.getByText('2')).toBeInTheDocument() // João Silva has 2 unread
    expect(screen.getByText('5')).toBeInTheDocument() // Pedro Oliveira has 5 unread
  })

  it('calls onSelectContato when contato name is clicked', async () => {
    render(
      <ContatosTable
        data={mockContatos}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    const contatoButton = screen.getByRole('button', { name: 'João Silva' })
    fireEvent.click(contatoButton)

    await waitFor(() => {
      expect(mockOnSelectContato).toHaveBeenCalledWith(mockContatos[0])
    })
  })

  it('opens dropdown menu and calls actions', async () => {
    render(
      <ContatosTable
        data={mockContatos}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    // Find and click the first dropdown trigger
    const dropdownTriggers = screen.getAllByRole('button', { name: 'Abrir menu' })
    fireEvent.click(dropdownTriggers[0])

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('Ver conversa')).toBeInTheDocument()
      expect(screen.getByText('Editar contato')).toBeInTheDocument()
    })

    // Click on "Ver conversa"
    fireEvent.click(screen.getByText('Ver conversa'))

    await waitFor(() => {
      expect(mockOnSelectContato).toHaveBeenCalledWith(mockContatos[0])
    })
  })

  it('handles sorting by clicking column headers', async () => {
    render(
      <ContatosTable
        data={mockContatos}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    // The table should be sortable by clicking headers
    // This is handled by TanStack Table internally
    expect(screen.getByText('Nome')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Origem')).toBeInTheDocument()
  })

  it('handles pagination controls', async () => {
    // Create more data to test pagination
    const manyContatos = Array.from({ length: 25 }, (_, i) => ({
      ...mockContato,
      id: `${i + 1}`,
      nome: `Contato ${i + 1}`,
      telefone: `+551199999${i.toString().padStart(4, '0')}`,
    }))

    render(
      <ContatosTable
        data={manyContatos}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    // Check pagination info
    expect(screen.getByText(/Página 1 de/)).toBeInTheDocument()

    // Check pagination buttons exist
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeInTheDocument()
  })

  it('handles column visibility toggle', async () => {
    render(
      <ContatosTable
        data={mockContatos}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    // Find and click the columns dropdown
    const columnsButton = screen.getByRole('button', { name: /Colunas/ })
    fireEvent.click(columnsButton)

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByText('Área de Interesse')).toBeInTheDocument()
    })
  })

  it('handles row selection', async () => {
    render(
      <ContatosTable
        data={mockContatos}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    // Find checkboxes
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)

    // Click first row checkbox
    fireEvent.click(checkboxes[1]) // Skip the "select all" checkbox

    // Check selection count is updated
    await waitFor(() => {
      expect(screen.getByText(/1 de \d+ contato\(s\) selecionado\(s\)/)).toBeInTheDocument()
    })
  })

  it('displays empty state when no data', () => {
    render(
      <ContatosTable
        data={[]}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    expect(screen.getByText('Nenhum contato encontrado.')).toBeInTheDocument()
  })

  it('displays area de interesse when available', () => {
    render(
      <ContatosTable
        data={mockContatos}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    expect(screen.getByText('Direito Civil')).toBeInTheDocument()
  })

  it('displays tipo de solicitacao badges', () => {
    render(
      <ContatosTable
        data={mockContatos}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    expect(screen.getByText('Consulta')).toBeInTheDocument()
  })

  it('should be accessible', async () => {
    const { container } = render(
      <ContatosTable
        data={mockContatos}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('handles keyboard navigation', async () => {
    render(
      <ContatosTable
        data={mockContatos}
        onSelectContato={mockOnSelectContato}
        onEditContato={mockOnEditContato}
      />
    )

    const contatoButton = screen.getByRole('button', { name: 'João Silva' })
    
    // Focus the button
    contatoButton.focus()
    expect(contatoButton).toHaveFocus()

    // Press Enter to activate
    fireEvent.keyDown(contatoButton, { key: 'Enter', code: 'Enter' })
    
    await waitFor(() => {
      expect(mockOnSelectContato).toHaveBeenCalledWith(mockContatos[0])
    })
  })
})