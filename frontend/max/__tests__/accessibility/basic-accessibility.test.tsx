/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { runAccessibilityTests } from '@/lib/accessibility-testing'
import { getContrastRatio, meetsWCAGContrast } from '@/lib/aria-utils'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

describe('Basic Accessibility Compliance', () => {
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
          <div>
            <label htmlFor="name">Nome completo *</label>
            <input 
              id="name" 
              type="text" 
              required 
              aria-describedby="name-help"
              placeholder="Ex: João Silva" 
            />
            <div id="name-help">Digite seu nome completo</div>
          </div>
          <div>
            <label htmlFor="country">País *</label>
            <select id="country" required aria-describedby="country-help">
              <option value="">Selecione uma opção</option>
              <option value="br">Brasil</option>
              <option value="us">Estados Unidos</option>
              <option value="ca">Canadá</option>
            </select>
            <div id="country-help">Selecione seu país de residência</div>
          </div>
        </form>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Check form labels
      const nameInput = screen.getByLabelText(/nome completo/i)
      const countrySelect = screen.getByLabelText(/país/i)

      expect(nameInput).toBeRequired()
      expect(countrySelect).toBeRequired()
      expect(nameInput).toHaveAttribute('aria-describedby', 'name-help')
      expect(countrySelect).toHaveAttribute('aria-describedby', 'country-help')
    })

    test('should have proper table structure', async () => {
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
            <tr>
              <td>João Silva</td>
              <td>joao@example.com</td>
              <td>Ativo</td>
            </tr>
            <tr>
              <td>Maria Santos</td>
              <td>maria@example.com</td>
              <td>Inativo</td>
            </tr>
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
      expect(rows).toHaveLength(3) // 2 data rows + header row
    })

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <button>Button 1</button>
          <button>Button 2</button>
          <a href="#test">Link 1</a>
          <input type="text" placeholder="Input field" />
        </div>
      )

      const button1 = screen.getByText('Button 1')
      const button2 = screen.getByText('Button 2')
      const link1 = screen.getByText('Link 1')
      const input = screen.getByPlaceholderText('Input field')

      // Test tab navigation
      await user.tab()
      expect(button1).toHaveFocus()

      await user.tab()
      expect(button2).toHaveFocus()

      await user.tab()
      expect(link1).toHaveFocus()

      await user.tab()
      expect(input).toHaveFocus()
    })

    test('should have proper dialog accessibility', async () => {
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

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title')
      expect(dialog).toHaveAttribute('aria-describedby', 'dialog-desc')

      const results = await axe(container)
      expect(results).toHaveNoViolations()
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
        <div>
          <label htmlFor="email">Email</label>
          <input 
            id="email"
            type="email"
            value="invalid-email"
            aria-invalid="true"
            aria-describedby="email-error"
          />
          <div id="email-error" role="alert">
            Please enter a valid email address
          </div>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      const input = screen.getByLabelText('Email')
      const errorMessage = screen.getByText('Please enter a valid email address')

      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby', 'email-error')
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })

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
  })

  describe('Color Contrast Tests', () => {
    test('should calculate color contrast ratios correctly', () => {
      // Test high contrast (black on white)
      const highContrast = getContrastRatio('#000000', '#ffffff')
      expect(highContrast).toBeCloseTo(21, 0)

      // Test minimum contrast
      const minContrast = getContrastRatio('#767676', '#ffffff')
      expect(minContrast).toBeGreaterThan(4.5)

      // Test insufficient contrast
      const lowContrast = getContrastRatio('#cccccc', '#ffffff')
      expect(lowContrast).toBeLessThan(3)
    })

    test('should validate WCAG contrast compliance', () => {
      // AA compliance tests
      expect(meetsWCAGContrast('#000000', '#ffffff', 'AA', 'normal')).toBe(true)
      expect(meetsWCAGContrast('#767676', '#ffffff', 'AA', 'normal')).toBe(true)
      expect(meetsWCAGContrast('#cccccc', '#ffffff', 'AA', 'normal')).toBe(false)

      // Large text has lower requirements (3:1 ratio)
      expect(meetsWCAGContrast('#949494', '#ffffff', 'AA', 'large')).toBe(true)
      expect(meetsWCAGContrast('#cccccc', '#ffffff', 'AA', 'large')).toBe(false)

      // AAA compliance is stricter
      expect(meetsWCAGContrast('#767676', '#ffffff', 'AAA', 'normal')).toBe(false)
      expect(meetsWCAGContrast('#595959', '#ffffff', 'AAA', 'normal')).toBe(true)
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

    test('should detect accessibility issues', async () => {
      const testElement = document.createElement('div')
      testElement.innerHTML = `
        <img src="test.jpg" />
        <button></button>
        <input type="text" />
      `
      document.body.appendChild(testElement)

      const results = await runAccessibilityTests(testElement, 'AA')
      
      // Should find issues with missing alt text, empty button, and unlabeled input
      expect(results.issues.length).toBeGreaterThan(0)
      expect(results.passed).toBe(false)
      expect(results.score).toBeLessThan(100)

      document.body.removeChild(testElement)
    })
  })
})