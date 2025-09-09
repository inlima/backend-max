import { Page, Locator, expect } from '@playwright/test'

export class BasePage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  // Common navigation elements
  get sidebar() {
    return this.page.locator('[data-testid="app-sidebar"]')
  }

  get header() {
    return this.page.locator('[data-testid="site-header"]')
  }

  get loadingIndicator() {
    return this.page.locator('[data-testid="loading"]')
  }

  get connectionStatus() {
    return this.page.locator('[data-testid="connection-status"]')
  }

  // Navigation methods
  async navigateTo(path: string) {
    await this.page.goto(path)
    await this.waitForPageLoad()
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle')
    // Wait for any loading indicators to disappear
    await this.page.waitForSelector('[data-testid="loading"]', { state: 'hidden', timeout: 5000 }).catch(() => {})
  }

  async clickSidebarLink(linkText: string) {
    await this.sidebar.getByRole('link', { name: linkText }).click()
    await this.waitForPageLoad()
  }

  // Common assertions
  async expectPageTitle(title: string) {
    await expect(this.page).toHaveTitle(new RegExp(title, 'i'))
  }

  async expectUrl(urlPattern: string | RegExp) {
    await expect(this.page).toHaveURL(urlPattern)
  }

  async expectElementVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible()
  }

  async expectElementHidden(selector: string) {
    await expect(this.page.locator(selector)).toBeHidden()
  }

  // Toast notifications
  async expectToastMessage(message: string) {
    const toast = this.page.locator('[data-testid="toast"]', { hasText: message })
    await expect(toast).toBeVisible()
  }

  async dismissToast() {
    const dismissButton = this.page.locator('[data-testid="toast-dismiss"]')
    if (await dismissButton.isVisible()) {
      await dismissButton.click()
    }
  }

  // Error handling
  async expectErrorMessage(message: string) {
    const errorElement = this.page.locator('[role="alert"]', { hasText: message })
    await expect(errorElement).toBeVisible()
  }

  // Form helpers
  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      const input = this.page.locator(`[name="${field}"], [data-testid="${field}"]`)
      await input.fill(value)
    }
  }

  async submitForm() {
    await this.page.locator('button[type="submit"]').click()
  }

  // Table helpers
  async expectTableRowCount(count: number) {
    const rows = this.page.locator('tbody tr')
    await expect(rows).toHaveCount(count)
  }

  async clickTableRow(rowIndex: number) {
    await this.page.locator(`tbody tr:nth-child(${rowIndex + 1})`).click()
  }

  async searchInTable(searchTerm: string) {
    const searchInput = this.page.locator('[data-testid="table-search"], [placeholder*="Buscar"]')
    await searchInput.fill(searchTerm)
    await this.page.waitForTimeout(500) // Wait for debounced search
  }

  // Modal helpers
  async expectModalOpen(modalTitle?: string) {
    const modal = this.page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()
    
    if (modalTitle) {
      await expect(modal.locator('h1, h2, h3', { hasText: modalTitle })).toBeVisible()
    }
  }

  async closeModal() {
    // Try different ways to close modal
    const closeButton = this.page.locator('[data-testid="modal-close"], [aria-label*="fechar"], [aria-label*="close"]')
    if (await closeButton.isVisible()) {
      await closeButton.click()
    } else {
      // Try pressing Escape
      await this.page.keyboard.press('Escape')
    }
  }

  // Accessibility helpers
  async checkAccessibility() {
    // This would integrate with axe-core for accessibility testing
    // For now, we'll do basic checks
    
    // Check for proper heading structure
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all()
    expect(headings.length).toBeGreaterThan(0)
    
    // Check for alt text on images
    const images = await this.page.locator('img').all()
    for (const img of images) {
      const alt = await img.getAttribute('alt')
      expect(alt).toBeTruthy()
    }
    
    // Check for form labels
    const inputs = await this.page.locator('input[type="text"], input[type="email"], input[type="tel"], textarea').all()
    for (const input of inputs) {
      const id = await input.getAttribute('id')
      if (id) {
        const label = this.page.locator(`label[for="${id}"]`)
        await expect(label).toBeVisible()
      }
    }
  }

  // Performance helpers
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now()
    await this.waitForPageLoad()
    return Date.now() - startTime
  }

  // Screenshot helpers
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    })
  }

  // Wait helpers
  async waitForElement(selector: string, timeout = 10000) {
    await this.page.waitForSelector(selector, { timeout })
  }

  async waitForText(text: string, timeout = 10000) {
    await this.page.waitForSelector(`text=${text}`, { timeout })
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle')
  }
}