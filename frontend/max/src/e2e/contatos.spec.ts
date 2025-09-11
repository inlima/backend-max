import { test, expect } from '@playwright/test'
import { ContatosPage } from './pages/contatos-page'
import { testContatos, generateRandomContato } from './utils/test-data'

test.describe('Contatos E2E Tests', () => {
  let contatosPage: ContatosPage

  test.beforeEach(async ({ page }) => {
    contatosPage = new ContatosPage(page)
    
    // Mock API responses
    await page.route('**/api/contatos**', async route => {
      const url = new URL(route.request().url())
      const method = route.request().method()
      
      if (method === 'GET') {
        // Mock GET contatos
        const mockContatos = [
          {
            id: '1',
            nome: 'João Silva',
            telefone: '+5511999999999',
            email: 'joao@example.com',
            status: 'novo',
            origem: 'whatsapp',
            areaInteresse: 'Direito Civil',
            tipoSolicitacao: 'consulta',
            preferenciaAtendimento: 'presencial',
            primeiroContato: new Date().toISOString(),
            ultimaInteracao: new Date().toISOString(),
            mensagensNaoLidas: 2,
            dadosColetados: {
              clienteType: 'novo',
              practiceArea: 'Direito Civil',
              schedulingPreference: 'presencial',
              wantsScheduling: true,
              customRequests: ['Consulta sobre divórcio'],
            },
            conversaCompleta: false,
            atendente: 'Maria Santos',
          },
          {
            id: '2',
            nome: 'Maria Santos',
            telefone: '+5511888888888',
            email: 'maria@example.com',
            status: 'em_atendimento',
            origem: 'manual',
            areaInteresse: 'Direito Trabalhista',
            tipoSolicitacao: 'agendamento',
            preferenciaAtendimento: 'online',
            primeiroContato: new Date().toISOString(),
            ultimaInteracao: new Date().toISOString(),
            mensagensNaoLidas: 0,
            dadosColetados: {
              clienteType: 'existente',
              practiceArea: 'Direito Trabalhista',
              schedulingPreference: 'online',
              wantsScheduling: true,
              customRequests: [],
            },
            conversaCompleta: true,
            atendente: 'Carlos Oliveira',
          },
        ]
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: mockContatos,
            total: mockContatos.length,
            page: 1,
            limit: 10,
          }),
        })
      } else if (method === 'POST') {
        // Mock POST create contato
        const requestBody = await route.request().postDataJSON()
        const newContato = {
          id: Date.now().toString(),
          ...requestBody,
          status: 'novo',
          origem: 'manual',
          primeiroContato: new Date().toISOString(),
          ultimaInteracao: new Date().toISOString(),
          mensagensNaoLidas: 0,
          dadosColetados: {
            clienteType: 'novo',
            practiceArea: requestBody.areaInteresse,
            schedulingPreference: requestBody.preferenciaAtendimento,
            wantsScheduling: true,
            customRequests: [],
          },
          conversaCompleta: false,
        }
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newContato),
        })
      }
    })

    // Mock individual contato endpoint
    await page.route('**/api/contatos/*', async route => {
      const method = route.request().method()
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '1',
            nome: 'João Silva',
            telefone: '+5511999999999',
            email: 'joao@example.com',
            status: 'novo',
            origem: 'whatsapp',
          }),
        })
      } else if (method === 'DELETE') {
        await route.fulfill({
          status: 204,
        })
      }
    })

    // Mock conversa messages
    await page.route('**/api/contatos/*/messages', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            contatoId: '1',
            direction: 'inbound',
            content: 'Olá, preciso de ajuda com um divórcio',
            messageType: 'text',
            timestamp: new Date().toISOString(),
          },
          {
            id: '2',
            contatoId: '1',
            direction: 'outbound',
            content: 'Olá! Claro, posso ajudá-lo. Vamos agendar uma consulta?',
            messageType: 'text',
            timestamp: new Date().toISOString(),
          },
        ]),
      })
    })
  })

  test('should load contatos page with data', async () => {
    await contatosPage.goto()
    await contatosPage.expectContatosPageLoaded()
    
    // Should show contatos in table
    await contatosPage.expectContatoInTable('João Silva')
    await contatosPage.expectContatoInTable('Maria Santos')
    await contatosPage.expectTableRowCount(2)
  })

  test('should search contatos', async () => {
    await contatosPage.goto()
    
    // Search for specific contato
    await contatosPage.searchContatos('João')
    await contatosPage.expectContatoInTable('João Silva')
    await contatosPage.expectContatoNotInTable('Maria Santos')
    
    // Clear search
    await contatosPage.searchContatos('')
    await contatosPage.expectContatoInTable('Maria Santos')
  })

  test('should filter contatos by status', async () => {
    await contatosPage.goto()
    
    // Filter by status
    await contatosPage.filterByStatus('novo')
    await contatosPage.expectContatoInTable('João Silva')
    await contatosPage.expectContatoNotInTable('Maria Santos')
    
    // Change filter
    await contatosPage.filterByStatus('em_atendimento')
    await contatosPage.expectContatoInTable('Maria Santos')
    await contatosPage.expectContatoNotInTable('João Silva')
  })

  test('should filter contatos by origem', async () => {
    await contatosPage.goto()
    
    // Filter by origem
    await contatosPage.filterByOrigem('whatsapp')
    await contatosPage.expectContatoInTable('João Silva')
    await contatosPage.expectContatoNotInTable('Maria Santos')
    
    // Change filter
    await contatosPage.filterByOrigem('manual')
    await contatosPage.expectContatoInTable('Maria Santos')
    await contatosPage.expectContatoNotInTable('João Silva')
  })

  test('should open contato detail drawer', async () => {
    await contatosPage.goto()
    
    // Click on contato name
    await contatosPage.clickContatoName('João Silva')
    
    // Should open detail drawer
    await contatosPage.expectContatoDetailOpen('João Silva')
    await contatosPage.expectConversaHistory()
    
    // Should show contato data
    await contatosPage.expectContatoData({
      telefone: '+5511999999999',
      email: 'joao@example.com',
      status: 'novo',
    })
    
    // Close drawer
    await contatosPage.closeContatoDetail()
  })

  test('should create new contato', async () => {
    await contatosPage.goto()
    
    const newContato = generateRandomContato()
    
    // Create contato
    await contatosPage.createContato(newContato)
    
    // Should show success message
    await contatosPage.expectToastMessage('Contato criado com sucesso')
    
    // Should appear in table
    await contatosPage.expectContatoInTable(newContato.nome)
  })

  test('should validate contato form', async () => {
    await contatosPage.goto()
    
    // Open create dialog
    await contatosPage.openCreateContatoDialog()
    
    // Try to submit empty form
    await contatosPage.submitContatoForm()
    
    // Should show validation errors
    await contatosPage.expectErrorMessage('Nome é obrigatório')
    await contatosPage.expectErrorMessage('Telefone é obrigatório')
  })

  test('should edit contato', async () => {
    await contatosPage.goto()
    
    // Edit contato
    await contatosPage.editContato('João Silva')
    
    // Should open edit form
    await contatosPage.expectModalOpen('Editar Contato')
    
    // Update data
    await contatosPage.fillContatoForm({
      nome: 'João Silva Editado',
      telefone: '+5511999999999',
      email: 'joao.editado@example.com',
    })
    
    await contatosPage.submitContatoForm()
    
    // Should show success message
    await contatosPage.expectToastMessage('Contato atualizado com sucesso')
  })

  test('should delete contato', async () => {
    await contatosPage.goto()
    
    // Delete contato
    await contatosPage.deleteContato('João Silva')
    
    // Should show success message
    await contatosPage.expectToastMessage('Contato excluído com sucesso')
    
    // Should not appear in table
    await contatosPage.expectContatoNotInTable('João Silva')
  })

  test('should sort contatos', async () => {
    await contatosPage.goto()
    
    // Sort by name
    await contatosPage.sortByColumn('Nome')
    await contatosPage.expectSortedBy('Nome', 'asc')
    
    // Sort again to reverse
    await contatosPage.sortByColumn('Nome')
    await contatosPage.expectSortedBy('Nome', 'desc')
  })

  test('should handle pagination', async ({ page }) => {
    // Mock more data for pagination
    await page.route('**/api/contatos**', async route => {
      const mockContatos = Array.from({ length: 25 }, (_, i) => ({
        id: (i + 1).toString(),
        nome: `Contato ${i + 1}`,
        telefone: `+551199999${i.toString().padStart(4, '0')}`,
        email: `contato${i + 1}@example.com`,
        status: 'novo',
        origem: 'whatsapp',
        areaInteresse: 'Direito Civil',
        tipoSolicitacao: 'consulta',
        preferenciaAtendimento: 'presencial',
        primeiroContato: new Date().toISOString(),
        ultimaInteracao: new Date().toISOString(),
        mensagensNaoLidas: 0,
        dadosColetados: {},
        conversaCompleta: false,
      }))
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: mockContatos.slice(0, 10), // First page
          total: mockContatos.length,
          page: 1,
          limit: 10,
        }),
      })
    })

    await contatosPage.goto()
    
    // Should show pagination
    await contatosPage.expectCurrentPage(1)
    
    // Go to next page
    await contatosPage.goToNextPage()
    await contatosPage.expectCurrentPage(2)
    
    // Go back
    await contatosPage.goToPreviousPage()
    await contatosPage.expectCurrentPage(1)
  })

  test('should select multiple contatos', async () => {
    await contatosPage.goto()
    
    // Select individual contatos
    await contatosPage.selectContato('João Silva')
    await contatosPage.expectSelectedCount(1)
    
    await contatosPage.selectContato('Maria Santos')
    await contatosPage.expectSelectedCount(2)
    
    // Select all
    await contatosPage.selectAllContatos()
    await contatosPage.expectSelectedCount(2)
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await contatosPage.goto()
    
    // Should show mobile card view
    await contatosPage.expectMobileCardView()
    
    // Should be able to interact with cards
    await contatosPage.clickMobileCard('João Silva')
    await contatosPage.expectContatoDetailOpen('João Silva')
  })

  test('should handle real-time updates', async ({ page }) => {
    await contatosPage.goto()
    
    // Simulate WebSocket new contato event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('novo-contato', {
        detail: {
          id: '999',
          nome: 'Novo Cliente Real-time',
          telefone: '+5511777777777',
          status: 'novo',
          origem: 'whatsapp',
        }
      }))
    })
    
    // Should show notification
    await contatosPage.expectNewContatoNotification('Novo Cliente Real-time')
    
    // Should appear in table
    await contatosPage.expectContatoInTable('Novo Cliente Real-time')
  })

  test('should handle API errors', async ({ page }) => {
    // Mock API error
    await page.route('**/api/contatos**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    })

    await contatosPage.goto()
    
    // Should show error state
    await contatosPage.expectErrorMessage('Erro ao carregar contatos')
  })

  test('should be accessible', async () => {
    await contatosPage.goto()
    await contatosPage.checkAccessibility()
    await contatosPage.testTableAccessibility()
  })

  test('should handle empty state', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/contatos**', async route => {
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
    })

    await contatosPage.goto()
    await contatosPage.expectEmptyState()
  })

  test('should maintain filters during navigation', async () => {
    await contatosPage.goto()
    
    // Apply filters
    await contatosPage.filterByStatus('novo')
    await contatosPage.searchContatos('João')
    
    // Navigate away and back
    await contatosPage.clickSidebarLink('Dashboard')
    await contatosPage.clickSidebarLink('Contatos')
    
    // Filters should be preserved (implementation specific)
    await contatosPage.expectContatoInTable('João Silva')
  })

  test('should load quickly with large datasets', async ({ page }) => {
    // Mock large dataset
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: (i + 1).toString(),
      nome: `Contato ${i + 1}`,
      telefone: `+551199999${i.toString().padStart(4, '0')}`,
      status: 'novo',
      origem: 'whatsapp',
    }))

    await page.route('**/api/contatos**', async route => {
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

    const loadTime = await contatosPage.measureTableLoadTime(10)
    expect(loadTime).toBeLessThan(3000) // Should load within 3 seconds
  })
})