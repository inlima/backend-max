'use client'

import { useState } from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProfileSettings } from '@/components/profile-settings'
import { NotificationSettings } from '@/components/notification-settings'
import { WhatsAppSettings } from '@/components/whatsapp-settings'
import { SystemSettings } from '@/components/system-settings'
import { ConfiguracoesErrorBoundary } from '@/components/error-boundaries/configuracoes-error-boundary'
import { toast } from 'sonner'
import { 
  IconSettings, 
  IconUser, 
  IconBell, 
  IconBrandWhatsapp, 
  IconDevices 
} from '@tabler/icons-react'
import type { ProfileSettings as ProfileSettingsType, NotificationSettings as NotificationSettingsType, WhatsAppSettings as WhatsAppSettingsType, SystemSettings as SystemSettingsType } from '@/types'

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('perfil')

  // Mock initial data - in a real app, this would come from an API
  const initialProfileData: Partial<ProfileSettingsType> = {
    nome: 'Dr. João Silva',
    email: 'joao.silva@advocacia.com',
    telefone: '(11) 99999-9999',
    oab: '123456/SP',
    especialidades: ['Direito Civil', 'Direito Trabalhista'],
    assinatura: 'Dr. João Silva\nAdvogado - OAB/SP 123456\nEspecialista em Direito Civil e Trabalhista'
  }

  const handleSaveProfile = async (data: ProfileSettingsType) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // In a real app, you would make an API call here
    console.log('Saving profile data:', data)
    
    // Show success message
    toast.success('Perfil atualizado com sucesso!')
  }

  const handleSaveNotifications = async (data: NotificationSettingsType) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('Saving notification settings:', data)
    toast.success('Configurações de notificação atualizadas!')
  }

  const handleSaveWhatsApp = async (data: WhatsAppSettingsType) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('Saving WhatsApp settings:', data)
    toast.success('Configurações do WhatsApp atualizadas!')
  }

  const handleTestWhatsAppConnection = async (token: string, phoneNumberId: string): Promise<boolean> => {
    // Simulate API call to test WhatsApp connection
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // In a real app, this would make an actual API call to test the connection
    // For now, we'll simulate a successful connection if both fields are filled
    const isValid = token.length > 10 && phoneNumberId.length > 5
    
    console.log('Testing WhatsApp connection:', { token: token.substring(0, 10) + '...', phoneNumberId })
    
    return isValid
  }

  const handleSaveSystemSettings = async (data: SystemSettingsType) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('Saving system settings:', data)
    toast.success('Configurações do sistema atualizadas!')
  }

  const handleExportData = async () => {
    // Simulate data export
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // In a real app, this would generate and download a file
    const data = {
      contatos: [],
      processos: [],
      configuracoes: {},
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `advocacia-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    console.log('Data exported successfully')
  }

  const handleImportData = async (file: File) => {
    // Simulate data import
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // In a real app, this would process the file and import data
    console.log('Importing data from file:', file.name)
    
    // Simulate file reading
    const text = await file.text()
    try {
      const data = JSON.parse(text)
      console.log('Imported data:', data)
    } catch (error) {
      throw new Error('Formato de arquivo inválido')
    }
  }

  const handleResetSystemSettings = async () => {
    // Simulate settings reset
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('System settings reset to defaults')
  }

  return (
    <ConfiguracoesErrorBoundary>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Configurações</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <IconSettings className="h-8 w-8" />
              Configurações
            </h1>
            <p className="text-muted-foreground">
              Configure suas preferências pessoais e do sistema.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="perfil" className="flex items-center gap-2">
                <IconUser className="h-4 w-4" />
                <span className="hidden sm:inline">Perfil</span>
              </TabsTrigger>
              <TabsTrigger value="notificacoes" className="flex items-center gap-2">
                <IconBell className="h-4 w-4" />
                <span className="hidden sm:inline">Notificações</span>
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                <IconBrandWhatsapp className="h-4 w-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </TabsTrigger>
              <TabsTrigger value="sistema" className="flex items-center gap-2">
                <IconDevices className="h-4 w-4" />
                <span className="hidden sm:inline">Sistema</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="perfil" className="space-y-6">
              <ProfileSettings 
                initialData={initialProfileData}
                onSave={handleSaveProfile}
              />
            </TabsContent>

            <TabsContent value="notificacoes" className="space-y-6">
              <NotificationSettings 
                initialData={{
                  email: {
                    novoContato: true,
                    processoAtualizado: true,
                    prazoProximo: true,
                    mensagemRecebida: false
                  },
                  push: {
                    novoContato: true,
                    processoAtualizado: true,
                    prazoProximo: true
                  },
                  whatsapp: {
                    horarioFuncionamento: {
                      inicio: '08:00',
                      fim: '18:00',
                      diasSemana: [1, 2, 3, 4, 5] // Segunda a Sexta
                    },
                    mensagemAutomatica: true,
                    respostaRapida: [
                      'Obrigado pelo contato! Em breve retornaremos.',
                      'Estamos analisando seu caso.',
                      'Agende uma consulta através do nosso site.'
                    ]
                  }
                }}
                onSave={handleSaveNotifications} 
              />
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-6">
              <WhatsAppSettings 
                initialData={{
                  token: '',
                  webhookUrl: 'https://api.advocacia.com/webhook/whatsapp',
                  phoneNumberId: '',
                  businessAccountId: '',
                  templates: [
                    {
                      id: '1',
                      nome: 'Boas-vindas',
                      categoria: 'Atendimento',
                      conteudo: 'Olá {{nome}}! Bem-vindo ao nosso escritório de advocacia. Como podemos ajudá-lo?',
                      variaveis: ['nome']
                    },
                    {
                      id: '2',
                      nome: 'Agendamento Confirmado',
                      categoria: 'Agendamento',
                      conteudo: 'Sua consulta foi agendada para {{data}} às {{hora}}. Endereço: {{endereco}}',
                      variaveis: ['data', 'hora', 'endereco']
                    }
                  ],
                  autoResponses: [
                    {
                      id: '1',
                      trigger: 'horário',
                      response: 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h.',
                      active: true
                    },
                    {
                      id: '2',
                      trigger: 'endereço',
                      response: 'Estamos localizados na Rua das Flores, 123 - Centro. Próximo ao Fórum.',
                      active: true
                    }
                  ]
                }}
                onSave={handleSaveWhatsApp}
                onTestConnection={handleTestWhatsAppConnection}
              />
            </TabsContent>

            <TabsContent value="sistema" className="space-y-6">
              <SystemSettings
                initialData={{
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
                }}
                onSave={handleSaveSystemSettings}
                onExportData={handleExportData}
                onImportData={handleImportData}
                onResetSettings={handleResetSystemSettings}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ConfiguracoesErrorBoundary>
  )
}