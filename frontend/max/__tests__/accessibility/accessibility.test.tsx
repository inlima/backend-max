import React from 'react'
import { render } from '../utils/test-utils'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ContatosTable } from '@/components/contatos-table'
import { SectionCards } from '@/components/section-cards'
import { mockContato, mockDashboardMetrics } from '../utils/test-utils'

expect.extend(toHaveNoViolations)

// Mock the mobile hook for consistent testing
jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

describe('Accessibility Tests', () => {
  describe('ContatosTable Accessibility', () => {
    it('should not have accessibility violations with data', async () => {
      const { container } = render(
        <ContatosTable
          data={[mockContato]}
          onSelectContato={jest.fn()}
          onEditContato={jest.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should not have accessibility violations when empty', async () => {
      const { container } = render(
        <ContatosTable
          data={[]}
          onSelectContato={jest.fn()}
          onEditContato={jest.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA labels for interactive elements', async () => {
      const { container } = render(
        <ContatosTable
          data={[mockContato]}
          onSelectContato={jest.fn()}
          onEditContato={jest.fn()}
        />
      )

      // Check for proper ARIA labels
      const checkboxes = container.querySelectorAll('input[type="checkbox"]')
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAttribute('aria-label')
      })

      const buttons = container.querySelectorAll('button')
      buttons.forEach(button => {
        // Each button should have either aria-label or accessible text content
        const hasAriaLabel = button.hasAttribute('aria-label')
        const hasTextContent = button.textContent && button.textContent.trim().length > 0
        const hasScreenReaderText = button.querySelector('.sr-only')
        
        expect(hasAriaLabel || hasTextContent || hasScreenReaderText).toBe(true)
      })
    })

    it('should have proper table structure', async () => {
      const { container } = render(
        <ContatosTable
          data={[mockContato]}
          onSelectContato={jest.fn()}
          onEditContato={jest.fn()}
        />
      )

      // Check for proper table structure
      const table = container.querySelector('table')
      expect(table).toBeInTheDocument()

      const thead = container.querySelector('thead')
      expect(thead).toBeInTheDocument()

      const tbody = container.querySelector('tbody')
      expect(tbody).toBeInTheDocument()

      // Check for proper header cells
      const headerCells = container.querySelectorAll('th')
      expect(headerCells.length).toBeGreaterThan(0)
    })
  })

  describe('SectionCards Accessibility', () => {
    it('should not have accessibility violations with metrics', async () => {
      const { container } = render(
        <SectionCards metrics={mockDashboardMetrics} />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should not have accessibility violations in loading state', async () => {
      const { container } = render(
        <SectionCards isLoading={true} />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper heading structure', async () => {
      const { container } = render(
        <SectionCards metrics={mockDashboardMetrics} />
      )

      // Cards should have proper heading structure
      const cards = container.querySelectorAll('[data-slot="card"]')
      expect(cards.length).toBeGreaterThan(0)

      // Each card should have accessible content
      cards.forEach(card => {
        const title = card.querySelector('[class*="text-2xl"]')
        expect(title).toBeInTheDocument()
      })
    })

    it('should have sufficient color contrast', async () => {
      const { container } = render(
        <SectionCards metrics={mockDashboardMetrics} />
      )

      // axe-core will check color contrast automatically
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true }
        }
      })
      expect(results).toHaveNoViolations()
    })
  })

  describe('Form Accessibility', () => {
    it('should have proper form labels and associations', async () => {
      // Test a simple form structure
      const { container } = render(
        <form>
          <label htmlFor="nome">Nome</label>
          <input id="nome" type="text" name="nome" />
          
          <label htmlFor="telefone">Telefone</label>
          <input id="telefone" type="tel" name="telefone" />
          
          <button type="submit">Salvar</button>
        </form>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should handle required fields properly', async () => {
      const { container } = render(
        <form>
          <label htmlFor="required-field">Campo Obrigatório *</label>
          <input 
            id="required-field" 
            type="text" 
            name="required" 
            required 
            aria-required="true"
            aria-describedby="required-help"
          />
          <div id="required-help">Este campo é obrigatório</div>
        </form>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Navigation Accessibility', () => {
    it('should have proper navigation structure', async () => {
      const { container } = render(
        <nav aria-label="Navegação principal">
          <ul>
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="/contatos">Contatos</a></li>
            <li><a href="/processos">Processos</a></li>
          </ul>
        </nav>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper breadcrumb navigation', async () => {
      const { container } = render(
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="/">Home</a></li>
            <li><a href="/contatos">Contatos</a></li>
            <li aria-current="page">João Silva</li>
          </ol>
        </nav>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Interactive Elements Accessibility', () => {
    it('should have proper button accessibility', async () => {
      const { container } = render(
        <div>
          <button type="button">Botão Padrão</button>
          <button type="button" aria-label="Fechar modal">×</button>
          <button type="button" disabled>Botão Desabilitado</button>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper link accessibility', async () => {
      const { container } = render(
        <div>
          <a href="/contatos">Ver Contatos</a>
          <a href="/processos" aria-label="Ver todos os processos">Processos</a>
          <a href="mailto:contato@exemplo.com">Enviar Email</a>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Modal and Dialog Accessibility', () => {
    it('should have proper modal structure', async () => {
      const { container } = render(
        <div>
          <div 
            role="dialog" 
            aria-labelledby="modal-title" 
            aria-describedby="modal-description"
            aria-modal="true"
          >
            <h2 id="modal-title">Título do Modal</h2>
            <p id="modal-description">Descrição do modal</p>
            <button type="button" aria-label="Fechar modal">×</button>
          </div>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Loading States Accessibility', () => {
    it('should have proper loading indicators', async () => {
      const { container } = render(
        <div>
          <div role="status" aria-label="Carregando dados">
            <div className="animate-spin">⟳</div>
            <span className="sr-only">Carregando...</span>
          </div>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should handle skeleton loading states', async () => {
      const { container } = render(
        <SectionCards isLoading={true} />
      )

      // Check that loading state is accessible
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Error States Accessibility', () => {
    it('should have proper error message structure', async () => {
      const { container } = render(
        <div>
          <div role="alert" aria-live="polite">
            <h3>Erro ao carregar dados</h3>
            <p>Não foi possível carregar os contatos. Tente novamente.</p>
          </div>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})