import { test, expect } from '@playwright/test'
import { DashboardPage } from './pages/dashboard-page'
import { ContatosPage } from './pages/contatos-page'
import { testContatos, testProcessos, generateRandomContato, generateRandomProcesso } from './utils/test-data'

test.describe('Complete User Flow E2E Tests', () => {
  let dashboardPage: DashboardPage
  let contatosPage: ContatosPage

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page)
    contatosPage = new ContatosPage(page)
    
    // Set up comprehensive API mocks
    await setupApiMocks(page)
  })

  test('complete advocacia workflow: dashboard → contatos → processos', async ({ page }) => {
    // 1. Start at Dashboard
    await dashboardPage.goto()
    await dashboardPage.expectDashboardLoaded()
    await dashboardPage.expectMetricsVisible()
    
    // Verify initial metrics
    await dashboardPage.expectMetricValue('contatos-hoje', '12')
    await dashboardPage.expectMetricValue('processos-ativos', '45')
    
    // 2. Navigate to Contatos
    await dashboardPage.clickSidebarLink('Contatos')
    await contatosPage.expectContatosPageLoaded()
    
    // 3. Create a new contato
    const newContato = generateRandomContato()
    await contatosPage.createContato(newContato)
    await contatosPage.expectToastMessage('Contato criado com sucesso')
    
    // 4. Verify contato appears in table
    await contatosPage.expectContatoInTable(newContato.nome)
    
    // 5. Open contato details
    await contatosPage.clickContatoName(newContato.nome)
    await contatosPage.expectContatoDetailOpen(newContato.nome)
    
    // 6. Verify contato data
    await contatosPage.expectContatoData({
      telefone: newContato.telefone,
      email: newContato.email || '',
    })
    
    // 7. Close details and navigate to Processos
    await contatosPage.closeContatoDetail()
    await contatosPage.clickSidebarLink('Processos')
    
    // 8. Create a processo linked to the contato
    const newProcesso = generateRandomProcesso()
    // Implementation would depend on Processos page
    
    // 9. Navigate back to Dashboard
    await dashboardPage.clickSidebarLink('Dashboard')
    await dashboardPage.expectDashboardLoaded()
    
    // 10. Verify metrics updated (contatos count should increase)
    await dashboardPage.expectMetricValue('contatos-hoje', '13')
  })

  test('real-time updates across all modules', async ({ page }) => {
    // 1. Start at Dashboard
    await dashboardPage.goto()
    await dashboardPage.expectDashboardLoaded()
    
    // 2. Simulate WebSocket connection
    await page.evaluate(() => {
      // Mock WebSocket events
      window.dispatchEvent(new CustomEvent('websocket-connected'))
    })
    
    await dashboardPage.expectConnectionStatus('connected')
    
    // 3. Navigate to Contatos
    await dashboardPage.clickSidebarLink('Contatos')
    await contatosPage.expectContatosPageLoaded()
    
    // 4. Simulate real-time new contato from WhatsApp
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('novo-contato', {
        detail: {
          id: 'realtime-1',
          nome: 'Cliente WhatsApp Real-time',
          telefone: '+5511555555555',
          status: 'novo',
          origem: 'whatsapp',
          mensagensNaoLidas: 1,
        }
      }))
    })
    
    // 5. Verify real-time notification
    await contatosPage.expectNewContatoNotification('Cliente WhatsApp Real-time')
    
    // 6. Verify contato appears in table
    await contatosPage.expectContatoInTable('Cliente WhatsApp Real-time')
    
    // 7. Navigate back to Dashboard
    await dashboardPage.clickSidebarLink('Dashboard')
    
    // 8. Verify dashboard metrics updated in real-time
    await dashboardPage.expectMetricValue('contatos-hoje', '13')
    
    // 9. Simulate processo update
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('processo-atualizado', {
        detail: {
          id: 'processo-1',
          titulo: 'Ação de Divórcio Atualizada',
          status: 'finalizado',
        }
      }))
    })
    
    // 10. Verify dashboard reflects processo update
    await dashboardPage.expectMetricValue('processos-ativos', '44')
  })

  test('error handling and recovery across modules', async ({ page }) => {
    // 1. Start with API working
    await dashboardPage.goto()
    await dashboardPage.expectDashboardLoaded()
    
    // 2. Simulate API failure
    await page.route('**/api/**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server Error' }),
      })
    })
    
    // 3. Navigate to Contatos - should show error
    await dashboardPage.clickSidebarLink('Contatos')
    await contatosPage.expectErrorMessage('Erro ao carregar contatos')
    
    // 4. Restore API
    await setupApiMocks(page)
    
    // 5. Retry - should work
    await page.reload()
    await contatosPage.expectContatosPageLoaded()
    await contatosPage.expectContatoInTable('João Silva')
  })

  test('accessibility across all modules', async ({ page }) => {
    // Test keyboard navigation across modules
    await dashboardPage.goto()
    
    // 1. Test Dashboard accessibility
    await dashboardPage.checkAccessibility()
    await dashboardPage.testKeyboardNavigation()
    
    // 2. Navigate to Contatos using keyboard
    await page.keyboard.press('Tab') // Focus on sidebar
    await page.keyboard.press('ArrowDown') // Navigate to Contatos
    await page.keyboard.press('Enter') // Activate
    
    await contatosPage.expectContatosPageLoaded()
    
    // 3. Test Contatos accessibility
    await contatosPage.checkAccessibility()
    await contatosPage.testTableAccessibility()
    
    // 4. Test form accessibility
    await contatosPage.openCreateContatoDialog()
    
    // Check form labels and associations
    const nameInput = page.locator('[name="nome"]')
    const nameLabel = page.locator('label[for="nome"]')
    await expect(nameLabel).toBeVisible()
    
    // Test keyboard form navigation
    await page.keyboard.press('Tab') // Focus first field
    await page.keyboard.press('Tab') // Focus second field
    await page.keyboard.press('Escape') // Close modal
  })

  test('performance across modules with large datasets', async ({ page }) => {
    // Mock large datasets
    await mockLargeDatasets(page)
    
    // 1. Measure Dashboard load time
    const dashboardLoadTime = await dashboardPage.measureDashboardLoadTime()
    expect(dashboardLoadTime).toBeLessThan(3000)
    
    // 2. Measure Contatos load time
    const contatosLoadTime = await contatosPage.measureTableLoadTime(10)
    expect(contatosLoadTime).toBeLessThan(3000)
    
    // 3. Test pagination performance
    await contatosPage.goToNextPage()
    const paginationTime = await measureActionTime(async () => {
      await contatosPage.expectCurrentPage(2)
    })
    expect(paginationTime).toBeLessThan(1000)
    
    // 4. Test search performance
    const searchTime = await measureActionTime(async () => {
      await contatosPage.searchContatos('João')
      await contatosPage.expectContatoInTable('João Silva')
    })
    expect(searchTime).toBeLessThan(1000)
  })

  test('responsive design across all modules', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1440, height: 900, name: 'desktop' },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      
      // Test Dashboard responsiveness
      await dashboardPage.goto()
      await dashboardPage.expectMetricsVisible()
      
      if (viewport.name === 'mobile') {
        await dashboardPage.testMobileView()
      }
      
      // Test Contatos responsiveness
      await dashboardPage.clickSidebarLink('Contatos')
      await contatosPage.expectContatosPageLoaded()
      
      if (viewport.name === 'mobile') {
        await contatosPage.expectMobileCardView()
      }
      
      // Take screenshots for visual regression
      await page.screenshot({
        path: `test-results/screenshots/complete-flow-${viewport.name}.png`,
        fullPage: true,
      })
    }
  })

  test('data consistency across modules', async ({ page }) => {
    // 1. Create contato in Contatos module
    await contatosPage.goto()
    const newContato = generateRandomContato()
    await contatosPage.createContato(newContato)
    
    // 2. Navigate to Dashboard
    await dashboardPage.clickSidebarLink('Dashboard')
    
    // 3. Verify contato count increased
    await dashboardPage.expectMetricValue('contatos-hoje', '13')
    
    // 4. Navigate back to Contatos
    await dashboardPage.clickSidebarLink('Contatos')
    
    // 5. Verify contato still exists
    await contatosPage.expectContatoInTable(newContato.nome)
    
    // 6. Update contato
    await contatosPage.editContato(newContato.nome)
    await contatosPage.fillContatoForm({
      nome: `${newContato.nome} Editado`,
      telefone: newContato.telefone,
    })
    await contatosPage.submitContatoForm()
    
    // 7. Verify update reflected everywhere
    await contatosPage.expectContatoInTable(`${newContato.nome} Editado`)
    
    // 8. Navigate to Dashboard and back
    await dashboardPage.clickSidebarLink('Dashboard')
    await dashboardPage.clickSidebarLink('Contatos')
    
    // 9. Verify data persistence
    await contatosPage.expectContatoInTable(`${newContato.nome} Editado`)
  })

  test('offline and reconnection handling', async ({ page }) => {
    // 1. Start online
    await dashboardPage.goto()
    await dashboardPage.expectConnectionStatus('connected')
    
    // 2. Go offline
    await page.context().setOffline(true)
    await dashboardPage.expectConnectionStatus('disconnected')
    
    // 3. Try to navigate - should show offline message
    await dashboardPage.clickSidebarLink('Contatos')
    await contatosPage.expectErrorMessage('Sem conexão com a internet')
    
    // 4. Go back online
    await page.context().setOffline(false)
    
    // 5. Should automatically reconnect
    await dashboardPage.expectConnectionStatus('connected')
    
    // 6. Navigation should work again
    await page.reload()
    await contatosPage.expectContatosPageLoaded()
  })
})

// Helper functions
async function setupApiMocks(page: any) {
  // Dashboard API mocks
  await page.route('**/api/dashboard/metrics', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalContatos: 150,
        contatosHoje: 12,
        processosAtivos: 45,
        taxaResposta: 85,
        tempoMedioResposta: '2h 30min',
        satisfacaoCliente: 4.2,
      }),
    })
  })

  // Contatos API mocks
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
              origem: 'whatsapp',
              areaInteresse: 'Direito Civil',
              mensagensNaoLidas: 2,
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
          status: 'novo',
          origem: 'manual',
        }),
      })
    }
  })
}

async function mockLargeDatasets(page: any) {
  await page.route('**/api/contatos**', async (route: any) => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: (i + 1).toString(),
      nome: `Contato ${i + 1}`,
      telefone: `+551199999${i.toString().padStart(4, '0')}`,
      status: 'novo',
      origem: 'whatsapp',
    }))

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: largeDataset.slice(0, 10),
        total: largeDataset.length,
        page: 1,
        limit: 10,
      }),
    })
  })
}

async function measureActionTime(action: () => Promise<void>): Promise<number> {
  const startTime = Date.now()
  await action()
  return Date.now() - startTime
}