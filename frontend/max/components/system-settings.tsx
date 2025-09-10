'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { 
  IconDevices, 
  IconPalette,
  IconGlobe,
  IconClock,
  IconDatabase,
  IconDownload,
  IconUpload,
  IconTrash,
  IconSave,
  IconRefresh,
  IconAlertTriangle,
  IconCheck,
  IconSettings
} from '@tabler/icons-react'
import type { SystemSettings as SystemSettingsType } from '@/types'

interface SystemSettingsProps {
  initialData?: Partial<SystemSettingsType>
  onSave?: (data: SystemSettingsType) => Promise<void>
  onExportData?: () => Promise<void>
  onImportData?: (file: File) => Promise<void>
  onResetSettings?: () => Promise<void>
}

const TEMAS = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'auto', label: 'Automático (Sistema)' }
]

const IDIOMAS = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'es-ES', label: 'Español' }
]

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
  { value: 'America/New_York', label: 'New York (GMT-5)' },
  { value: 'Europe/London', label: 'London (GMT+0)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' }
]

const FORMATOS_DATA = [
  { value: 'DD/MM/YYYY', label: '31/12/2024' },
  { value: 'MM/DD/YYYY', label: '12/31/2024' },
  { value: 'YYYY-MM-DD', label: '2024-12-31' }
]

const FORMATOS_HORA = [
  { value: '24h', label: '23:59' },
  { value: '12h', label: '11:59 PM' }
]

