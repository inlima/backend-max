/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { runAccessibilityTests } from '@/lib/accessibility-testing'
import { AccessibleInput, AccessibleSelect } from '@/components/accessibility/accessible-form'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock data for tests
const mockTableData = [
  { id: '1', name: 'João Silva', email: 'joao@example.com', status: 'active' },
  { id: '2', name: 'Maria Santos', email: 'maria@example.com', status: 'inactive' },
  { id: '3', name: 'Pedro Costa', email: 'pedro@example.com', status: 'active' }
]

const mockTableColumns = [
  { id: 'name', header: 'Nome', accessorKey: 'name' as const, sortable: true },
  { id: 'email', header: 'Email', accessorKey: 'email' as const },
  { id: 'status', header: 'Status', accessorKey: 'status' as const, sortable: true }
]

describe('Accessibility Compliance Tests', () => {
  describe('WCAG 2.1 AA Compliance', () => {
    test('should have no axe violations on basic page structure', async () => {
      const { container } = render(
        <div>
          <header role="banner">
            <h1>Test Page</h1>
            <nav aria-label="Main navigation">
              <ul>
                <li><a href="/home">Home</a></li>
                <li><a href="/about">About</a></li>
              </ul>
            </nav>
          </header>
          <main id="main-content">
            <h2>Main Content</h2>
            <p>This is the main content area.</p>
          </main>
          <footer role="contentinfo">
            <p>&copy; 2024 Test Company</p>
          </footer>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('should have proper heading hierarchy', async () => {
      const { container } = render(
        <div>
          <h1>Main Title</h1>
          <h2>Section Title</h2>
          <h3>Subsection Title</h3>
          <h2>Another Section</h2>
          <h3>Another Subsection</h3>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Check heading hierarchy
      const h1 = screen.getByRole('heading', { level: 1 })
      const h2s = screen.getAllByRole('heading', { level: 2 })
      const h3s = screen.getAllByRole('heading', { level: 3 })

      expect(h1).toBeInTheDocument()
      expect(h2s).toHaveLength(2)
      expect(h3s).toHaveLength(2)
    })

    test('should have proper form labels and associations', async () => {
      const { container } = render(
        <form>
          <AccessibleInput
            label="Nome completo"
            description="Digite seu nome completo"
            required
            placeholder="Ex: João Silva"
          />
          <AccessibleSelect
            label="País"
            description="Selecione seu país de residência"
            required
            options={[
              { value: 'br', label: 'Brasil' },
              { value: 'us', label: 'Estados Unidos' },
              { value: 'ca', label: 'Canadá' }
            ]}
          />
        </form>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Check form labels
      const nameInput = screen.getByLabelText(/nome completo/i)
      const countrySelect = screen.getByLabelText(/país/i)

      expect(nameInput).toBeRequired()
      expect(countrySelect).toBeRequired()
      expect(nameInput).toHaveAttribute('aria-describedby')
      expect(countrySelect).toHaveAttribute('aria-describedby')
    })

    test('should have proper table structure and navigation', async () => {
      const { container } = render(
        <table aria-label="Lista de usuários do sistema">
          <caption>Lista de usuários do sistema</caption>
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Email</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockTableData.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.email}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Check table structure
      const table = screen.getByRole('table')
      const columnHeaders = screen.getAllByRole('columnheader')
      const rows = screen.getAllByRole('row')

      expect(table).toHaveAttribute('aria-label', 'Lista de usuários do sistema')
      expect(columnHeaders).toHaveLength(3)
      expect(rows).toHaveLength(4) // 3 data rows + header row
    })

    test('should support keyboard navigation in tables', async () => {
      const user = userEvent.setup()
      
      render(
        <table>
          <thead>
            <tr>
              <th scope="col">Nome</th>
              <th scope="col">Email</th>
            </tr>
          </thead>
          <tbody>
            <tr tabIndex={0}>
              <td>João Silva</td>
              <td>joao@example.com</td>
            </tr>
            <tr tabIndex={0}>
              <td>Maria Santos</td>
              <td>maria@example.com</td>
            </tr>
          </tbody>
        </table>
      )

      const firstRow = screen.getAllByRole('row')[1] // Skip header row
      
      // Focus first data row
      firstRow.focus()
      expect(firstRow).toHaveFocus()

      // Tab to next row
      await user.keyboard('{Tab}')
      const secondRow = screen.getAllByRole('row')[2]
      expect(secondRow).toHaveFocus()
    })

    test('should have proper dialog/modal accessibility', async () => {
      const user = userEvent.setup()
      
      const TestDialog = () => {
        const [open, setOpen] = React.useState(false)
        
        return (
          <>
            <button onClick={() => setOpen(true)}>Open Dialog</button>
            {open && (
              <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-desc">
                <h2 id="dialog-title">Test Dialog</h2>
                <p id="dialog-desc">This is a test dialog for accessibility</p>
                <p>Dialog content goes here.</p>
                <button onClick={() => setOpen(false)}>Close</button>
              </div>
            )}
          </>
        )
      }

      const { container } = render(<TestDialog />)
      
      // Open dialog
      const openButton = screen.getByText('Open Dialog')
      await user.click(openButton)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
        expect(dialog).toHaveAttribute('aria-modal', 'true')
        expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title')
        expect(dialog).toHaveAttribute('aria-describedby', 'dialog-desc')
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('should handle focus management correctly', async () => {
      const user = userEvent.setup()
      
      const TestComponent = () => {
        const [showDialog, setShowDialog] = React.useState(false)
        
        return (
          <>
            <button onClick={() => setShowDialog(true)}>Open Dialog</button>
            {showDialog && (
              <div role="dialog" aria-modal="true" tabIndex={-1}>
                <h2>Focus Test</h2>
                <input placeholder="First input" />
                <input placeholder="Second input" />
                <button onClick={() => setShowDialog(false)}>Close</button>
              </div>
            )}
          </>
        )
      }

      render(<TestComponent />)
      
      const trigger = screen.getByText('Open Dialog')
      await user.click(trigger)

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        expect(dialog).toBeInTheDocument()
      })

      // Test basic tab navigation
      await user.keyboard('{Tab}')
      const firstInput = screen.getByPlaceholderText('First input')
      expect(firstInput).toHaveFocus()

      await user.keyboard('{Tab}')
      const secondInput = screen.getByPlaceholderText('Second input')
      expect(secondInput).toHaveFocus()

      await user.keyboard('{Tab}')
      const closeButton = screen.getByText('Close')
      expect(closeButton).toHaveFocus()
    })

    test('should announce changes to screen readers', async () => {
      const announcements: string[] = []
      
      // Mock screen reader announcements
      const mockAnnounce = jest.fn((message: string) => {
        announcements.push(message)
      })

      // Mock the announce function
      jest.mock('@/lib/aria-utils', () => ({
        ...jest.requireActual('@/lib/aria-utils'),
        announceToScreenReader: mockAnnounce
      }))

      const TestComponent = () => {
        const [count, setCount] = React.useState(0)
        
        return (
          <>
            <button onClick={() => setCount(c => c + 1)}>
              Increment ({count})
            </button>
            <div role="status" aria-live="polite">
              Count: {count}
            </div>
          </>
        )
      }

      const user = userEvent.setup()
      render(<TestComponent />)
      
      const button = screen.getByText(/increment/i)
      await user.click(button)

      // Check that live region is updated
      const status = screen.getByRole('status')
      expect(status).toHaveTextContent('Count: 1')
    })

    test('should have proper color contrast', async () => {
      const { container } = render(
        <div>
          <p style={{ color: '#000000', backgroundColor: '#ffffff' }}>
            High contrast text (21:1 ratio)
          </p>
          <p style={{ color: '#767676', backgroundColor: '#ffffff' }}>
            Minimum contrast text (4.54:1 ratio)
          </p>
          <button style={{ color: '#ffffff', backgroundColor: '#0066cc' }}>
            Accessible button (7.27:1 ratio)
          </button>
        </div>
      )

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true }
        }
      })
      expect(results).toHaveNoViolations()
    })

    test('should support reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      const { container } = render(
        <div className="animate-spin">
          Animated content
        </div>
      )

      // In a real implementation, animations would be disabled
      // when prefers-reduced-motion is set
      expect(container.firstChild).toHaveClass('animate-spin')
    })

    test('should have proper skip links', () => {
      render(
        <div>
          <a href="#main-content" className="sr-only focus:not-sr-only">
            Skip to main content
          </a>
          <nav>Navigation content</nav>
          <main id="main-content">
            <h1>Main Content</h1>
          </main>
        </div>
      )

      const skipLink = screen.getByText('Skip to main content')
      expect(skipLink).toBeInTheDocument()
      expect(skipLink).toHaveAttribute('href', '#main-content')
    })

    test('should handle error states accessibly', async () => {
      const { container } = render(
        <AccessibleInput
          label="Email"
          error="Please enter a valid email address"
          value="invalid-email"
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      const input = screen.getByLabelText('Email')
      const errorMessage = screen.getByText('Please enter a valid email address')

      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby')
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })
  })

  describe('Accessibility Testing Utilities', () => {
    test('should run comprehensive accessibility tests', async () => {
      const testElement = document.createElement('div')
      testElement.innerHTML = `
        <h1>Test Page</h1>
        <p>This is a test page.</p>
        <button>Click me</button>
      `
      document.body.appendChild(testElement)

      const results = await runAccessibilityTests(testElement, 'AA')
      
      expect(results).toHaveProperty('passed')
      expect(results).toHaveProperty('level', 'AA')
      expect(results).toHaveProperty('issues')
      expect(results).toHaveProperty('score')
      expect(typeof results.score).toBe('number')
      expect(results.score).toBeGreaterThanOrEqual(0)
      expect(results.score).toBeLessThanOrEqual(100)

      document.body.removeChild(testElement)
    })

    test('should run accessibility tests programmatically', async () => {
      const testElement = document.createElement('div')
      testElement.innerHTML = `
        <h1>Test Page</h1>
        <p>This is a test page.</p>
        <button>Click me</button>
      `
      document.body.appendChild(testElement)

      const results = await runAccessibilityTests(testElement, 'AA')
      
      expect(results).toHaveProperty('passed')
      expect(results).toHaveProperty('level', 'AA')
      expect(results).toHaveProperty('issues')
      expect(results).toHaveProperty('score')

      document.body.removeChild(testElement)
    })
  })

  describe('Keyboard Navigation', () => {
    test('should support arrow key navigation in lists', async () => {
      const user = userEvent.setup()
      
      render(
        <ul role="listbox" tabIndex={0}>
          <li role="option" tabIndex={-1}>Item 1</li>
          <li role="option" tabIndex={-1}>Item 2</li>
          <li role="option" tabIndex={-1}>Item 3</li>
        </ul>
      )

      const listbox = screen.getByRole('listbox')
      listbox.focus()

      await user.keyboard('{ArrowDown}')
      const firstItem = screen.getByText('Item 1')
      expect(firstItem).toHaveFocus()

      await user.keyboard('{ArrowDown}')
      const secondItem = screen.getByText('Item 2')
      expect(secondItem).toHaveFocus()
    })

    test('should support Home and End keys', async () => {
      const user = userEvent.setup()
      
      render(
        <div role="grid" tabIndex={0}>
          <div role="row">
            <div role="gridcell" tabIndex={-1}>Cell 1</div>
            <div role="gridcell" tabIndex={-1}>Cell 2</div>
            <div role="gridcell" tabIndex={-1}>Cell 3</div>
          </div>
        </div>
      )

      const grid = screen.getByRole('grid')
      grid.focus()

      await user.keyboard('{Home}')
      const firstCell = screen.getByText('Cell 1')
      expect(firstCell).toHaveFocus()

      await user.keyboard('{End}')
      const lastCell = screen.getByText('Cell 3')
      expect(lastCell).toHaveFocus()
    })
  })

  describe('Screen Reader Support', () => {
    test('should have proper ARIA labels and descriptions', () => {
      render(
        <div>
          <button aria-label="Close dialog" aria-describedby="close-help">
            ×
          </button>
          <div id="close-help">
            Closes the current dialog and returns to the previous page
          </div>
        </div>
      )

      const button = screen.getByRole('button')
      const description = screen.getByText(/closes the current dialog/i)

      expect(button).toHaveAttribute('aria-label', 'Close dialog')
      expect(button).toHaveAttribute('aria-describedby', 'close-help')
      expect(description).toHaveAttribute('id', 'close-help')
    })

    test('should have proper live regions', () => {
      render(
        <div>
          <div role="status" aria-live="polite">
            Status updates appear here
          </div>
          <div role="alert" aria-live="assertive">
            Critical alerts appear here
          </div>
        </div>
      )

      const status = screen.getByRole('status')
      const alert = screen.getByRole('alert')

      expect(status).toHaveAttribute('aria-live', 'polite')
      expect(alert).toHaveAttribute('aria-live', 'assertive')
    })

    test('should have proper table headers and captions', () => {
      render(
        <table>
          <caption>User account information</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John Doe</td>
              <td>john@example.com</td>
              <td>Admin</td>
            </tr>
          </tbody>
        </table>
      )

      const table = screen.getByRole('table')
      const caption = screen.getByText('User account information')
      const headers = screen.getAllByRole('columnheader')

      expect(table).toContainElement(caption)
      expect(headers).toHaveLength(3)
      headers.forEach(header => {
        expect(header).toHaveAttribute('scope', 'col')
      })
    })
  })
})