import { Page, expect } from '@playwright/test'
import { BasePage } from './base-page'

export class ConfiguracoesPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  // Page elements
  get profileSection() {
    return this.page.locator('[data-testid="profile-settings"]')
  }

  get notificationSection() {
    return this.page.locator('[data-testid="notification-settings"]')
  }

  get whatsappSection() {
    return this.page.locator('[data-testid="whatsapp-settings"]')
  }

  get systemSection() {
    return this.page.locator('[data-testid="system-settings"]')
  }

  get saveButton() {
    return this.page.locator('[data-testid="save-settings"]')
  }

  // Navigation
  async goto() {
    await this.navigateTo('/configuracoes')
  }

  // Assertions
  async expectConfiguracoesPageLoaded() {
    await this.expectUrl(/\/configuracoes/)
    await this.expectElementVisible('[data-testid="profile-settings"]')
    await this.expectPageTitle('Configurações')
  }

  // Profile Settings
  async clickProfileSettings() {
    const profileTab = this.page.locator('[data-testid="profile-tab"]')
    await profileTab.click()
    await expect(this.profileSection).toBeVisible()
  }

  async fillProfileForm(profileData: {
    nome?: string
    email?: string
    telefone?: string
    oab?: string
    especialidades?: string[]
  }) {
    if (profileData.nome) {
      await this.page.locator('[name="nome"]').fill(profileData.nome)
    }
    
    if (profileData.email) {
      await this.page.locator('[name="email"]').fill(profileData.email)
    }
    
    if (profileData.telefone) {
      await this.page.locator('[name="telefone"]').fill(profileData.telefone)
    }
    
    if (profileData.oab) {
      await this.page.locator('[name="oab"]').fill(profileData.oab)
    }
    
    if (profileData.especialidades) {
      const especialidadesSelect = this.page.locator('[name="especialidades"]')
      await especialidadesSelect.click()
      
      for (const especialidade of profileData.especialidades) {
        await this.page.locator(`[data-value="${especialidade}"]`).click()
      }
    }
  }

  async uploadAvatar(filePath: string) {
    const fileInput = this.page.locator('[data-testid="avatar-upload"]')
    await fileInput.setInputFiles(filePath)
  }

  async saveProfileSettings() {
    const saveProfileButton = this.profileSection.locator('[data-testid="save-profile"]')
    await saveProfileButton.click()
  }

  // Notification Settings
  async clickNotificationSettings() {
    const notificationTab = this.page.locator('[data-testid="notification-tab"]')
    await notificationTab.click()
    await expect(this.notificationSection).toBeVisible()
  }

  async enableNotification(notificationType: string) {
    const notificationToggle = this.notificationSection.locator(`[data-testid="${notificationType}-toggle"]`)
    await notificationToggle.check()
  }

  async disableNotification(notificationType: string) {
    const notificationToggle = this.notificationSection.locator(`[data-testid="${notificationType}-toggle"]`)
    await notificationToggle.uncheck()
  }

  async expectNotificationEnabled(notificationType: string) {
    const notificationToggle = this.notificationSection.locator(`[data-testid="${notificationType}-toggle"]`)
    await expect(notificationToggle).toBeChecked()
  }

  async expectNotificationDisabled(notificationType: string) {
    const notificationToggle = this.notificationSection.locator(`[data-testid="${notificationType}-toggle"]`)
    await expect(notificationToggle).not.toBeChecked()
  }

  async setEmailNotifications(settings: {
    novoContato?: boolean
    processoAtualizado?: boolean
    prazoProximo?: boolean
    mensagemRecebida?: boolean
  }) {
    for (const [setting, enabled] of Object.entries(settings)) {
      if (enabled) {
        await this.enableNotification(`email-${setting}`)
      } else {
        await this.disableNotification(`email-${setting}`)
      }
    }
  }

  async setPushNotifications(settings: {
    novoContato?: boolean
    processoAtualizado?: boolean
    prazoProximo?: boolean
  }) {
    for (const [setting, enabled] of Object.entries(settings)) {
      if (enabled) {
        await this.enableNotification(`push-${setting}`)
      } else {
        await this.disableNotification(`push-${setting}`)
      }
    }
  }

  async setWhatsAppBusinessHours(horario: {
    inicio: string
    fim: string
    diasSemana: number[]
  }) {
    await this.page.locator('[name="horario-inicio"]').fill(horario.inicio)
    await this.page.locator('[name="horario-fim"]').fill(horario.fim)
    
    // Select days of week
    for (const dia of horario.diasSemana) {
      const dayCheckbox = this.page.locator(`[data-testid="dia-${dia}"]`)
      await dayCheckbox.check()
    }
  }

  async saveNotificationSettings() {
    const saveNotificationButton = this.notificationSection.locator('[data-testid="save-notifications"]')
    await saveNotificationButton.click()
  }

  // WhatsApp Settings
  async clickWhatsAppSettings() {
    const whatsappTab = this.page.locator('[data-testid="whatsapp-tab"]')
    await whatsappTab.click()
    await expect(this.whatsappSection).toBeVisible()
  }

  async fillWhatsAppConfig(config: {
    token?: string
    webhookUrl?: string
    phoneNumberId?: string
    businessAccountId?: string
  }) {
    if (config.token) {
      await this.page.locator('[name="whatsapp-token"]').fill(config.token)
    }
    
    if (config.webhookUrl) {
      await this.page.locator('[name="webhook-url"]').fill(config.webhookUrl)
    }
    
    if (config.phoneNumberId) {
      await this.page.locator('[name="phone-number-id"]').fill(config.phoneNumberId)
    }
    
    if (config.businessAccountId) {
      await this.page.locator('[name="business-account-id"]').fill(config.businessAccountId)
    }
  }

  async testWhatsAppConnection() {
    const testButton = this.whatsappSection.locator('[data-testid="test-connection"]')
    await testButton.click()
  }

  async expectConnectionSuccess() {
    await this.expectToastMessage('Conexão com WhatsApp testada com sucesso')
  }

  async expectConnectionError() {
    await this.expectToastMessage('Erro ao conectar com WhatsApp')
  }

  async addMessageTemplate(template: {
    nome: string
    categoria: string
    conteudo: string
  }) {
    const addTemplateButton = this.whatsappSection.locator('[data-testid="add-template"]')
    await addTemplateButton.click()
    
    await this.page.locator('[name="template-nome"]').fill(template.nome)
    await this.page.locator('[name="template-categoria"]').fill(template.categoria)
    await this.page.locator('[name="template-conteudo"]').fill(template.conteudo)
    
    const saveTemplateButton = this.page.locator('[data-testid="save-template"]')
    await saveTemplateButton.click()
  }

  async saveWhatsAppSettings() {
    const saveWhatsAppButton = this.whatsappSection.locator('[data-testid="save-whatsapp"]')
    await saveWhatsAppButton.click()
  }

  // System Settings
  async clickSystemSettings() {
    const systemTab = this.page.locator('[data-testid="system-tab"]')
    await systemTab.click()
    await expect(this.systemSection).toBeVisible()
  }

  async setTheme(theme: 'light' | 'dark' | 'auto') {
    const themeSelect = this.systemSection.locator('[data-testid="theme-select"]')
    await themeSelect.click()
    await this.page.locator(`[data-value="${theme}"]`).click()
  }

  async setLanguage(language: string) {
    const languageSelect = this.systemSection.locator('[data-testid="language-select"]')
    await languageSelect.click()
    await this.page.locator(`[data-value="${language}"]`).click()
  }

  async setTimezone(timezone: string) {
    const timezoneSelect = this.systemSection.locator('[data-testid="timezone-select"]')
    await timezoneSelect.click()
    await this.page.locator(`[data-value="${timezone}"]`).click()
  }

  async configureBackup(config: {
    automatico: boolean
    frequencia?: 'diario' | 'semanal' | 'mensal'
    retencao?: number
  }) {
    const backupToggle = this.systemSection.locator('[data-testid="backup-toggle"]')
    
    if (config.automatico) {
      await backupToggle.check()
      
      if (config.frequencia) {
        const frequenciaSelect = this.systemSection.locator('[data-testid="backup-frequency"]')
        await frequenciaSelect.click()
        await this.page.locator(`[data-value="${config.frequencia}"]`).click()
      }
      
      if (config.retencao) {
        await this.page.locator('[name="backup-retention"]').fill(config.retencao.toString())
      }
    } else {
      await backupToggle.uncheck()
    }
  }

  async exportData(format: 'JSON' | 'CSV' | 'PDF') {
    const exportButton = this.systemSection.locator('[data-testid="export-data"]')
    await exportButton.click()
    
    const formatSelect = this.page.locator('[data-testid="export-format"]')
    await formatSelect.click()
    await this.page.locator(`[data-value="${format}"]`).click()
    
    const confirmExportButton = this.page.locator('[data-testid="confirm-export"]')
    await confirmExportButton.click()
  }

  async importData(filePath: string) {
    const importButton = this.systemSection.locator('[data-testid="import-data"]')
    await importButton.click()
    
    const fileInput = this.page.locator('[data-testid="import-file"]')
    await fileInput.setInputFiles(filePath)
    
    const confirmImportButton = this.page.locator('[data-testid="confirm-import"]')
    await confirmImportButton.click()
  }

  async resetSystem() {
    const resetButton = this.systemSection.locator('[data-testid="reset-system"]')
    await resetButton.click()
    
    // Confirm reset
    const confirmResetButton = this.page.locator('[data-testid="confirm-reset"]')
    await confirmResetButton.click()
  }

  async saveSystemSettings() {
    const saveSystemButton = this.systemSection.locator('[data-testid="save-system"]')
    await saveSystemButton.click()
  }

  // General settings operations
  async saveAllSettings() {
    await this.saveButton.click()
  }

  async expectSettingsSaved() {
    await this.expectToastMessage('Configurações salvas com sucesso')
  }

  async expectValidationError(field: string, message: string) {
    const errorElement = this.page.locator(`[data-testid="${field}-error"]`)
    await expect(errorElement).toContainText(message)
  }

  // Form validation
  async expectRequiredFieldError(fieldName: string) {
    const field = this.page.locator(`[name="${fieldName}"]`)
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    
    const errorMessage = this.page.locator(`[data-testid="${fieldName}-error"]`)
    await expect(errorMessage).toBeVisible()
  }

  // Accessibility testing
  async testFormAccessibility() {
    // Check form structure
    const forms = await this.page.locator('form').all()
    
    for (const form of forms) {
      // Check for proper labels
      const inputs = await form.locator('input, select, textarea').all()
      
      for (const input of inputs) {
        const id = await input.getAttribute('id')
        if (id) {
          const label = this.page.locator(`label[for="${id}"]`)
          await expect(label).toBeVisible()
        }
      }
    }
  }

  // Performance testing
  async measureSettingsLoadTime(): Promise<number> {
    const startTime = Date.now()
    await this.goto()
    await this.expectConfiguracoesPageLoaded()
    return Date.now() - startTime
  }

  // Mobile responsiveness
  async testMobileView() {
    await this.page.setViewportSize({ width: 375, height: 667 })
    await this.expectConfiguracoesPageLoaded()
    
    // Check that settings sections are accessible on mobile
    await expect(this.profileSection).toBeVisible()
    await expect(this.notificationSection).toBeVisible()
    await expect(this.whatsappSection).toBeVisible()
    await expect(this.systemSection).toBeVisible()
  }

  // Data persistence testing
  async verifySettingsPersistence(settings: Record<string, any>) {
    // Save settings
    await this.saveAllSettings()
    await this.expectSettingsSaved()
    
    // Navigate away and back
    await this.clickSidebarLink('Dashboard')
    await this.clickSidebarLink('Configurações')
    
    // Verify settings are still applied
    for (const [setting, value] of Object.entries(settings)) {
      const element = this.page.locator(`[data-testid="${setting}"]`)
      if (typeof value === 'boolean') {
        if (value) {
          await expect(element).toBeChecked()
        } else {
          await expect(element).not.toBeChecked()
        }
      } else {
        await expect(element).toHaveValue(value.toString())
      }
    }
  }
}