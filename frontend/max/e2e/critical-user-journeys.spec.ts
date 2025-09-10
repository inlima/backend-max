import { test, expect } from '@playwright/test'
import { DashboardPage } from './pages/dashboard-page'
import { ContatosPage } from './pages/contatos-page'
import { ProcessosPage } from './pages/processos-page'
import { ConfiguracoesPage } from './pages/configuracoes-page'
import { generateRandomContato, generateRandomProcesso } from './utils/test-data'

test.describe('Critical User Journeys E2E Tests', () => {
  let dashboardPage: DashboardPage
  let contatosPage: ContatosPage
  let processosPage: ProcessosPage
  let configuracoesPage: ConfiguracoesPage

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page)
    contatosPage = new ContatosPage(page)
    processosPage = new ProcessosPage(page)
    configuracoesPage = new ConfiguracoesPage(page)
    
    await setupComprehensiveApiMocks(page)
  })

  test('complete law firm workflow: dashboard → create contact → create process → configure settings', async ({ page }) => {
    // 1. Start at Dashboard and verify initial state
    await dashboardPage.goto()
    await dashboardPage.expectDashboardLoaded()
    await dashboardPage.expectMetricsVisible()
    
    const initialContatosCount = await dashboardPage.getMetricValue('contatos-hoje')
    const initialProcessosCount = await dashboardPage.getMetricValue('processos-ativos')
    
    // 2. Navigate to Contatos and create a new contact
    await dashboardPage.clickSidebarLink('Contatos')
    await contatosPage.expectContatosPageLoaded()
    
    const newContato = generateRandomContato()
    await contatosPage.createContato(newContato)
    await contatosPage.expectToastMessage('Contato criado com sucesso')
    
    // 3. Verify contact appears and open details
    await contatosPage.expectContatoInTable(newContato.nome)
    await contatosPage.clickContatoName(newContato.nome)
    await contatosPage.expectContatoDetailOpen(newContato.nome)
    
    // 4. Navigate to Processos and create a process linked to the contact
    await contatosPage.closeContatoDetail()
    await contatosPage.clickSidebarLink('Processos')
    await processosPage.expectProcessosPageLoaded()
    
    const newProcesso = generateRandomProcesso()
    await processosPage.createProcesso({
      ...newProcesso,
      cliente: newContato.nome
    })
    await processosPage.expectToastMessage('Processo criado com sucesso')
    
    // 5. Verify process appears and check client relationship
    await processosPage.expectProcessoInTable(newProcesso.titulo)
    await processosPage.clickProcessoTitle(newProcesso.titulo)
    await processosPage.expectProcessoDetailOpen(newProcesso.titulo)
    await processosPage.expectClienteLinked(newContato.nome)
    
    // 6. Navigate to Configurações and update notification settings
    await processosPage.closeProcessoDetail()
    await processosPage.clickSidebarLink('Configurações')
    await configuracoesPage.expectConfiguracoesPageLoaded()
    
    await configuracoesPage.clickNotificationSettings()
    await configuracoesPage.enableNotification('novoContato')
    await configuracoesPage.enableNotification('processoAtualizado')
    await configuracoesPage.saveNotificationSettings()
    await configuracoesPage.expectToastMessage('Configurações salvas com sucesso')
    
    // 7. Return to Dashboard and verify metrics updated
    await configuracoesPage.clickSidebarLink('Dashboard')
    await dashboardPage.expectDashboardLoaded()
    
    // Metrics should reflect the new contact and process
    await dashboardPage.expectMetricValue('contatos-hoje', (parseInt(initialContatosCount) + 1).toString())
    await dashboardPage.expectMetricValue('processos-ativos', (parseInt(initialProcessosCount) + 1).toString())
    
    // 8. Verify recent activity shows our actions
    await dashboardPage.expectRecentActivityContains(`Novo contato: ${newContato.nome}`)
    await dashboardPage.expectRecentActivityContains(`Novo processo: ${newProcesso.titulo}`)
  })

  test('client lifecycle: WhatsApp contact → qualification → process creation → case management', async ({ page }) => {
    // 1. Simulate WhatsApp contact arrival
    await dashboardPage.goto()
    await dashboardPage.expectDashboardLoaded()
    
    // Simulate WebSocket event for new WhatsApp contact
    const whatsappContato = {
      id: 'whatsapp-' + Date.now(),
      nome: 'Cliente WhatsApp Lifecycle',
      telefone: '+5511999887766',
      origem: 'whatsapp',
      status: 'novo',
      mensagensNaoLidas: 1,
      ultimaMensagem: 'Preciso de ajuda com um divórcio'
    }
    
    await page.evaluate((contato) => {
      window.dispatchEvent(new CustomEvent('novo-contato', { detail: contato }))
    }, whatsappContato)
    
    // 2. Verify real-time notification on dashboard
    await dashboardPage.expectNewContatoNotification(whatsappContato.nome)
    
    // 3. Navigate to Contatos and find the new contact
    await dashboardPage.clickSidebarLink('Contatos')
    await contatosPage.expectContatosPageLoaded()
    await contatosPage.expectContatoInTable(whatsappContato.nome)
    
    // 4. Open contact details and review WhatsApp conversation
    await contatosPage.clickContatoName(whatsappContato.nome)
    await contatosPage.expectContatoDetailOpen(whatsappContato.nome)
    await contatosPage.expectConversaHistory()
    await contatosPage.expectWhatsAppMessage('Preciso de ajuda com um divórcio')
    
    // 5. Qualify the contact by updating information
    await contatosPage.editContatoFromDetail()
    await contatosPage.fillContatoForm({
      nome: whatsappContato.nome,
      telefone: whatsappContato.telefone,
      email: 'cliente.whatsapp@example.com',
      areaInteresse: 'Direito de Família',
      tipoSolicitacao: 'consulta',
      preferenciaAtendimento: 'presencial'
    })
    await contatosPage.submitContatoForm()
    await contatosPage.expectToastMessage('Contato atualizado com sucesso')
    
    // 6. Change status to qualified
    await contatosPage.updateContatoStatus('qualificado')
    await contatosPage.expectToastMessage('Status atualizado com sucesso')
    
    // 7. Create a process for the qualified contact
    await contatosPage.createProcessoFromContato()
    await processosPage.fillProcessoForm({
      titulo: 'Divórcio Consensual - Cliente WhatsApp',
      descricao: 'Processo de divórcio consensual iniciado via WhatsApp',
      areaJuridica: 'Direito de Família',
      prioridade: 'media',
      cliente: whatsappContato.nome
    })
    await processosPage.submitProcessoForm()
    await processosPage.expectToastMessage('Processo criado com sucesso')
    
    // 8. Verify process is linked to contact
    await processosPage.expectProcessoInTable('Divórcio Consensual - Cliente WhatsApp')
    await processosPage.clickProcessoTitle('Divórcio Consensual - Cliente WhatsApp')
    await processosPage.expectProcessoDetailOpen('Divórcio Consensual - Cliente WhatsApp')
    await processosPage.expectClienteLinked(whatsappContato.nome)
    
    // 9. Add case notes and set deadlines
    await processosPage.addProcessoNote('Cliente interessado em divórcio consensual. Agendar consulta presencial.')
    await processosPage.addProcessoPrazo({
      descricao: 'Consulta inicial',
      dataLimite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      responsavel: 'Dr. João Silva'
    })
    
    // 10. Update process status
    await processosPage.updateProcessoStatus('em_andamento')
    await processosPage.expectToastMessage('Status do processo atualizado')
    
    // 11. Return to dashboard and verify complete lifecycle reflected in metrics
    await processosPage.clickSidebarLink('Dashboard')
    await dashboardPage.expectDashboardLoaded()
    await dashboardPage.expectMetricIncrease('contatos-qualificados')
    await dashboardPage.expectMetricIncrease('processos-ativos')
  })

  test('bulk operations workflow: mass contact import → bulk process creation → bulk status updates', async ({ page }) => {
    // 1. Navigate to Contatos
    await contatosPage.goto()
    await contatosPage.expectContatosPageLoaded()
    
    // 2. Create multiple contacts for bulk operations
    const bulkContatos = Array.from({ length: 5 }, () => generateRandomContato())
    
    for (const contato of bulkContatos) {
      await contatosPage.createContato(contato)
      await contatosPage.expectToastMessage('Contato criado com sucesso')
    }
    
    // 3. Select all created contacts
    for (const contato of bulkContatos) {
      await contatosPage.selectContato(contato.nome)
    }
    await contatosPage.expectSelectedCount(5)
    
    // 4. Perform bulk status update
    await contatosPage.openBulkActions()
    await contatosPage.selectBulkAction('Atualizar Status')
    await contatosPage.selectBulkStatus('qualificado')
    await contatosPage.confirmBulkAction()
    await contatosPage.expectToastMessage('5 contatos atualizados com sucesso')
    
    // 5. Verify all contacts have updated status
    for (const contato of bulkContatos) {
      await contatosPage.expectContatoStatus(contato.nome, 'qualificado')
    }
    
    // 6. Navigate to Processos and create bulk processes
    await contatosPage.clickSidebarLink('Processos')
    await processosPage.expectProcessosPageLoaded()
    
    // 7. Create processes for each qualified contact
    for (let i = 0; i < bulkContatos.length; i++) {
      const processo = generateRandomProcesso()
      await processosPage.createProcesso({
        ...processo,
        titulo: `${processo.titulo} - Bulk ${i + 1}`,
        cliente: bulkContatos[i].nome
      })
      await processosPage.expectToastMessage('Processo criado com sucesso')
    }
    
    // 8. Select all created processes
    await processosPage.selectAllProcessos()
    await processosPage.expectSelectedCount(5)
    
    // 9. Perform bulk advogado assignment
    await processosPage.openBulkActions()
    await processosPage.selectBulkAction('Atribuir Advogado')
    await processosPage.selectAdvogado('Dr. João Silva')
    await processosPage.confirmBulkAction()
    await processosPage.expectToastMessage('5 processos atribuídos com sucesso')
    
    // 10. Verify bulk export functionality
    await processosPage.selectAllProcessos()
    await processosPage.openBulkActions()
    await processosPage.selectBulkAction('Exportar')
    await processosPage.selectExportFormat('PDF')
    await processosPage.confirmBulkExport()
    await processosPage.expectToastMessage('Exportação iniciada')
    
    // 11. Return to dashboard and verify bulk operations reflected in metrics
    await processosPage.clickSidebarLink('Dashboard')
    await dashboardPage.expectDashboardLoaded()
    await dashboardPage.expectMetricValue('processos-ativos', '5')
    await dashboardPage.expectMetricValue('contatos-qualificados', '5')
  })

  test('error recovery workflow: network failures → offline mode → data synchronization', async ({ page }) => {
    // 1. Start with normal operation
    await dashboardPage.goto()
    await dashboardPage.expectDashboardLoaded()
    await dashboardPage.expectConnectionStatus('connected')
    
    // 2. Create a contact while online
    await dashboardPage.clickSidebarLink('Contatos')
    await contatosPage.expectContatosPageLoaded()
    
    const onlineContato = generateRandomContato()
    await contatosPage.createContato(onlineContato)
    await contatosPage.expectToastMessage('Contato criado com sucesso')
    
    // 3. Simulate network failure
    await page.context().setOffline(true)
    await dashboardPage.expectConnectionStatus('disconnected')
    
    // 4. Try to create another contact while offline
    const offlineContato = generateRandomContato()
    await contatosPage.createContato(offlineContato)
    await contatosPage.expectToastMessage('Contato salvo localmente - será sincronizado quando a conexão for restaurada')
    
    // 5. Verify offline indicator and cached data
    await contatosPage.expectOfflineIndicator()
    await contatosPage.expectContatoInTable(onlineContato.nome) // Should be cached
    await contatosPage.expectContatoInTable(offlineContato.nome) // Should be in local storage
    
    // 6. Navigate while offline
    await contatosPage.clickSidebarLink('Dashboard')
    await dashboardPage.expectOfflineMessage()
    
    // 7. Restore network connection
    await page.context().setOffline(false)
    await dashboardPage.expectConnectionStatus('connected')
    
    // 8. Verify automatic synchronization
    await dashboardPage.expectToastMessage('Dados sincronizados com sucesso')
    
    // 9. Navigate back to Contatos and verify both contacts exist
    await dashboardPage.clickSidebarLink('Contatos')
    await contatosPage.expectContatosPageLoaded()
    await contatosPage.expectContatoInTable(onlineContato.nome)
    await contatosPage.expectContatoInTable(offlineContato.nome)
    
    // 10. Verify data consistency
    await contatosPage.clickContatoName(offlineContato.nome)
    await contatosPage.expectContatoDetailOpen(offlineContato.nome)
    await contatosPage.expectContatoData({
      telefone: offlineContato.telefone,
      email: offlineContato.email || ''
    })
  })

  test('accessibility compliance workflow: keyboard navigation → screen reader compatibility → WCAG validation', async ({ page }) => {
    // 1. Test keyboard navigation from dashboard
    await dashboardPage.goto()
    await dashboardPage.expectDashboardLoaded()
    
    // 2. Navigate using only keyboard
    await page.keyboard.press('Tab') // Focus first interactive element
    await page.keyboard.press('Tab') // Move to next element
    await page.keyboard.press('Enter') // Activate element
    
    // 3. Navigate to Contatos using keyboard
    await page.keyboard.press('Tab') // Focus sidebar
    await page.keyboard.press('ArrowDown') // Navigate to Contatos
    await page.keyboard.press('Enter') // Activate
    
    await contatosPage.expectContatosPageLoaded()
    
    // 4. Test table keyboard navigation
    await page.keyboard.press('Tab') // Focus table
    await page.keyboard.press('ArrowDown') // Navigate rows
    await page.keyboard.press('ArrowRight') // Navigate columns
    await page.keyboard.press('Enter') // Open details
    
    // 5. Test form accessibility
    await contatosPage.openCreateContatoDialog()
    
    // Verify form labels and ARIA attributes
    const nameInput = page.locator('[name="nome"]')
    const nameLabel = page.locator('label[for="nome"]')
    await expect(nameLabel).toBeVisible()
    await expect(nameInput).toHaveAttribute('aria-describedby')
    
    // Test keyboard form navigation
    await page.keyboard.press('Tab') // Focus first field
    await nameInput.fill('Test Accessibility')
    await page.keyboard.press('Tab') // Move to next field
    
    const phoneInput = page.locator('[name="telefone"]')
    await phoneInput.fill('+5511999999999')
    
    // 6. Test error handling accessibility
    await page.keyboard.press('Tab') // Move to submit
    await page.keyboard.press('Enter') // Submit incomplete form
    
    // Verify error messages are announced
    const errorMessage = page.locator('[role="alert"]')
    await expect(errorMessage).toBeVisible()
    await expect(errorMessage).toHaveAttribute('aria-live', 'polite')
    
    // 7. Close modal with keyboard
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
    
    // 8. Test comprehensive accessibility
    await contatosPage.checkAccessibility()
    await processosPage.goto()
    await processosPage.checkAccessibility()
    await configuracoesPage.goto()
    await configuracoesPage.checkAccessibility()
  })

  test('performance under load: large datasets → concurrent operations → response times', async ({ page }) => {
    // 1. Mock large datasets
    await mockLargeDatasets(page)
    
    // 2. Measure dashboard load time with large data
    const dashboardLoadTime = await dashboardPage.measureDashboardLoadTime()
    expect(dashboardLoadTime).toBeLessThan(3000)
    
    // 3. Test Contatos page with 1000+ records
    const contatosLoadTime = await contatosPage.measureTableLoadTime(1000)
    expect(contatosLoadTime).toBeLessThan(5000)
    
    // 4. Test search performance
    const searchStartTime = Date.now()
    await contatosPage.searchContatos('João')
    await contatosPage.expectContatoInTable('João Silva')
    const searchTime = Date.now() - searchStartTime
    expect(searchTime).toBeLessThan(1000)
    
    // 5. Test pagination performance
    const paginationStartTime = Date.now()
    await contatosPage.goToNextPage()
    await contatosPage.expectCurrentPage(2)
    const paginationTime = Date.now() - paginationStartTime
    expect(paginationTime).toBeLessThan(1000)
    
    // 6. Test concurrent operations
    const concurrentPromises = [
      contatosPage.searchContatos('Maria'),
      contatosPage.filterByStatus('novo'),
      contatosPage.sortByColumn('Nome')
    ]
    
    const concurrentStartTime = Date.now()
    await Promise.all(concurrentPromises)
    const concurrentTime = Date.now() - concurrentStartTime
    expect(concurrentTime).toBeLessThan(2000)
    
    // 7. Test memory usage (basic check)
    const memoryUsage = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    // Memory usage should be reasonable (less than 100MB)
    expect(memoryUsage).toBeLessThan(100 * 1024 * 1024)
  })
})

// Helper functions
async function setupComprehensiveApiMocks(page: any) {
  // Dashboard metrics
  await page.route('**/api/dashboard/metrics', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalContatos: 150,
        contatosHoje: 12,
        processosAtivos: 45,
        contatosQualificados: 25,
        taxaResposta: 85,
        tempoMedioResposta: '2h 30min',
        satisfacaoCliente: 4.2,
      }),
    })
  })

  // Contatos API
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

  // Processos API
  await page.route('**/api/processos**', async (route: any) => {
    const method = route.request().method()
    
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          total: 0,
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
        }),
      })
    }
  })

  // Configurações API
  await page.route('**/api/configuracoes**', async (route: any) => {
    const method = route.request().method()
    
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          notifications: {
            email: { novoContato: true, processoAtualizado: true },
            push: { novoContato: false, processoAtualizado: true },
          },
        }),
      })
    } else if (method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
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