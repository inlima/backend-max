'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { 
  IconBell, 
  IconMail, 
  IconDeviceMobile,
  IconBrandWhatsapp,
  IconClock,
  IconPlus,
  IconX,
  IconSave
} from '@tabler/icons-react'
import type { NotificationSettings as NotificationSettingsType } from '@/types'

interface NotificationSettingsProps {
  initialData?: Partial<NotificationSettingsType>
  onSave?: (data: NotificationSettingsType) => Promise<void>
}

const DIAS_SEMANA = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' }
]

export function NotificationSettings({ initialData, onSave }: NotificationSettingsProps) {
  const [formData, setFormData] = useState<NotificationSettingsType>({
    email: {
      novoContato: initialData?.email?.novoContato ?? true,
      processoAtualizado: initialData?.email?.processoAtualizado ?? true,
      prazoProximo: initialData?.email?.prazoProximo ?? true,
      mensagemRecebida: initialData?.email?.mensagemRecebida ?? false
    },
    push: {
      novoContato: initialData?.push?.novoContato ?? true,
      processoAtualizado: initialData?.push?.processoAtualizado ?? true,
      prazoProximo: initialData?.push?.prazoProximo ?? true
    },
    whatsapp: {
      horarioFuncionamento: {
        inicio: initialData?.whatsapp?.horarioFuncionamento?.inicio || '08:00',
        fim: initialData?.whatsapp?.horarioFuncionamento?.fim || '18:00',
        diasSemana: initialData?.whatsapp?.horarioFuncionamento?.diasSemana || [1, 2, 3, 4, 5]
      },
      mensagemAutomatica: initialData?.whatsapp?.mensagemAutomatica ?? true,
      respostaRapida: initialData?.whatsapp?.respostaRapida || []
    }
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [newRespostaRapida, setNewRespostaRapida] = useState('')

  const handleEmailChange = (field: keyof NotificationSettingsType['email'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      email: {
        ...prev.email,
        [field]: value
      }
    }))
  }

  const handlePushChange = (field: keyof NotificationSettingsType['push'], value: boolean) => {
    setFormData(prev => ({
      ...prev,
      push: {
        ...prev.push,
        [field]: value
      }
    }))
  }

  const handleWhatsAppChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      whatsapp: {
        ...prev.whatsapp,
        [field]: value
      }
    }))
  }

  const handleHorarioChange = (field: 'inicio' | 'fim', value: string) => {
    setFormData(prev => ({
      ...prev,
      whatsapp: {
        ...prev.whatsapp,
        horarioFuncionamento: {
          ...prev.whatsapp.horarioFuncionamento,
          [field]: value
        }
      }
    }))
  }

  const handleDiasSemanaChange = (dia: number, checked: boolean) => {
    setFormData(prev => {
      const diasSemana = checked 
        ? [...prev.whatsapp.horarioFuncionamento.diasSemana, dia].sort()
        : prev.whatsapp.horarioFuncionamento.diasSemana.filter(d => d !== dia)
      
      return {
        ...prev,
        whatsapp: {
          ...prev.whatsapp,
          horarioFuncionamento: {
            ...prev.whatsapp.horarioFuncionamento,
            diasSemana
          }
        }
      }
    })
  }

  const handleAddRespostaRapida = () => {
    if (newRespostaRapida.trim() && !formData.whatsapp.respostaRapida.includes(newRespostaRapida.trim())) {
      setFormData(prev => ({
        ...prev,
        whatsapp: {
          ...prev.whatsapp,
          respostaRapida: [...prev.whatsapp.respostaRapida, newRespostaRapida.trim()]
        }
      }))
      setNewRespostaRapida('')
    }
  }

  const handleRemoveRespostaRapida = (resposta: string) => {
    setFormData(prev => ({
      ...prev,
      whatsapp: {
        ...prev.whatsapp,
        respostaRapida: prev.whatsapp.respostaRapida.filter(r => r !== resposta)
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate horário de funcionamento
    if (formData.whatsapp.horarioFuncionamento.inicio >= formData.whatsapp.horarioFuncionamento.fim) {
      toast.error('Horário de início deve ser anterior ao horário de fim')
      return
    }
    
    if (formData.whatsapp.horarioFuncionamento.diasSemana.length === 0) {
      toast.error('Selecione pelo menos um dia da semana')
      return
    }

    setIsLoading(true)
    
    try {
      await onSave?.(formData)
      toast.success('Configurações de notificação salvas com sucesso!')
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
          <IconBell className="h-5 w-5" />
          Configurações de Notificação
        </CardTitle>
        <CardDescription>
          Configure como e quando você deseja receber notificações
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IconMail className="h-5 w-5" />
              <h3 className="text-lg font-medium">Notificações por Email</h3>
            </div>
            
            <div className="space-y-3 pl-7">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-novo-contato">Novo contato</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber email quando um novo contato for criado
                  </p>
                </div>
                <Switch
                  id="email-novo-contato"
                  checked={formData.email.novoContato}
                  onCheckedChange={(checked) => handleEmailChange('novoContato', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-processo-atualizado">Processo atualizado</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber email quando um processo for atualizado
                  </p>
                </div>
                <Switch
                  id="email-processo-atualizado"
                  checked={formData.email.processoAtualizado}
                  onCheckedChange={(checked) => handleEmailChange('processoAtualizado', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-prazo-proximo">Prazo próximo</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber email quando um prazo estiver próximo
                  </p>
                </div>
                <Switch
                  id="email-prazo-proximo"
                  checked={formData.email.prazoProximo}
                  onCheckedChange={(checked) => handleEmailChange('prazoProximo', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-mensagem-recebida">Mensagem recebida</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber email para cada nova mensagem do WhatsApp
                  </p>
                </div>
                <Switch
                  id="email-mensagem-recebida"
                  checked={formData.email.mensagemRecebida}
                  onCheckedChange={(checked) => handleEmailChange('mensagemRecebida', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Push Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IconDeviceMobile className="h-5 w-5" />
              <h3 className="text-lg font-medium">Notificações Push</h3>
            </div>
            
            <div className="space-y-3 pl-7">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-novo-contato">Novo contato</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificação push para novos contatos
                  </p>
                </div>
                <Switch
                  id="push-novo-contato"
                  checked={formData.push.novoContato}
                  onCheckedChange={(checked) => handlePushChange('novoContato', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-processo-atualizado">Processo atualizado</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificação push para atualizações de processo
                  </p>
                </div>
                <Switch
                  id="push-processo-atualizado"
                  checked={formData.push.processoAtualizado}
                  onCheckedChange={(checked) => handlePushChange('processoAtualizado', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-prazo-proximo">Prazo próximo</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificação push para prazos próximos
                  </p>
                </div>
                <Switch
                  id="push-prazo-proximo"
                  checked={formData.push.prazoProximo}
                  onCheckedChange={(checked) => handlePushChange('prazoProximo', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* WhatsApp Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IconBrandWhatsapp className="h-5 w-5" />
              <h3 className="text-lg font-medium">Configurações do WhatsApp</h3>
            </div>
            
            <div className="space-y-4 pl-7">
              {/* Horário de Funcionamento */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <IconClock className="h-4 w-4" />
                  <Label>Horário de Funcionamento</Label>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="horario-inicio">Início</Label>
                    <Input
                      id="horario-inicio"
                      type="time"
                      value={formData.whatsapp.horarioFuncionamento.inicio}
                      onChange={(e) => handleHorarioChange('inicio', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horario-fim">Fim</Label>
                    <Input
                      id="horario-fim"
                      type="time"
                      value={formData.whatsapp.horarioFuncionamento.fim}
                      onChange={(e) => handleHorarioChange('fim', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Dias da Semana</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {DIAS_SEMANA.map((dia) => (
                      <div key={dia.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dia-${dia.value}`}
                          checked={formData.whatsapp.horarioFuncionamento.diasSemana.includes(dia.value)}
                          onCheckedChange={(checked) => 
                            handleDiasSemanaChange(dia.value, checked as boolean)
                          }
                        />
                        <Label htmlFor={`dia-${dia.value}`} className="text-sm">
                          {dia.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Mensagem Automática */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mensagem-automatica">Mensagem automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar mensagem automática fora do horário de funcionamento
                  </p>
                </div>
                <Switch
                  id="mensagem-automatica"
                  checked={formData.whatsapp.mensagemAutomatica}
                  onCheckedChange={(checked) => handleWhatsAppChange('mensagemAutomatica', checked)}
                />
              </div>
              
              {/* Respostas Rápidas */}
              <div className="space-y-3">
                <Label>Respostas Rápidas</Label>
                <p className="text-sm text-muted-foreground">
                  Configure mensagens pré-definidas para respostas rápidas
                </p>
                
                <div className="flex gap-2">
                  <Input
                    value={newRespostaRapida}
                    onChange={(e) => setNewRespostaRapida(e.target.value)}
                    placeholder="Digite uma resposta rápida..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddRespostaRapida()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddRespostaRapida}
                    disabled={!newRespostaRapida.trim()}
                  >
                    <IconPlus className="h-4 w-4" />
                  </Button>
                </div>
                
                {formData.whatsapp.respostaRapida.length > 0 && (
                  <div className="space-y-2">
                    {formData.whatsapp.respostaRapida.map((resposta, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{resposta}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRespostaRapida(resposta)}
                        >
                          <IconX className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading}>
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
        </form>
      </CardContent>
    </Card>
  )
}