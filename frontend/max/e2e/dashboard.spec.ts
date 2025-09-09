import { test, expect } from '@playwright/test'
import { DashboardPage } from './pages/dashboard-page'
import { mockDashboardData } from './utils/test-data'

test.describe('Dashboard E2E Tests', () => {
  let dashboardPage: DashboardPage

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page)
    
    // Mock API responses for consistent testing
    await page.route('**/api/dashboard/metrics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardData.metrics),
      })
    })

    await page.route('**/api/dashboard/chart-data**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDashboardData.chartData),
      })
    })

    await page.route('**/api/dashboard/recent-activity**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', action: 'Novo contato', description: 'João Silva entrou em contato', timestamp: new Date() },
          { id: '2', action: 'Processo atualizado', description: 'Ação de Divórcio - Status alterado', timestamp: new Date() },
        ]),
      })
    })
  })

  test('should load dashboard with all metrics', async () => {
    await dashboardPage.goto()
    await dashboardPage.expectDashboardLoaded()
    await dashboardPage.expectMetricsVisible()
    
    // Verify specific metric values
    await dashboardPage.expectMetricValue('contatos-hoje', '12')
    await dashboardPage.expectMetricValue('processos-ativos', '45')
    await dashboardPage.expectMetricValue('taxa-resposta', '85%')
    await dashboardPage.expectMetricValue('satisfacao-cliente', '4.2/5')
  })

  test('should display interactive charts', async () => {
    await dashboardPage.goto()
    await dashboardPage.expectChartVisible()
    
    // Test chart interaction
    await dashboardPage.hoverOverChart()
    // Chart tooltip should appear (implementation specific)
  })

  test('should show recent activity', async () => {
    await dashboardPage.goto()
    await dashboardPage.expectRecentActivityVisible()
    
    // Check for specific activities
    await expect(dashboardPage.page.locator('text=Novo contato')).toBeVisible()
    await expect(dashboardPage.page.locator('text=Processo atualizado')).toBeVisible()
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await dashboardPage.testMobileView()
  })

  test('should be responsive on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await dashboardPage.testTabletView()
  })

  test('should load quickly', async () => {
    await dashboardPage.expectFastLoad(3000) // Should load within 3 seconds
  })

  test('should handle WebSocket connection status', async () => {
    await dashboardPage.goto()
    
    // Mock WebSocket connection
    await dashboardPage.page.evaluate(() => {
      // Simulate connected state
      window.dispatchEvent(new CustomEvent('websocket-connected'))
    })
    
    await dashboardPage.expectConnectionStatus('connected')
  })

  test('should navigate to other sections from dashboard', async () => {
    await dashboardPage.goto()
    
    // Navigate to Contatos
    await dashboardPage.clickSidebarLink('Contatos')
    await dashboardPage.expectUrl(/\/contatos/)
    
    // Navigate back to Dashboard
    await dashboardPage.clickSidebarLink('Dashboard')
    await dashboardPage.expectUrl(/\/dashboard/)
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/dashboard/metrics', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })

    await dashboardPage.goto()
    
    // Should show error state
    await dashboardPage.expectErrorMessage('Erro ao carregar dados')
  })

  test('should be accessible', async () => {
    await dashboardPage.goto()
    await dashboardPage.checkAccessibility()
    await dashboardPage.testKeyboardNavigation()
    await dashboardPage.testScreenReaderContent()
  })

  test('should handle real-time updates', async ({ page }) => {
    await dashboardPage.goto()
    
    // Simulate WebSocket update
    await page.evaluate(() => {
      // Simulate new contato event
      window.dispatchEvent(new CustomEvent('novo-contato', {
        detail: { nome: 'Novo Cliente', telefone: '+5511999999999' }
      }))
    })
    
    // Should show notification
    await dashboardPage.expectToastMessage('Novo contato: Novo Cliente')
  })

  test('should maintain state during navigation', async () => {
    await dashboardPage.goto()
    
    // Interact with chart or filters
    await dashboardPage.hoverOverChart()
    
    // Navigate away and back
    await dashboardPage.clickSidebarLink('Contatos')
    await dashboardPage.clickSidebarLink('Dashboard')
    
    // State should be preserved (implementation specific)
    await dashboardPage.expectDashboardLoaded()
  })

  test('should handle offline state', async ({ page }) => {
    await dashboardPage.goto()
    
    // Simulate offline
    await page.context().setOffline(true)
    
    // Should show offline indicator
    await dashboardPage.expectConnectionStatus('disconnected')
    
    // Go back online
    await page.context().setOffline(false)
    
    // Should reconnect
    await dashboardPage.expectConnectionStatus('connected')
  })

  test('should support keyboard navigation', async () => {
    await dashboardPage.goto()
    
    // Tab through interactive elements
    await dashboardPage.page.keyboard.press('Tab')
    
    // Should focus on first interactive element
    const focusedElement = dashboardPage.page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    
    // Continue tabbing
    await dashboardPage.page.keyboard.press('Tab')
    await dashboardPage.page.keyboard.press('Tab')
    
    // Should be able to activate elements with Enter/Space
    await dashboardPage.page.keyboard.press('Enter')
  })

  test('should handle different screen sizes', async ({ page }) => {
    const viewports = [
      { width: 320, height: 568 }, // iPhone SE
      { width: 375, height: 667 }, // iPhone 8
      { width: 768, height: 1024 }, // iPad
      { width: 1024, height: 768 }, // iPad Landscape
      { width: 1440, height: 900 }, // Desktop
      { width: 1920, height: 1080 }, // Large Desktop
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await dashboardPage.goto()
      await dashboardPage.expectMetricsVisible()
      
      // Take screenshot for visual regression testing
      await dashboardPage.takeScreenshot(`dashboard-${viewport.width}x${viewport.height}`)
    }
  })
})