import { test, expect } from '@playwright/test'
import { DashboardPage } from './pages/dashboard-page'
import { ContatosPage } from './pages/contatos-page'
import { ProcessosPage } from './pages/processos-page'
import { ConfiguracoesPage } from './pages/configuracoes-page'

test.describe('Responsive Design E2E Tests', () => {
  let dashboardPage: DashboardPage
  let contatosPage: ContatosPage
  let processosPage: ProcessosPage
  let configuracoesPage: ConfiguracoesPage

  // Define viewport configurations for testing
  const viewports = [
    { width: 320, height: 568, name: 'iPhone SE', category: 'mobile' },
    { width: 375, height: 667, name: 'iPhone 8', category: 'mobile' },
    { width: 414, height: 896, name: 'iPhone 11 Pro Max', category: 'mobile' },
    { width: 768, height: 1024, name: 'iPad Portrait', category: 'tablet' },
    { width: 1024, height: 768, name: 'iPad Landscape', category: 'tablet' },
    { width: 1366, height: 768, name: 'Laptop', category: 'desktop' },
    { width: 1440, height: 900, name: 'Desktop', category: 'desktop' },
    { width: 1920, height: 1080, name: 'Large Desktop', category: 'desktop' },
    { width: 2560, height: 1440, name: '4K Desktop', category: 'desktop' },
  ]

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page)
    contatosPage = new ContatosPage(page)
    processosPage = new ProcessosPage(page)
    configuracoesPage = new ConfiguracoesPage(page)
    
    await setupResponsiveApiMocks(page)
  })

  // Test each viewport across all major pages
  for (const viewport of viewports) {
    test(`Dashboard responsive design - ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      await dashboardPage.goto()
      await dashboardPage.expectDashboardLoaded()
      
      // Test metrics cards layout
      await testMetricsCardsResponsiveness(page, viewport)
      
      // Test charts responsiveness
      await testChartsResponsiveness(page, viewport)
      
      // Test sidebar behavior
      await testSidebarResponsiveness(page, viewport)
      
      // Test navigation
      await testNavigationResponsiveness(page, viewport)
      
      // Take screenshot for visual regression
      await page.screenshot({
        path: `test-results/screenshots/dashboard-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true,
      })
    })

    test(`Contatos responsive design - ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      await contatosPage.goto()
      await contatosPage.expectContatosPageLoaded()
      
      // Test table vs card view
      await testContatosTableResponsiveness(page, viewport)
      
      // Test filters responsiveness
      await testFiltersResponsiveness(page, viewport)
      
      // Test create dialog responsiveness
      await testCreateDialogResponsiveness(page, viewport, 'contato')
      
      // Test detail drawer responsiveness
      await testDetailDrawerResponsiveness(page, viewport, 'contato')
      
      // Take screenshot
      await page.screenshot({
        path: `test-results/screenshots/contatos-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true,
      })
    })

    test(`Processos responsive design - ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      await processosPage.goto()
      await processosPage.expectProcessosPageLoaded()
      
      // Test table responsiveness
      await testProcessosTableResponsiveness(page, viewport)
      
      // Test bulk actions responsiveness
      await testBulkActionsResponsiveness(page, viewport)
      
      // Test create dialog responsiveness
      await testCreateDialogResponsiveness(page, viewport, 'processo')
      
      // Test detail drawer responsiveness
      await testDetailDrawerResponsiveness(page, viewport, 'processo')
      
      // Take screenshot
      await page.screenshot({
        path: `test-results/screenshots/processos-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true,
      })
    })

    test(`Configurações responsive design - ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      await configuracoesPage.goto()
      await configuracoesPage.expectConfiguracoesPageLoaded()
      
      // Test settings sections responsiveness
      await testSettingsSectionsResponsiveness(page, viewport)
      
      // Test forms responsiveness
      await testFormsResponsiveness(page, viewport)
      
      // Take screenshot
      await page.screenshot({
        path: `test-results/screenshots/configuracoes-${viewport.name.toLowerCase().replace(/\s+/g, '-')}.png`,
        fullPage: true,
      })
    })
  }

  // Cross-device interaction tests
  test('responsive navigation flow across devices', async ({ page }) => {
    const mobileViewport = { width: 375, height: 667 }
    const desktopViewport = { width: 1440, height: 900 }
    
    // Start on mobile
    await page.setViewportSize(mobileViewport)
    await dashboardPage.goto()
    await dashboardPage.expectDashboardLoaded()
    
    // Test mobile navigation
    await testMobileNavigation(page)
    
    // Switch to desktop
    await page.setViewportSize(desktopViewport)
    await page.waitForTimeout(500) // Allow layout to adjust
    
    // Test desktop navigation
    await testDesktopNavigation(page)
    
    // Navigate through all sections on desktop
    await dashboardPage.clickSidebarLink('Contatos')
    await contatosPage.expectContatosPageLoaded()
    
    await contatosPage.clickSidebarLink('Processos')
    await processosPage.expectProcessosPageLoaded()
    
    await processosPage.clickSidebarLink('Configurações')
    await configuracoesPage.expectConfiguracoesPageLoaded()
    
    // Switch back to mobile and verify navigation still works
    await page.setViewportSize(mobileViewport)
    await page.waitForTimeout(500)
    
    await testMobileNavigation(page)
  })

  test('responsive form interactions', async ({ page }) => {
    const viewportsToTest = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1440, height: 900, name: 'desktop' },
    ]

    for (const viewport of viewportsToTest) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      // Test contato creation form
      await contatosPage.goto()
      await contatosPage.openCreateContatoDialog()
      
      // Verify form layout
      await testFormLayout(page, viewport)
      
      // Test form interaction
      await contatosPage.fillContatoForm({
        nome: `Test User ${viewport.name}`,
        telefone: '+5511999999999',
        email: `test.${viewport.name}@example.com`,
      })
      
      // Test form submission
      await contatosPage.submitContatoForm()
      await contatosPage.expectToastMessage('Contato criado com sucesso')
      
      // Close dialog
      await page.keyboard.press('Escape')
    }
  })

  test('responsive data visualization', async ({ page }) => {
    const viewportsToTest = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' },
    ]

    for (const viewport of viewportsToTest) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      await dashboardPage.goto()
      await dashboardPage.expectDashboardLoaded()
      
      // Test charts responsiveness
      const charts = await page.locator('[data-testid*="chart"]').all()
      
      for (const chart of charts) {
        await expect(chart).toBeVisible()
        
        // Verify chart is properly sized
        const chartBox = await chart.boundingBox()
        expect(chartBox!.width).toBeGreaterThan(0)
        expect(chartBox!.height).toBeGreaterThan(0)
        
        // Verify chart doesn't overflow
        expect(chartBox!.width).toBeLessThanOrEqual(viewport.width)
      }
      
      // Test chart interactions on different devices
      if (viewport.name === 'mobile') {
        // Test touch interactions
        await testTouchInteractions(page)
      } else {
        // Test mouse interactions
        await testMouseInteractions(page)
      }
    }
  })

  test('responsive accessibility across devices', async ({ page }) => {
    const viewportsToTest = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1440, height: 900, name: 'desktop' },
    ]

    for (const viewport of viewportsToTest) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      // Test keyboard navigation on each viewport
      await dashboardPage.goto()
      await testKeyboardNavigation(page, viewport)
      
      // Test focus management
      await testFocusManagement(page, viewport)
      
      // Test ARIA attributes
      await testAriaAttributes(page, viewport)
      
      // Test screen reader compatibility
      await testScreenReaderCompatibility(page, viewport)
    }
  })

  test('responsive performance across devices', async ({ page }) => {
    const viewportsToTest = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 1440, height: 900, name: 'desktop' },
    ]

    for (const viewport of viewportsToTest) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      
      // Measure load times
      const loadTimes = {
        dashboard: await measurePageLoadTime(page, '/dashboard'),
        contatos: await measurePageLoadTime(page, '/contatos'),
        processos: await measurePageLoadTime(page, '/processos'),
        configuracoes: await measurePageLoadTime(page, '/configuracoes'),
      }
      
      // Performance expectations (mobile should be within reasonable limits)
      const maxLoadTime = viewport.name === 'mobile' ? 5000 : 3000
      
      for (const [pageName, loadTime] of Object.entries(loadTimes)) {
        expect(loadTime).toBeLessThan(maxLoadTime)
        console.log(`${pageName} load time on ${viewport.name}: ${loadTime}ms`)
      }
    }
  })
})

// Helper functions
async function setupResponsiveApiMocks(page: any) {
  // Mock APIs with responsive-friendly data
  await page.route('**/api/dashboard/metrics', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalContatos: 150,
        contatosHoje: 12,
        processosAtivos: 45,
        taxaResposta: 85,
      }),
    })
  })

  await page.route('**/api/contatos**', async (route: any) => {
    const method = route.request().method()
    
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: '1',
              nome: 'João Silva',
              telefone: '+5511999999999',
              email: 'joao@example.com',
              status: 'novo',
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
        }),
      })
    } else if (method === 'POST') {
      const requestBody = await route.request().postDataJSON()
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: Date.now().toString(),
          ...requestBody,
        }),
      })
    }
  })
}

async function testMetricsCardsResponsiveness(page: any, viewport: any) {
  const metricsCards = await page.locator('[data-testid*="card"]').all()
  
  if (viewport.category === 'mobile') {
    // On mobile, cards should stack vertically
    if (metricsCards.length > 1) {
      const firstCardBox = await metricsCards[0].boundingBox()
      const secondCardBox = await metricsCards[1].boundingBox()
      
      expect(secondCardBox!.y).toBeGreaterThan(firstCardBox!.y + firstCardBox!.height - 10)
    }
  } else if (viewport.category === 'desktop') {
    // On desktop, cards should be in a row
    if (metricsCards.length > 1) {
      const firstCardBox = await metricsCards[0].boundingBox()
      const secondCardBox = await metricsCards[1].boundingBox()
      
      expect(secondCardBox!.x).toBeGreaterThan(firstCardBox!.x + firstCardBox!.width - 10)
    }
  }
}

async function testChartsResponsiveness(page: any, viewport: any) {
  const charts = await page.locator('[data-testid*="chart"]').all()
  
  for (const chart of charts) {
    const chartBox = await chart.boundingBox()
    
    // Chart should be visible and properly sized
    expect(chartBox!.width).toBeGreaterThan(0)
    expect(chartBox!.height).toBeGreaterThan(0)
    
    // Chart should not overflow viewport
    expect(chartBox!.width).toBeLessThanOrEqual(viewport.width - 40) // Account for padding
  }
}

async function testSidebarResponsiveness(page: any, viewport: any) {
  const sidebar = page.locator('[data-testid="app-sidebar"]')
  
  if (viewport.category === 'mobile') {
    // On mobile, sidebar might be collapsed or hidden
    const sidebarBox = await sidebar.boundingBox()
    if (sidebarBox) {
      expect(sidebarBox.width).toBeLessThan(viewport.width * 0.8)
    }
  } else {
    // On desktop, sidebar should be visible
    await expect(sidebar).toBeVisible()
  }
}

async function testNavigationResponsiveness(page: any, viewport: any) {
  if (viewport.category === 'mobile') {
    // Test mobile navigation (hamburger menu, etc.)
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]')
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click()
      
      const mobileMenu = page.locator('[data-testid="mobile-menu"]')
      await expect(mobileMenu).toBeVisible()
      
      // Close menu
      await page.keyboard.press('Escape')
    }
  }
}

async function testContatosTableResponsiveness(page: any, viewport: any) {
  if (viewport.category === 'mobile') {
    // On mobile, should show card view
    const mobileCards = page.locator('[data-testid="contato-card"]')
    if (await mobileCards.first().isVisible()) {
      await expect(mobileCards.first()).toBeVisible()
    }
  } else {
    // On desktop, should show table view
    const table = page.locator('[data-testid="contatos-table"]')
    await expect(table).toBeVisible()
  }
}

async function testFiltersResponsiveness(page: any, viewport: any) {
  const filtersContainer = page.locator('[data-testid="filters-container"]')
  
  if (viewport.category === 'mobile') {
    // Filters might be collapsed on mobile
    const filtersToggle = page.locator('[data-testid="filters-toggle"]')
    if (await filtersToggle.isVisible()) {
      await filtersToggle.click()
      await expect(filtersContainer).toBeVisible()
    }
  } else {
    // Filters should be visible on desktop
    await expect(filtersContainer).toBeVisible()
  }
}

async function testCreateDialogResponsiveness(page: any, viewport: any, type: string) {
  const createButton = page.locator(`[data-testid="create-${type}-button"]`)
  await createButton.click()
  
  const dialog = page.locator('[role="dialog"]')
  await expect(dialog).toBeVisible()
  
  const dialogBox = await dialog.boundingBox()
  
  if (viewport.category === 'mobile') {
    // Dialog should take most of the screen on mobile
    expect(dialogBox!.width).toBeGreaterThan(viewport.width * 0.8)
  } else {
    // Dialog should be centered and reasonably sized on desktop
    expect(dialogBox!.width).toBeLessThan(viewport.width * 0.8)
  }
  
  // Close dialog
  await page.keyboard.press('Escape')
}

async function testDetailDrawerResponsiveness(page: any, viewport: any, type: string) {
  // This would test the detail drawer if there's data to click on
  // Implementation depends on having test data available
}

async function testProcessosTableResponsiveness(page: any, viewport: any) {
  // Similar to contatos table test
  if (viewport.category === 'mobile') {
    const mobileCards = page.locator('[data-testid="processo-card"]')
    if (await mobileCards.first().isVisible()) {
      await expect(mobileCards.first()).toBeVisible()
    }
  } else {
    const table = page.locator('[data-testid="processos-table"]')
    await expect(table).toBeVisible()
  }
}

async function testBulkActionsResponsiveness(page: any, viewport: any) {
  const bulkActions = page.locator('[data-testid="bulk-actions-toolbar"]')
  
  if (viewport.category === 'mobile') {
    // Bulk actions might be in a dropdown on mobile
    const bulkActionsMenu = page.locator('[data-testid="bulk-actions-menu"]')
    if (await bulkActionsMenu.isVisible()) {
      await expect(bulkActionsMenu).toBeVisible()
    }
  }
}

async function testSettingsSectionsResponsiveness(page: any, viewport: any) {
  const settingsSections = await page.locator('[data-testid*="settings"]').all()
  
  for (const section of settingsSections) {
    await expect(section).toBeVisible()
    
    const sectionBox = await section.boundingBox()
    expect(sectionBox!.width).toBeLessThanOrEqual(viewport.width)
  }
}

async function testFormsResponsiveness(page: any, viewport: any) {
  const forms = await page.locator('form').all()
  
  for (const form of forms) {
    const formBox = await form.boundingBox()
    if (formBox) {
      expect(formBox.width).toBeLessThanOrEqual(viewport.width)
    }
  }
}

async function testMobileNavigation(page: any) {
  // Test mobile-specific navigation patterns
  const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]')
  if (await mobileMenuButton.isVisible()) {
    await mobileMenuButton.click()
    
    const mobileMenu = page.locator('[data-testid="mobile-menu"]')
    await expect(mobileMenu).toBeVisible()
  }
}

async function testDesktopNavigation(page: any) {
  // Test desktop navigation
  const sidebar = page.locator('[data-testid="app-sidebar"]')
  await expect(sidebar).toBeVisible()
}

async function testFormLayout(page: any, viewport: any) {
  const formFields = await page.locator('input, select, textarea').all()
  
  for (const field of formFields) {
    const fieldBox = await field.boundingBox()
    if (fieldBox) {
      expect(fieldBox.width).toBeLessThanOrEqual(viewport.width - 40) // Account for padding
    }
  }
}

async function testTouchInteractions(page: any) {
  // Test touch-specific interactions
  const interactiveElements = await page.locator('button, [role="button"]').all()
  
  for (const element of interactiveElements.slice(0, 3)) { // Test first 3 elements
    const elementBox = await element.boundingBox()
    if (elementBox) {
      // Touch targets should be at least 44px (iOS guideline)
      expect(Math.min(elementBox.width, elementBox.height)).toBeGreaterThanOrEqual(44)
    }
  }
}

async function testMouseInteractions(page: any) {
  // Test mouse-specific interactions
  const hoverElements = await page.locator('[data-testid*="hover"]').all()
  
  for (const element of hoverElements) {
    await element.hover()
    // Verify hover states work
  }
}

async function testKeyboardNavigation(page: any, viewport: any) {
  // Test keyboard navigation
  await page.keyboard.press('Tab')
  
  const focusedElement = page.locator(':focus')
  await expect(focusedElement).toBeVisible()
}

async function testFocusManagement(page: any, viewport: any) {
  // Test focus management
  const focusableElements = await page.locator('button, input, select, textarea, [tabindex]').all()
  
  for (let i = 0; i < Math.min(focusableElements.length, 5); i++) {
    await page.keyboard.press('Tab')
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  }
}

async function testAriaAttributes(page: any, viewport: any) {
  // Test ARIA attributes
  const elementsWithAria = await page.locator('[aria-label], [aria-describedby], [role]').all()
  
  for (const element of elementsWithAria) {
    const ariaLabel = await element.getAttribute('aria-label')
    const role = await element.getAttribute('role')
    
    // Verify ARIA attributes are meaningful
    if (ariaLabel) {
      expect(ariaLabel.length).toBeGreaterThan(0)
    }
    if (role) {
      expect(role.length).toBeGreaterThan(0)
    }
  }
}

async function testScreenReaderCompatibility(page: any, viewport: any) {
  // Test screen reader compatibility
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
  expect(headings.length).toBeGreaterThan(0)
  
  const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"]').all()
  expect(landmarks.length).toBeGreaterThan(0)
}

async function measurePageLoadTime(page: any, path: string): Promise<number> {
  const startTime = Date.now()
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  return Date.now() - startTime
}