const FREQUENCIAS_BACKUP = [
  { value: 'diario', label: 'Diário' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' }
]

export function SystemSettings({ 
  initialData, 
  onSave, 
  onExportData, 
  onImportData, 
  onResetSettings 
}: SystemSettingsProps) {
  const [formData, setFormData] = useState<SystemSettingsType>({
    tema: initialData?.tema || 'auto',
    idioma: initialData?.idioma || 'pt-BR',
    timezone: initialData?.timezone || 'America/Sao_Paulo',
    formatoData: initialData?.formatoData || 'DD/MM/YYYY',
    formatoHora: initialData?.formatoHora || '24h',
    backup: {
      automatico: initialData?.backup?.automatico ?? true,
      frequencia: initialData?.backup?.frequencia || 'semanal',
      retencao: initialData?.backup?.retencao || 30
    }
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [importProgress, setImportProgress] = useState(0)

  const handleInputChange = (field: keyof SystemSettingsType, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleBackupChange = (field: keyof SystemSettingsType['backup'], value: any) => {
    setFormData(prev => ({
      ...prev,
      backup: {
        ...prev.backup,
        [field]: value
      }
    }))
  }

  const handleExportData = async () => {
    if (!onExportData) return

    setIsExporting(true)
    setExportProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      await onExportData()
      
      clearInterval(progressInterval)
      setExportProgress(100)
      
      setTimeout(() => {
        setExportProgress(0)
        toast.success('Dados exportados com sucesso!')
      }, 500)
    } catch (error) {
      console.error('Erro ao exportar dados:', error)
      toast.error('Erro ao exportar dados. Tente novamente.')
      setExportProgress(0)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !onImportData) return

    // Validate file type
    if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
      toast.error('Apenas arquivos JSON ou CSV são suportados')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 10MB')
      return
    }

    setIsImporting(true)
    setImportProgress(0)

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 15
        })
      }, 300)

      await onImportData(file)
      
      clearInterval(progressInterval)
      setImportProgress(100)
      
      setTimeout(() => {
        setImportProgress(0)
        toast.success('Dados importados com sucesso!')
      }, 500)
    } catch (error) {
      console.error('Erro ao importar dados:', error)
      toast.error('Erro ao importar dados. Verifique o formato do arquivo.')
      setImportProgress(0)
    } finally {
      setIsImporting(false)
    }

    // Reset input
    event.target.value = ''
  }

  const handleResetSettings = async () => {
    if (!onResetSettings) return

    const confirmed = window.confirm(
      'Tem certeza que deseja restaurar todas as configurações para os valores padrão? Esta ação não pode ser desfeita.'
    )

    if (!confirmed) return

    setIsResetting(true)

    try {
      await onResetSettings()
      
      // Reset form to default values
      setFormData({
        tema: 'auto',
        idioma: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        formatoData: 'DD/MM/YYYY',
        formatoHora: '24h',
        backup: {
          automatico: true,
          frequencia: 'semanal',
          retencao: 30
        }
      })
      
      toast.success('Configurações restauradas para os valores padrão!')
    } catch (error) {
      console.error('Erro ao restaurar configurações:', error)
      toast.error('Erro ao restaurar configurações. Tente novamente.')
    } finally {
      setIsResetting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate backup retention
    if (formData.backup.retencao < 1 || formData.backup.retencao > 365) {
      toast.error('Período de retenção deve estar entre 1 e 365 dias')
      return
    }

    setIsLoading(true)
    
    try {
      await onSave?.(formData)
      toast.success('Configurações do sistema salvas com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast.error('Erro ao salvar configurações. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconPalette className="h-5 w-5" />
            Aparência
          </CardTitle>
          <CardDescription>
            Configure a aparência e tema do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tema">Tema</Label>
                <Select
                  value={formData.tema}
                  onValueChange={(value) => handleInputChange('tema', value as SystemSettingsType['tema'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tema" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMAS.map((tema) => (
                      <SelectItem key={tema.value} value={tema.value}>
                        {tema.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="idioma">Idioma</Label>
                <Select
                  value={formData.idioma}
                  onValueChange={(value) => handleInputChange('idioma', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    {IDIOMAS.map((idioma) => (
                      <SelectItem key={idioma.value} value={idioma.value}>
                        {idioma.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconGlobe className="h-5 w-5" />
            Configurações Regionais
          </CardTitle>
          <CardDescription>
            Configure fuso horário e formatos de data e hora
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso Horário</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleInputChange('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fuso horário" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((timezone) => (
                    <SelectItem key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="formatoData">Formato de Data</Label>
                <Select
                  value={formData.formatoData}
                  onValueChange={(value) => handleInputChange('formatoData', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o formato" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATOS_DATA.map((formato) => (
                      <SelectItem key={formato.value} value={formato.value}>
                        {formato.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="formatoHora">Formato de Hora</Label>
                <Select
                  value={formData.formatoHora}
                  onValueChange={(value) => handleInputChange('formatoHora', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o formato" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATOS_HORA.map((formato) => (
                      <SelectItem key={formato.value} value={formato.value}>
                        {formato.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconDatabase className="h-5 w-5" />
            Configurações de Backup
          </CardTitle>
          <CardDescription>
            Configure backups automáticos dos seus dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="backup-automatico">Backup Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Realizar backups automáticos dos dados
                </p>
              </div>
              <Switch
                id="backup-automatico"
                checked={formData.backup.automatico}
                onCheckedChange={(checked) => handleBackupChange('automatico', checked)}
              />
            </div>

            {formData.backup.automatico && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequencia">Frequência</Label>
                    <Select
                      value={formData.backup.frequencia}
                      onValueChange={(value) => handleBackupChange('frequencia', value as SystemSettingsType['backup']['frequencia'])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCIAS_BACKUP.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retencao">Retenção (dias)</Label>
                    <Input
                      id="retencao"
                      type="number"
                      min="1"
                      max="365"
                      value={formData.backup.retencao}
                      onChange={(e) => handleBackupChange('retencao', parseInt(e.target.value) || 30)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Por quantos dias manter os backups
                    </p>
                  </div>
                </div>

                <Alert>
                  <IconCheck className="h-4 w-4" />
                  <AlertDescription>
                    Próximo backup agendado para: {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconSettings className="h-5 w-5" />
            Gerenciamento de Dados
          </CardTitle>
          <CardDescription>
            Exporte, importe ou restaure suas configurações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Export Data */}
            <div className="space-y-2">
              <Label>Exportar Dados</Label>
              <p className="text-sm text-muted-foreground">
                Baixe uma cópia dos seus dados em formato JSON
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <IconDownload className="h-4 w-4 mr-2" />
                      Exportar Dados
                    </>
                  )}
                </Button>
                {isExporting && (
                  <div className="flex-1">
                    <Progress value={exportProgress} className="h-2" />
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Import Data */}
            <div className="space-y-2">
              <Label>Importar Dados</Label>
              <p className="text-sm text-muted-foreground">
                Carregue dados de um arquivo JSON ou CSV
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('import-file')?.click()}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <IconUpload className="h-4 w-4 mr-2" />
                      Importar Dados
                    </>
                  )}
                </Button>
                {isImporting && (
                  <div className="flex-1">
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}
              </div>
              <input
                id="import-file"
                type="file"
                accept=".json,.csv"
                onChange={handleImportData}
                className="hidden"
              />
            </div>

            <Separator />

            {/* Reset Settings */}
            <div className="space-y-2">
              <Label>Restaurar Configurações</Label>
              <p className="text-sm text-muted-foreground">
                Restaure todas as configurações para os valores padrão
              </p>
              <Alert>
                <IconAlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Esta ação não pode ser desfeita. Todas as configurações personalizadas serão perdidas.
                </AlertDescription>
              </Alert>
              <Button
                type="button"
                variant="destructive"
                onClick={handleResetSettings}
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Restaurando...
                  </>
                ) : (
                  <>
                    <IconRefresh className="h-4 w-4 mr-2" />
                    Restaurar Configurações
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              Salvando...
            </>
          ) : (
            <>
              <IconSave className="h-4 w-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  )
}