import { Page, expect } from '@playwright/test'
import { BasePage } from './base-page'

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Page elements
  get metricsCards() {
    return this.page.locator('[data-testid="metrics-cards"]')
  }

  get contatosHojeCard() {
    return this.page.locator('[data-testid="contatos-hoje-card"]')
  }

  get processosAtivosCard() {
    return this.page.locator('[data-testid="processos-ativos-card"]')
  }

  get taxaRespostaCard() {
    return this.page.locator('[data-testid="taxa-resposta-card"]')
  }

  get satisfacaoClienteCard() {
    return this.page.locator('[data-testid="satisfacao-cliente-card"]')
  }

  get interactiveChart() {
    return this.page.locator('[data-testid="interactive-chart"]')
  }

  get recentActivityTable() {
    return this.page.locator('[data-testid="recent-activity-table"]')
  }

  // Navigation
  async goto() {
    await this.navigateTo('/dashboard')
  }

  // Assertions
  async expectDashboardLoaded() {
    await this.expectUrl(/\/dashboard/)
    await this.expectElementVisible('[data-testid="metrics-cards"]')
    await this.expectPageTitle('Dashboard')
  }

  async expectMetricsVisible() {
    await expect(this.contatosHojeCard).toBeVisible()
    await expect(this.processosAtivosCard).toBeVisible()
    await expect(this.taxaRespostaCard).toBeVisible()
    await expect(this.satisfacaoClienteCard).toBeVisible()
  }

  async expectMetricValue(cardName: string, expectedValue: string | number) {
    const card = this.page.locator(`[data-testid="${cardName}-card"]`)
    await expect(card).toContainText(expectedValue.toString())
  }

  async expectChartVisible() {
    await expect(this.interactiveChart).toBeVisible()
    
    // Check for chart elements (this depends on the chart library used)
    const chartElements = this.page.locator('.recharts-wrapper, canvas, svg')
    await expect(chartElements.first()).toBeVisible()
  }

  async expectRecentActivityVisible() {
    await expect(this.recentActivityTable).toBeVisible()
    
    // Check for at least one activity row
    const activityRows = this.recentActivityTable.locator('tbody tr')
    await expect(activityRows.first()).toBeVisible()
  }

  // Interactions
  async clickMetricCard(cardName: string) {
    const card = this.page.locator(`[data-testid="${cardName}-card"]`)
    await card.click()
  }

  async hoverOverChart() {
    await this.interactiveChart.hover()
  }

  async clickChartDataPoint(index: number) {
    const dataPoints = this.interactiveChart.locator('.recharts-dot, .recharts-bar')
    await dataPoints.nth(index).click()
  }

  async clickRecentActivityItem(index: number) {
    const activityRows = this.recentActivityTable.locator('tbody tr')
    await activityRows.nth(index).click()
  }

  // Real-time updates testing
  async expectRealTimeUpdate(metricName: string, initialValue: string, newValue: string) {
    const card = this.page.locator(`[data-testid="${metricName}-card"]`)
    
    // Verify initial value
    await expect(card).toContainText(initialValue)
    
    // Simulate WebSocket event (this would need to be triggered by the test setup)
    // For now, we'll wait for the value to change
    await expect(card).toContainText(newValue, { timeout: 10000 })
  }

  async expectConnectionStatus(status: 'connected' | 'disconnected' | 'error') {
    if (await this.connectionStatus.isVisible()) {
      await expect(this.connectionStatus).toContainText(status)
    }
  }

  // Performance testing
  async measureDashboardLoadTime(): Promise<number> {
    const startTime = Date.now()
    await this.goto()
    await this.expectDashboardLoaded()
    await this.expectMetricsVisible()
    return Date.now() - startTime
  }

  async expectFastLoad(maxLoadTime: number = 3000) {
    const loadTime = await this.measureDashboardLoadTime()
    expect(loadTime).toBeLessThan(maxLoadTime)
  }

  // Responsive design testing
  async testMobileView() {
    await this.page.setViewportSize({ width: 375, height: 667 })
    await this.expectMetricsVisible()
    
    // Check that cards stack vertically on mobile
    const cards = await this.metricsCards.locator('.card').all()
    if (cards.length > 1) {
      const firstCardBox = await cards[0].boundingBox()
      const secondCardBox = await cards[1].boundingBox()
      
      // Second card should be below the first (higher Y position)
      expect(secondCardBox!.y).toBeGreaterThan(firstCardBox!.y)
    }
  }

  async testTabletView() {
    await this.page.setViewportSize({ width: 768, height: 1024 })
    await this.expectMetricsVisible()
  }

  async testDesktopView() {
    await this.page.setViewportSize({ width: 1920, height: 1080 })
    await this.expectMetricsVisible()
  }

  // Accessibility testing
  async testKeyboardNavigation() {
    await this.goto()
    
    // Tab through interactive elements
    await this.page.keyboard.press('Tab')
    
    // Check that focus is visible
    const focusedElement = await this.page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  }

  async testScreenReaderContent() {
    // Check for proper ARIA labels and descriptions
    const cards = await this.metricsCards.locator('.card').all()
    
    for (const card of cards) {
      // Each card should have accessible content
      const title = card.locator('h1, h2, h3, [role="heading"]')
      await expect(title).toBeVisible()
    }
  }

  // Additional methods for comprehensive testing
  async getMetricValue(metricName: string): Promise<string> {
    const card = this.page.locator(`[data-testid="${metricName}-card"]`)
    const valueElement = card.locator('[data-testid="metric-value"]')
    return await valueElement.textContent() || '0'
  }

  async expectMetricIncrease(metricName: string) {
    const card = this.page.locator(`[data-testid="${metricName}-card"]`)
    const increaseIndicator = card.locator('[data-testid="increase-indicator"]')
    await expect(increaseIndicator).toBeVisible()
  }

  async expectRecentActivityContains(activityText: string) {
    const activityItem = this.recentActivityTable.locator('tr', { hasText: activityText })
    await expect(activityItem).toBeVisible()
  }

  async expectNewContatoNotification(nomeContato: string) {
    await this.expectToastMessage(`Novo contato: ${nomeContato}`)
  }

  async expectOfflineMessage() {
    const offlineMessage = this.page.locator('[data-testid="offline-message"]')
    await expect(offlineMessage).toBeVisible()
  }
}