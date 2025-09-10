import { Page, expect } from '@playwright/test'
import { BasePage } from './base-page'

export class ContatosPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Page elements
  get contatosTable() {
    return this.page.locator('[data-testid="contatos-table"]')
  }

  get searchInput() {
    return this.page.locator('[data-testid="contatos-search"], [placeholder*="Buscar"]')
  }

  get statusFilter() {
    return this.page.locator('[data-testid="status-filter"]')
  }

  get origemFilter() {
    return this.page.locator('[data-testid="origem-filter"]')
  }

  get createContatoButton() {
    return this.page.locator('[data-testid="create-contato-button"]')
  }

  get contatoDetailDrawer() {
    return this.page.locator('[data-testid="contato-detail-drawer"]')
  }

  get createContatoDialog() {
    return this.page.locator('[data-testid="create-contato-dialog"]')
  }

  // Navigation
  async goto() {
    await this.navigateTo('/contatos')
  }

  // Assertions
  async expectContatosPageLoaded() {
    await this.expectUrl(/\/contatos/)
    await this.expectElementVisible('[data-testid="contatos-table"]')
    await this.expectPageTitle('Contatos')
  }

  async expectContatoInTable(nomeContato: string) {
    const contatoRow = this.contatosTable.locator('tr', { hasText: nomeContato })
    await expect(contatoRow).toBeVisible()
  }

  async expectContatoNotInTable(nomeContato: string) {
    const contatoRow = this.contatosTable.locator('tr', { hasText: nomeContato })
    await expect(contatoRow).not.toBeVisible()
  }

  async expectTableRowCount(count: number) {
    const rows = this.contatosTable.locator('tbody tr')
    await expect(rows).toHaveCount(count)
  }

  async expectEmptyState() {
    await expect(this.page.locator('text=Nenhum contato encontrado')).toBeVisible()
  }

  // Interactions
  async searchContatos(searchTerm: string) {
    await this.searchInput.fill(searchTerm)
    await this.page.waitForTimeout(500) // Wait for debounced search
  }

  async filterByStatus(status: string) {
    await this.statusFilter.click()
    await this.page.locator(`[data-value="${status}"]`).click()
  }

  async filterByOrigem(origem: string) {
    await this.origemFilter.click()
    await this.page.locator(`[data-value="${origem}"]`).click()
  }

  async clearFilters() {
    // Clear search
    await this.searchInput.clear()
    
    // Reset filters (implementation depends on UI)
    const clearButton = this.page.locator('[data-testid="clear-filters"]')
    if (await clearButton.isVisible()) {
      await clearButton.click()
    }
  }

  async clickContato(nomeContato: string) {
    const contatoRow = this.contatosTable.locator('tr', { hasText: nomeContato })
    await contatoRow.click()
  }

  async clickContatoName(nomeContato: string) {
    const nameButton = this.contatosTable.locator('button', { hasText: nomeContato })
    await nameButton.click()
  }

  async openContatoActions(nomeContato: string) {
    const contatoRow = this.contatosTable.locator('tr', { hasText: nomeContato })
    const actionsButton = contatoRow.locator('[data-testid="actions-menu"]')
    await actionsButton.click()
  }

  async editContato(nomeContato: string) {
    await this.openContatoActions(nomeContato)
    await this.page.locator('text=Editar contato').click()
  }

  async deleteContato(nomeContato: string) {
    await this.openContatoActions(nomeContato)
    await this.page.locator('text=Excluir contato').click()
    
    // Confirm deletion
    const confirmButton = this.page.locator('[data-testid="confirm-delete"]')
    await confirmButton.click()
  }

  // Create contato flow
  async openCreateContatoDialog() {
    await this.createContatoButton.click()
    await this.expectModalOpen('Novo Contato')
  }

  async fillContatoForm(contatoData: {
    nome: string
    telefone: string
    email?: string
    areaInteresse?: string
    tipoSolicitacao?: string
    preferenciaAtendimento?: string
  }) {
    await this.page.locator('[name="nome"]').fill(contatoData.nome)
    await this.page.locator('[name="telefone"]').fill(contatoData.telefone)
    
    if (contatoData.email) {
      await this.page.locator('[name="email"]').fill(contatoData.email)
    }
    
    if (contatoData.areaInteresse) {
      await this.page.locator('[name="areaInteresse"]').fill(contatoData.areaInteresse)
    }
    
    if (contatoData.tipoSolicitacao) {
      await this.page.locator('[name="tipoSolicitacao"]').click()
      await this.page.locator(`[data-value="${contatoData.tipoSolicitacao}"]`).click()
    }
    
    if (contatoData.preferenciaAtendimento) {
      await this.page.locator('[name="preferenciaAtendimento"]').click()
      await this.page.locator(`[data-value="${contatoData.preferenciaAtendimento}"]`).click()
    }
  }

  async submitContatoForm() {
    await this.page.locator('button[type="submit"]').click()
  }

  async createContato(contatoData: {
    nome: string
    telefone: string
    email?: string
    areaInteresse?: string
    tipoSolicitacao?: string
    preferenciaAtendimento?: string
  }) {
    await this.openCreateContatoDialog()
    await this.fillContatoForm(contatoData)
    await this.submitContatoForm()
    
    // Wait for success message
    await this.expectToastMessage('Contato criado com sucesso')
  }

  // Contato detail drawer
  async expectContatoDetailOpen(nomeContato: string) {
    await expect(this.contatoDetailDrawer).toBeVisible()
    await expect(this.contatoDetailDrawer).toContainText(nomeContato)
  }

  async expectConversaHistory() {
    const conversaSection = this.contatoDetailDrawer.locator('[data-testid="conversa-history"]')
    await expect(conversaSection).toBeVisible()
  }

  async expectContatoData(expectedData: Record<string, string>) {
    for (const [field, value] of Object.entries(expectedData)) {
      const fieldElement = this.contatoDetailDrawer.locator(`[data-testid="${field}"]`)
      await expect(fieldElement).toContainText(value)
    }
  }

  async closeContatoDetail() {
    const closeButton = this.contatoDetailDrawer.locator('[data-testid="close-drawer"]')
    await closeButton.click()
    await expect(this.contatoDetailDrawer).not.toBeVisible()
  }

  // Real-time updates
  async expectNewContatoNotification(nomeContato: string) {
    await this.expectToastMessage(`Novo contato: ${nomeContato}`)
  }

  async expectContatoUpdateNotification(nomeContato: string) {
    await this.expectToastMessage(`Contato atualizado: ${nomeContato}`)
  }

  // Pagination
  async goToNextPage() {
    const nextButton = this.page.locator('[data-testid="next-page"]')
    await nextButton.click()
  }

  async goToPreviousPage() {
    const prevButton = this.page.locator('[data-testid="previous-page"]')
    await prevButton.click()
  }

  async goToPage(pageNumber: number) {
    const pageButton = this.page.locator(`[data-testid="page-${pageNumber}"]`)
    await pageButton.click()
  }

  async expectCurrentPage(pageNumber: number) {
    const pageInfo = this.page.locator('[data-testid="page-info"]')
    await expect(pageInfo).toContainText(`Página ${pageNumber}`)
  }

  // Sorting
  async sortByColumn(columnName: string) {
    const columnHeader = this.contatosTable.locator('th', { hasText: columnName })
    await columnHeader.click()
  }

  async expectSortedBy(columnName: string, direction: 'asc' | 'desc') {
    const columnHeader = this.contatosTable.locator('th', { hasText: columnName })
    const sortIcon = columnHeader.locator('[data-testid="sort-icon"]')
    
    if (direction === 'asc') {
      await expect(sortIcon).toHaveClass(/sort-asc/)
    } else {
      await expect(sortIcon).toHaveClass(/sort-desc/)
    }
  }

  // Bulk operations
  async selectAllContatos() {
    const selectAllCheckbox = this.contatosTable.locator('thead input[type="checkbox"]')
    await selectAllCheckbox.check()
  }

  async selectContato(nomeContato: string) {
    const contatoRow = this.contatosTable.locator('tr', { hasText: nomeContato })
    const checkbox = contatoRow.locator('input[type="checkbox"]')
    await checkbox.check()
  }

  async expectSelectedCount(count: number) {
    const selectionInfo = this.page.locator('[data-testid="selection-info"]')
    await expect(selectionInfo).toContainText(`${count} selecionado`)
  }

  // Mobile view
  async expectMobileCardView() {
    // On mobile, table should switch to card view
    const mobileCards = this.page.locator('[data-testid="contato-card"]')
    await expect(mobileCards.first()).toBeVisible()
  }

  async clickMobileCard(nomeContato: string) {
    const card = this.page.locator('[data-testid="contato-card"]', { hasText: nomeContato })
    await card.click()
  }

  // Performance testing
  async measureTableLoadTime(expectedRowCount: number): Promise<number> {
    const startTime = Date.now()
    await this.goto()
    await this.expectTableRowCount(expectedRowCount)
    return Date.now() - startTime
  }

  // Accessibility
  async testTableAccessibility() {
    // Check table structure
    await expect(this.contatosTable.locator('thead')).toBeVisible()
    await expect(this.contatosTable.locator('tbody')).toBeVisible()
    
    // Check for proper headers
    const headers = this.contatosTable.locator('th')
    await expect(headers.first()).toBeVisible()
    
    // Check for proper row structure
    const rows = this.contatosTable.locator('tbody tr')
    if (await rows.count() > 0) {
      const firstRow = rows.first()
      const cells = firstRow.locator('td')
      await expect(cells.first()).toBeVisible()
    }
  }

  // Additional methods for comprehensive testing
  async expectWhatsAppMessage(messageText: string) {
    const conversaSection = this.contatoDetailDrawer.locator('[data-testid="conversa-history"]')
    const message = conversaSection.locator('.message', { hasText: messageText })
    await expect(message).toBeVisible()
  }

  async editContatoFromDetail() {
    const editButton = this.contatoDetailDrawer.locator('[data-testid="edit-contato"]')
    await editButton.click()
  }

  async updateContatoStatus(status: string) {
    const statusSelect = this.contatoDetailDrawer.locator('[data-testid="status-select"]')
    await statusSelect.click()
    await this.page.locator(`[data-value="${status}"]`).click()
    
    const saveButton = this.contatoDetailDrawer.locator('[data-testid="save-status"]')
    await saveButton.click()
  }

  async createProcessoFromContato() {
    const createProcessoButton = this.contatoDetailDrawer.locator('[data-testid="create-processo-from-contato"]')
    await createProcessoButton.click()
  }

  async expectContatoStatus(nomeContato: string, expectedStatus: string) {
    const contatoRow = this.contatosTable.locator('tr', { hasText: nomeContato })
    const statusCell = contatoRow.locator('[data-testid="status-cell"]')
    await expect(statusCell).toContainText(expectedStatus)
  }

  async expectOfflineIndicator() {
    const offlineIndicator = this.page.locator('[data-testid="offline-indicator"]')
    await expect(offlineIndicator).toBeVisible()
  }
}