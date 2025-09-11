import { test, expect } from '@playwright/test'
import { DashboardPage } from './pages/dashboard-page'
import { ContatosPage } from './pages/contatos-page'

test.describe('Performance Tests', () => {
  let dashboardPage: DashboardPage
  let contatosPage: ContatosPage

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page)
    contatosPage = new ContatosPage(page)
  })

  test('dashboard should load within performance budget', async ({ page }) => {
    // Set up performance monitoring
    const performanceEntries: any[] = []
    
    page.on('response', response => {
      performanceEntries.push({
        url: response.url(),
        status: response.status(),
        timing: response.timing(),
      })
    })

    // Mock API with realistic delay
    await page.route('**/api/dashboard/metrics', async route => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100))
      
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

    // Measure page load time
    const startTime = Date.now()
    await dashboardPage.goto()
    await dashboardPage.expectDashboardLoaded()
    await dashboardPage.expectMetricsVisible()
    const loadTime = Date.now() - startTime

    // Performance assertions
    expect(loadTime).toBeLessThan(3000) // Should load within 3 seconds

    // Check Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver(list => {
          const entries = list.getEntries()
          const vitals: any = {}
          
          entries.forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime
            }
            if (entry.name === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime
            }
          })
          
          resolve(vitals)
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] })
        
        // Fallback timeout
        setTimeout(() => resolve({}), 5000)
      })
    })

    console.log('Web Vitals:', webVitals)
    
    // FCP should be under 1.8s (good threshold)
    if ((webVitals as any).fcp) {
      expect((webVitals as any).fcp).toBeLessThan(1800)
    }
    
    // LCP should be under 2.5s (good threshold)
    if ((webVitals as any).lcp) {
      expect((webVitals as any).lcp).toBeLessThan(2500)
    }
  })

  test('contatos table should handle large datasets efficiently', async ({ page }) => {
    // Mock large dataset
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
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
      mensagensNaoLidas: Math.floor(Math.random() * 5),
      dadosColetados: {},
      conversaCompleta: Math.random() > 0.5,
    }))

    await page.route('**/api/contatos**', async route => {
      const url = new URL(route.request().url())
      const page = parseInt(url.searchParams.get('page') || '1')
      const limit = parseInt(url.searchParams.get('limit') || '10')
      const start = (page - 1) * limit
      const end = start + limit

      // Simulate realistic API delay
      await new Promise(resolve => setTimeout(resolve, 50))

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: largeDataset.slice(start, end),
          total: largeDataset.length,
          page,
          limit,
        }),
      })
    })

    // Measure initial load
    const initialLoadTime = await contatosPage.measureTableLoadTime(10)
    expect(initialLoadTime).toBeLessThan(2000)

    // Measure pagination performance
    const paginationStartTime = Date.now()
    await contatosPage.goToNextPage()
    await contatosPage.expectCurrentPage(2)
    const paginationTime = Date.now() - paginationStartTime
    expect(paginationTime).toBeLessThan(1000)

    // Measure search performance
    const searchStartTime = Date.now()
    await contatosPage.searchContatos('Contato 1')
    await page.waitForTimeout(500) // Wait for debounced search
    const searchTime = Date.now() - searchStartTime
    expect(searchTime).toBeLessThan(1500)

    // Measure sorting performance
    const sortStartTime = Date.now()
    await contatosPage.sortByColumn('Nome')
    await page.waitForTimeout(300) // Wait for sort to complete
    const sortTime = Date.now() - sortStartTime
    expect(sortTime).toBeLessThan(1000)
  })

  test('real-time updates should not impact performance', async ({ page }) => {
    await dashboardPage.goto()
    await dashboardPage.expectDashboardLoaded()

    // Measure baseline performance
    const baselineStart = Date.now()
    await page.evaluate(() => {
      // Simulate some UI interactions
      document.querySelector('body')?.click()
    })
    const baselineTime = Date.now() - baselineStart

    // Simulate multiple rapid WebSocket updates
    const updateStart = Date.now()
    
    for (let i = 0; i < 10; i++) {
      await page.evaluate((index) => {
        window.dispatchEvent(new CustomEvent('novo-contato', {
          detail: {
            id: `perf-test-${index}`,
            nome: `Performance Test ${index}`,
            telefone: `+5511${index.toString().padStart(9, '0')}`,
            status: 'novo',
            origem: 'whatsapp',
          }
        }))
      }, i)
      
      // Small delay between updates
      await page.waitForTimeout(10)
    }
    
    const updateTime = Date.now() - updateStart
    
    // Updates should not significantly impact performance
    expect(updateTime).toBeLessThan(1000)
    
    // UI should remain responsive
    const responsiveStart = Date.now()
    await page.evaluate(() => {
      document.querySelector('body')?.click()
    })
    const responsiveTime = Date.now() - responsiveStart
    
    // Should not be significantly slower than baseline
    expect(responsiveTime).toBeLessThan(baselineTime * 2)
  })

  test('memory usage should remain stable', async ({ page }) => {
    await dashboardPage.goto()
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      } : null
    })

    if (!initialMemory) {
      test.skip('Memory API not available')
      return
    }

    // Perform memory-intensive operations
    for (let i = 0; i < 100; i++) {
      // Navigate between pages
      await dashboardPage.clickSidebarLink('Contatos')
      await contatosPage.expectContatosPageLoaded()
      await dashboardPage.clickSidebarLink('Dashboard')
      await dashboardPage.expectDashboardLoaded()
      
      // Simulate WebSocket updates
      await page.evaluate((index) => {
        window.dispatchEvent(new CustomEvent('novo-contato', {
          detail: {
            id: `memory-test-${index}`,
            nome: `Memory Test ${index}`,
            telefone: `+5511${index.toString().padStart(9, '0')}`,
          }
        }))
      }, i)
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc()
      }
    })

    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      }
    })

    // Memory usage should not increase dramatically
    const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
    const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100

    console.log(`Memory increase: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(2)}%)`)
    
    // Should not increase by more than 50%
    expect(memoryIncreasePercent).toBeLessThan(50)
  })

  test('bundle size should be within limits', async ({ page }) => {
    // Monitor network requests to measure bundle size
    const networkRequests: any[] = []
    
    page.on('response', response => {
      if (response.url().includes('.js') || response.url().includes('.css')) {
        networkRequests.push({
          url: response.url(),
          size: response.headers()['content-length'],
          type: response.url().includes('.js') ? 'js' : 'css',
        })
      }
    })

    await dashboardPage.goto()
    await dashboardPage.expectDashboardLoaded()

    // Calculate total bundle size
    const totalJSSize = networkRequests
      .filter(req => req.type === 'js')
      .reduce((total, req) => total + (parseInt(req.size) || 0), 0)

    const totalCSSSize = networkRequests
      .filter(req => req.type === 'css')
      .reduce((total, req) => total + (parseInt(req.size) || 0), 0)

    console.log(`Total JS size: ${(totalJSSize / 1024).toFixed(2)} KB`)
    console.log(`Total CSS size: ${(totalCSSSize / 1024).toFixed(2)} KB`)

    // Bundle size limits (adjust based on requirements)
    expect(totalJSSize).toBeLessThan(1024 * 1024) // 1MB JS limit
    expect(totalCSSSize).toBeLessThan(256 * 1024) // 256KB CSS limit
  })

  test('should handle concurrent users simulation', async ({ browser }) => {
    const contexts = await Promise.all(
      Array.from({ length: 5 }, () => browser.newContext())
    )

    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    )

    // Mock API for all pages
    for (const page of pages) {
      await page.route('**/api/dashboard/metrics', async route => {
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
    }

    // Simulate concurrent access
    const startTime = Date.now()
    
    await Promise.all(
      pages.map(async (page, index) => {
        const dashboardPage = new DashboardPage(page)
        await dashboardPage.goto()
        await dashboardPage.expectDashboardLoaded()
        
        // Simulate different user behaviors
        if (index % 2 === 0) {
          await dashboardPage.clickSidebarLink('Contatos')
        }
      })
    )

    const totalTime = Date.now() - startTime
    
    // All pages should load within reasonable time
    expect(totalTime).toBeLessThan(10000) // 10 seconds for 5 concurrent users

    // Cleanup
    await Promise.all(contexts.map(context => context.close()))
  })

  test('should maintain performance on slow networks', async ({ page }) => {
    // Simulate slow 3G network
    await page.route('**/*', async route => {
      // Add delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 100))
      await route.continue()
    })

    const startTime = Date.now()
    await dashboardPage.goto()
    await dashboardPage.expectDashboardLoaded()
    const loadTime = Date.now() - startTime

    // Should still be usable on slow networks (adjust threshold as needed)
    expect(loadTime).toBeLessThan(10000) // 10 seconds on slow network

    // Test interaction responsiveness
    const interactionStart = Date.now()
    await dashboardPage.clickSidebarLink('Contatos')
    await contatosPage.expectContatosPageLoaded()
    const interactionTime = Date.now() - interactionStart

    expect(interactionTime).toBeLessThan(5000) // 5 seconds for navigation
  })
})