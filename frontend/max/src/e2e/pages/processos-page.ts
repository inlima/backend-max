import { Page, expect } from '@playwright/test'
import { BasePage } from './base-page'

export class ProcessosPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Page elements
  get processosTable() {
    return this.page.locator('[data-testid="processos-table"]')
  }

  get searchInput() {
    return this.page.locator('[data-testid="processos-search"], [placeholder*="Buscar"]')
  }

  get statusFilter() {
    return this.page.locator('[data-testid="status-filter"]')
  }

  get areaFilter() {
    return this.page.locator('[data-testid="area-filter"]')
  }

  get prioridadeFilter() {
    return this.page.locator('[data-testid="prioridade-filter"]')
  }

  get createProcessoButton() {
    return this.page.locator('[data-testid="create-processo-button"]')
  }

  get processoDetailDrawer() {
    return this.page.locator('[data-testid="processo-detail-drawer"]')
  }

  get createProcessoDialog() {
    return this.page.locator('[data-testid="create-processo-dialog"]')
  }

  get bulkActionsToolbar() {
    return this.page.locator('[data-testid="bulk-actions-toolbar"]')
  }

  // Navigation
  async goto() {
    await this.navigateTo('/processos')
  }

  // Assertions
  async expectProcessosPageLoaded() {
    await this.expectUrl(/\/processos/)
    await this.expectElementVisible('[data-testid="processos-table"]')
    await this.expectPageTitle('Processos')
  }

  async expectProcessoInTable(tituloProcesso: string) {
    const processoRow = this.processosTable.locator('tr', { hasText: tituloProcesso })
    await expect(processoRow).toBeVisible()
  }

  async expectProcessoNotInTable(tituloProcesso: string) {
    const processoRow = this.processosTable.locator('tr', { hasText: tituloProcesso })
    await expect(processoRow).not.toBeVisible()
  }

  async expectProcessoStatus(tituloProcesso: string, expectedStatus: string) {
    const processoRow = this.processosTable.locator('tr', { hasText: tituloProcesso })
    const statusCell = processoRow.locator('[data-testid="status-cell"]')
    await expect(statusCell).toContainText(expectedStatus)
  }

  async expectEmptyState() {
    await expect(this.page.locator('text=Nenhum processo encontrado')).toBeVisible()
  }

  // Interactions
  async searchProcessos(searchTerm: string) {
    await this.searchInput.fill(searchTerm)
    await this.page.waitForTimeout(500) // Wait for debounced search
  }

  async filterByStatus(status: string) {
    await this.statusFilter.click()
    await this.page.locator(`[data-value="${status}"]`).click()
  }

  async filterByArea(area: string) {
    await this.areaFilter.click()
    await this.page.locator(`[data-value="${area}"]`).click()
  }

  async filterByPrioridade(prioridade: string) {
    await this.prioridadeFilter.click()
    await this.page.locator(`[data-value="${prioridade}"]`).click()
  }

  async clearFilters() {
    await this.searchInput.clear()
    const clearButton = this.page.locator('[data-testid="clear-filters"]')
    if (await clearButton.isVisible()) {
      await clearButton.click()
    }
  }

  async clickProcesso(tituloProcesso: string) {
    const processoRow = this.processosTable.locator('tr', { hasText: tituloProcesso })
    await processoRow.click()
  }

  async clickProcessoTitle(tituloProcesso: string) {
    const titleButton = this.processosTable.locator('button', { hasText: tituloProcesso })
    await titleButton.click()
  }

  async openProcessoActions(tituloProcesso: string) {
    const processoRow = this.processosTable.locator('tr', { hasText: tituloProcesso })
    const actionsButton = processoRow.locator('[data-testid="actions-menu"]')
    await actionsButton.click()
  }

  async editProcesso(tituloProcesso: string) {
    await this.openProcessoActions(tituloProcesso)
    await this.page.locator('text=Editar processo').click()
  }

  async deleteProcesso(tituloProcesso: string) {
    await this.openProcessoActions(tituloProcesso)
    await this.page.locator('text=Excluir processo').click()
    
    // Confirm deletion
    const confirmButton = this.page.locator('[data-testid="confirm-delete"]')
    await confirmButton.click()
  }

  // Create processo flow
  async openCreateProcessoDialog() {
    await this.createProcessoButton.click()
    await this.expectModalOpen('Novo Processo')
  }

  async fillProcessoForm(processoData: {
    titulo: string
    descricao: string
    areaJuridica: string
    prioridade: string
    cliente?: string
    observacoes?: string
  }) {
    await this.page.locator('[name="titulo"]').fill(processoData.titulo)
    await this.page.locator('[name="descricao"]').fill(processoData.descricao)
    
    // Select área jurídica
    await this.page.locator('[name="areaJuridica"]').click()
    await this.page.locator(`[data-value="${processoData.areaJuridica}"]`).click()
    
    // Select prioridade
    await this.page.locator('[name="prioridade"]').click()
    await this.page.locator(`[data-value="${processoData.prioridade}"]`).click()
    
    if (processoData.cliente) {
      // Search and select cliente
      const clienteInput = this.page.locator('[name="cliente"]')
      await clienteInput.fill(processoData.cliente)
      await this.page.locator(`[data-value="${processoData.cliente}"]`).click()
    }
    
    if (processoData.observacoes) {
      await this.page.locator('[name="observacoes"]').fill(processoData.observacoes)
    }
  }

  async submitProcessoForm() {
    await this.page.locator('button[type="submit"]').click()
  }

  async createProcesso(processoData: {
    titulo: string
    descricao: string
    areaJuridica: string
    prioridade: string
    cliente?: string
    observacoes?: string
  }) {
    await this.openCreateProcessoDialog()
    await this.fillProcessoForm(processoData)
    await this.submitProcessoForm()
    
    // Wait for success message
    await this.expectToastMessage('Processo criado com sucesso')
  }

  // Processo detail drawer
  async expectProcessoDetailOpen(tituloProcesso: string) {
    await expect(this.processoDetailDrawer).toBeVisible()
    await expect(this.processoDetailDrawer).toContainText(tituloProcesso)
  }

  async expectClienteLinked(nomeCliente: string) {
    const clienteSection = this.processoDetailDrawer.locator('[data-testid="cliente-info"]')
    await expect(clienteSection).toContainText(nomeCliente)
  }

  async expectProcessoTimeline() {
    const timelineSection = this.processoDetailDrawer.locator('[data-testid="processo-timeline"]')
    await expect(timelineSection).toBeVisible()
  }

  async closeProcessoDetail() {
    const closeButton = this.processoDetailDrawer.locator('[data-testid="close-drawer"]')
    await closeButton.click()
    await expect(this.processoDetailDrawer).not.toBeVisible()
  }

  // Process management
  async updateProcessoStatus(status: string) {
    const statusSelect = this.processoDetailDrawer.locator('[data-testid="status-select"]')
    await statusSelect.click()
    await this.page.locator(`[data-value="${status}"]`).click()
    
    const saveButton = this.processoDetailDrawer.locator('[data-testid="save-status"]')
    await saveButton.click()
  }

  async addProcessoNote(note: string) {
    const notesTab = this.processoDetailDrawer.locator('[data-testid="notes-tab"]')
    await notesTab.click()
    
    const noteInput = this.processoDetailDrawer.locator('[data-testid="note-input"]')
    await noteInput.fill(note)
    
    const addNoteButton = this.processoDetailDrawer.locator('[data-testid="add-note"]')
    await addNoteButton.click()
  }

  async addProcessoPrazo(prazoData: {
    descricao: string
    dataLimite: Date
    responsavel: string
  }) {
    const prazosTab = this.processoDetailDrawer.locator('[data-testid="prazos-tab"]')
    await prazosTab.click()
    
    const addPrazoButton = this.processoDetailDrawer.locator('[data-testid="add-prazo"]')
    await addPrazoButton.click()
    
    await this.page.locator('[name="prazo-descricao"]').fill(prazoData.descricao)
    await this.page.locator('[name="prazo-data"]').fill(prazoData.dataLimite.toISOString().split('T')[0])
    await this.page.locator('[name="prazo-responsavel"]').fill(prazoData.responsavel)
    
    const savePrazoButton = this.page.locator('[data-testid="save-prazo"]')
    await savePrazoButton.click()
  }

  // Bulk operations
  async selectAllProcessos() {
    const selectAllCheckbox = this.processosTable.locator('thead input[type="checkbox"]')
    await selectAllCheckbox.check()
  }

  async selectProcesso(tituloProcesso: string) {
    const processoRow = this.processosTable.locator('tr', { hasText: tituloProcesso })
    const checkbox = processoRow.locator('input[type="checkbox"]')
    await checkbox.check()
  }

  async expectSelectedCount(count: number) {
    const selectionInfo = this.page.locator('[data-testid="selection-info"]')
    await expect(selectionInfo).toContainText(`${count} selecionado`)
  }

  async openBulkActions() {
    await expect(this.bulkActionsToolbar).toBeVisible()
    const bulkActionsButton = this.bulkActionsToolbar.locator('[data-testid="bulk-actions-menu"]')
    await bulkActionsButton.click()
  }

  async selectBulkAction(action: string) {
    await this.page.locator(`[data-testid="bulk-action-${action.toLowerCase().replace(' ', '-')}"]`).click()
  }

  async selectAdvogado(advogado: string) {
    const advogadoSelect = this.page.locator('[data-testid="advogado-select"]')
    await advogadoSelect.click()
    await this.page.locator(`[data-value="${advogado}"]`).click()
  }

  async selectExportFormat(format: string) {
    const formatSelect = this.page.locator('[data-testid="export-format"]')
    await formatSelect.click()
    await this.page.locator(`[data-value="${format}"]`).click()
  }

  async confirmBulkAction() {
    const confirmButton = this.page.locator('[data-testid="confirm-bulk-action"]')
    await confirmButton.click()
  }

  async confirmBulkExport() {
    const exportButton = this.page.locator('[data-testid="confirm-export"]')
    await exportButton.click()
  }

  // Sorting and pagination
  async sortByColumn(columnName: string) {
    const columnHeader = this.processosTable.locator('th', { hasText: columnName })
    await columnHeader.click()
  }

  async expectSortedBy(columnName: string, direction: 'asc' | 'desc') {
    const columnHeader = this.processosTable.locator('th', { hasText: columnName })
    const sortIcon = columnHeader.locator('[data-testid="sort-icon"]')
    
    if (direction === 'asc') {
      await expect(sortIcon).toHaveClass(/sort-asc/)
    } else {
      await expect(sortIcon).toHaveClass(/sort-desc/)
    }
  }

  async goToNextPage() {
    const nextButton = this.page.locator('[data-testid="next-page"]')
    await nextButton.click()
  }

  async goToPreviousPage() {
    const prevButton = this.page.locator('[data-testid="previous-page"]')
    await prevButton.click()
  }

  async expectCurrentPage(pageNumber: number) {
    const pageInfo = this.page.locator('[data-testid="page-info"]')
    await expect(pageInfo).toContainText(`Página ${pageNumber}`)
  }

  // Performance testing
  async measureTableLoadTime(expectedRowCount: number): Promise<number> {
    const startTime = Date.now()
    await this.goto()
    await this.expectTableRowCount(expectedRowCount)
    return Date.now() - startTime
  }

  // Mobile responsiveness
  async expectMobileCardView() {
    const mobileCards = this.page.locator('[data-testid="processo-card"]')
    await expect(mobileCards.first()).toBeVisible()
  }

  async clickMobileCard(tituloProcesso: string) {
    const card = this.page.locator('[data-testid="processo-card"]', { hasText: tituloProcesso })
    await card.click()
  }

  // Real-time updates
  async expectProcessoUpdateNotification(tituloProcesso: string) {
    await this.expectToastMessage(`Processo atualizado: ${tituloProcesso}`)
  }

  // Integration with Contatos
  async createProcessoFromContato() {
    const createFromContatoButton = this.page.locator('[data-testid="create-processo-from-contato"]')
    await createFromContatoButton.click()
  }

  async editProcessoFromDetail() {
    const editButton = this.processoDetailDrawer.locator('[data-testid="edit-processo"]')
    await editButton.click()
  }
}