'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { 
  IconBrandWhatsapp, 
  IconKey, 
  IconLink,
  IconTemplate,
  IconRobot,
  IconPlus,
  IconX,
  IconSave,
  IconTestPipe,
  IconCheck,
  IconAlertTriangle,
  IconEdit,
  IconTrash
} from '@tabler/icons-react'
import type { WhatsAppSettings as WhatsAppSettingsType, MessageTemplate, AutoResponse } from '@/types'

interface WhatsAppSettingsProps {
  initialData?: Partial<WhatsAppSettingsType>
  onSave?: (data: WhatsAppSettingsType) => Promise<void>
  onTestConnection?: (token: string, phoneNumberId: string) => Promise<boolean>
}

export function WhatsAppSettings({ initialData, onSave, onTestConnection }: WhatsAppSettingsProps) {
  const [formData, setFormData] = useState<WhatsAppSettingsType>({
    token: initialData?.token || '',
    webhookUrl: initialData?.webhookUrl || '',
    phoneNumberId: initialData?.phoneNumberId || '',
    businessAccountId: initialData?.businessAccountId || '',
    templates: initialData?.templates || [],
    autoResponses: initialData?.autoResponses || []
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [showAutoResponseForm, setShowAutoResponseForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null)
  const [editingAutoResponse, setEditingAutoResponse] = useState<AutoResponse | null>(null)

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    nome: '',
    categoria: '',
    conteudo: '',
    variaveis: [] as string[]
  })

  // Auto response form state
  const [autoResponseForm, setAutoResponseForm] = useState({
    trigger: '',
    response: '',
    active: true
  })

  const [newVariavel, setNewVariavel] = useState('')

  const handleInputChange = (field: keyof WhatsAppSettingsType, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleTestConnection = async () => {
    if (!formData.token || !formData.phoneNumberId) {
      toast.error('Token e Phone Number ID são obrigatórios para testar a conexão')
      return
    }

    setIsTestingConnection(true)
    setConnectionStatus('idle')

    try {
      const isConnected = await onTestConnection?.(formData.token, formData.phoneNumberId)
      setConnectionStatus(isConnected ? 'success' : 'error')
      
      if (isConnected) {
        toast.success('Conexão com WhatsApp estabelecida com sucesso!')
      } else {
        toast.error('Falha ao conectar com WhatsApp. Verifique suas credenciais.')
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error)
      setConnectionStatus('error')
      toast.error('Erro ao testar conexão. Tente novamente.')
    } finally {
      setIsTestingConnection(false)
    }
  }

  // Template management
  const handleAddTemplate = () => {
    if (!templateForm.nome || !templateForm.conteudo) {
      toast.error('Nome e conteúdo são obrigatórios')
      return
    }

    const newTemplate: MessageTemplate = {
      id: editingTemplate?.id || Date.now().toString(),
      nome: templateForm.nome,
      categoria: templateForm.categoria || 'Geral',
      conteudo: templateForm.conteudo,
      variaveis: templateForm.variaveis
    }

    setFormData(prev => ({
      ...prev,
      templates: editingTemplate 
        ? prev.templates.map(t => t.id === editingTemplate.id ? newTemplate : t)
        : [...prev.templates, newTemplate]
    }))

    // Reset form
    setTemplateForm({ nome: '', categoria: '', conteudo: '', variaveis: [] })
    setShowTemplateForm(false)
    setEditingTemplate(null)
    toast.success(editingTemplate ? 'Template atualizado!' : 'Template adicionado!')
  }

  const handleEditTemplate = (template: MessageTemplate) => {
    setTemplateForm({
      nome: template.nome,
      categoria: template.categoria,
      conteudo: template.conteudo,
      variaveis: template.variaveis
    })
    setEditingTemplate(template)
    setShowTemplateForm(true)
  }

  const handleDeleteTemplate = (templateId: string) => {
    setFormData(prev => ({
      ...prev,
      templates: prev.templates.filter(t => t.id !== templateId)
    }))
    toast.success('Template removido!')
  }

  const handleAddVariavel = () => {
    if (newVariavel.trim() && !templateForm.variaveis.includes(newVariavel.trim())) {
      setTemplateForm(prev => ({
        ...prev,
        variaveis: [...prev.variaveis, newVariavel.trim()]
      }))
      setNewVariavel('')
    }
  }

  const handleRemoveVariavel = (variavel: string) => {
    setTemplateForm(prev => ({
      ...prev,
      variaveis: prev.variaveis.filter(v => v !== variavel)
    }))
  }

  // Auto response management
  const handleAddAutoResponse = () => {
    if (!autoResponseForm.trigger || !autoResponseForm.response) {
      toast.error('Gatilho e resposta são obrigatórios')
      return
    }

    const newAutoResponse: AutoResponse = {
      id: editingAutoResponse?.id || Date.now().toString(),
      trigger: autoResponseForm.trigger,
      response: autoResponseForm.response,
      active: autoResponseForm.active
    }

    setFormData(prev => ({
      ...prev,
      autoResponses: editingAutoResponse
        ? prev.autoResponses.map(ar => ar.id === editingAutoResponse.id ? newAutoResponse : ar)
        : [...prev.autoResponses, newAutoResponse]
    }))

    // Reset form
    setAutoResponseForm({ trigger: '', response: '', active: true })
    setShowAutoResponseForm(false)
    setEditingAutoResponse(null)
    toast.success(editingAutoResponse ? 'Resposta automática atualizada!' : 'Resposta automática adicionada!')
  }

  const handleEditAutoResponse = (autoResponse: AutoResponse) => {
    setAutoResponseForm({
      trigger: autoResponse.trigger,
      response: autoResponse.response,
      active: autoResponse.active
    })
    setEditingAutoResponse(autoResponse)
    setShowAutoResponseForm(true)
  }

  const handleDeleteAutoResponse = (autoResponseId: string) => {
    setFormData(prev => ({
      ...prev,
      autoResponses: prev.autoResponses.filter(ar => ar.id !== autoResponseId)
    }))
    toast.success('Resposta automática removida!')
  }

  const handleToggleAutoResponse = (autoResponseId: string) => {
    setFormData(prev => ({
      ...prev,
      autoResponses: prev.autoResponses.map(ar => 
        ar.id === autoResponseId ? { ...ar, active: !ar.active } : ar
      )
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.token) {
      toast.error('Token é obrigatório')
      return
    }
    
    if (!formData.phoneNumberId) {
      toast.error('Phone Number ID é obrigatório')
      return
    }

    setIsLoading(true)
    
    try {
      await onSave?.(formData)
      toast.success('Configurações do WhatsApp salvas com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast.error('Erro ao salvar configurações. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconBrandWhatsapp className="h-5 w-5" />
          Integração WhatsApp Business
        </CardTitle>
        <CardDescription>
          Configure a integração com WhatsApp Business API
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* API Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IconKey className="h-5 w-5" />
              <h3 className="text-lg font-medium">Configuração da API</h3>
            </div>
            
            <div className="space-y-4 pl-7">
              <div className="space-y-2">
                <Label htmlFor="token">Access Token *</Label>
                <Input
                  id="token"
                  type="password"
                  value={formData.token}
                  onChange={(e) => handleInputChange('token', e.target.value)}
                  placeholder="Seu token de acesso do WhatsApp Business"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Token obtido no Facebook Developers Console
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                <Input
         