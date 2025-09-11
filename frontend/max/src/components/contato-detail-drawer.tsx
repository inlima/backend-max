"use client"

import * as React from "react"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  IconX,
  IconPhone,
  IconMail,
  IconClock,
  IconMessageCircle,
  IconUser,
  IconBrandWhatsapp,
  IconEdit,
  IconCalendar,
  IconMapPin,
  IconFileText,
  IconCheck,
  IconArrowRight,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Contato, ConversaMessage, Processo, TimelineEvent } from "@/types"
import { useUpdateContato, useContatoConversations, useContatoProcesses } from "@/hooks/use-react-query"
import { toast } from "sonner"

interface ContatoDetailDrawerProps {
  contato: Contato | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onContatoUpdated?: () => void
}

// Status badge component
function StatusBadge({ status }: { status: Contato['status'] }) {
  const variants = {
    novo: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
    existente: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
    em_atendimento: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
    finalizado: { color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
  }

  const config = variants[status] || variants.novo

  return (
    <Badge className={config.color}>
      {status === 'novo' && 'Novo'}
      {status === 'existente' && 'Existente'}
      {status === 'em_atendimento' && 'Em Atendimento'}
      {status === 'finalizado' && 'Finalizado'}
    </Badge>
  )
}

// Message component
function MessageBubble({ message }: { message: ConversaMessage }) {
  const isInbound = message.direction === 'inbound'
  
  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isInbound
            ? 'bg-muted text-foreground'
            : 'bg-primary text-primary-foreground'
        }`}
      >
        <p className="text-sm">{message.content}</p>
        <p className={`text-xs mt-1 ${
          isInbound ? 'text-muted-foreground' : 'text-primary-foreground/70'
        }`}>
          {format(new Date(message.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
        </p>
      </div>
    </div>
  )
}

// Collected data display component
function CollectedDataSection({ dadosColetados }: { dadosColetados: Contato['dadosColetados'] }) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm">Dados Coletados pelo Bot</h4>
      <div className="grid grid-cols-1 gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Tipo de Cliente:</span>
          <Badge variant="outline">
            {dadosColetados.clienteType === 'novo' ? 'Novo Cliente' : 'Cliente Existente'}
          </Badge>
        </div>
        
        {dadosColetados.practiceArea && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Área de Prática:</span>
            <Badge variant="outline">{dadosColetados.practiceArea}</Badge>
          </div>
        )}
        
        {dadosColetados.schedulingPreference && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Preferência de Atendimento:</span>
            <Badge variant="outline">
              {dadosColetados.schedulingPreference === 'presencial' ? 'Presencial' : 'Online'}
            </Badge>
          </div>
        )}
        
        {dadosColetados.wantsScheduling !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Deseja Agendamento:</span>
            <Badge variant={dadosColetados.wantsScheduling ? "default" : "secondary"}>
              {dadosColetados.wantsScheduling ? 'Sim' : 'Não'}
            </Badge>
          </div>
        )}
        
        {dadosColetados.customRequests && dadosColetados.customRequests.length > 0 && (
          <div className="space-y-2">
            <span className="text-muted-foreground">Solicitações Específicas:</span>
            <div className="space-y-1">
              {dadosColetados.customRequests.map((request, index) => (
                <div key={index} className="flex items-start gap-2">
                  <IconArrowRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                  <span className="text-sm">{request}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ContatoDetailDrawer({ 
  contato, 
  open, 
  onOpenChange, 
  onContatoUpdated 
}: ContatoDetailDrawerProps) {
  const [activeTab, setActiveTab] = React.useState("informacoes")
  const [isEditing, setIsEditing] = React.useState(false)
  const [editData, setEditData] = React.useState<Partial<Contato>>({})

  // Fetch conversation messages
  const { 
    data: messages, 
    error: messagesError, 
    isLoading: messagesLoading 
  } = useContatoConversations(contato?.id || '')

  // Fetch related processes
  const { 
    data: processos, 
    error: processosError, 
    isLoading: processosLoading 
  } = useContatoProcesses(contato?.id || "")

  // Update contato mutation
  const { trigger: updateContato, isMutating: isUpdating } = useUpdateContato()

  // Initialize edit data when contato changes
  React.useEffect(() => {
    if (contato) {
      setEditData({
        nome: contato.nome,
        telefone: contato.telefone,
        email: contato.email || "",
        areaInteresse: contato.areaInteresse || "",
        status: contato.status,
      })
    }
  }, [contato])

  const handleSaveEdit = async () => {
    if (!contato) return

    try {
      await updateContato({ id: contato.id, ...editData })
      setIsEditing(false)
      onContatoUpdated?.()
      toast.success("Contato atualizado com sucesso!")
    } catch (error) {
      toast.error("Erro ao atualizar contato")
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (contato) {
      setEditData({
        nome: contato.nome,
        telefone: contato.telefone,
        email: contato.email || "",
        areaInteresse: contato.areaInteresse || "",
        status: contato.status,
      })
    }
  }

  // Generate mock timeline events
  const timelineEvents: TimelineEvent[] = React.useMemo(() => {
    if (!contato) return []
    
    const events: TimelineEvent[] = [
      {
        id: "1",
        tipo: "criacao",
        titulo: "Contato criado",
        descricao: `Contato ${contato.nome} foi criado no sistema`,
        usuario: "Sistema",
        timestamp: new Date(contato.primeiroContato),
      }
    ]

    if (contato.ultimaInteracao !== contato.primeiroContato) {
      events.push({
        id: "2",
        tipo: "atualizacao",
        titulo: "Última interação",
        descricao: "Última atividade registrada",
        usuario: contato.atendente || "Sistema",
        timestamp: new Date(contato.ultimaInteracao),
      })
    }

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [contato])

  if (!contato) return null

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DrawerTitle className="text-xl">{contato.nome}</DrawerTitle>
              <DrawerDescription className="flex items-center gap-2">
                <StatusBadge status={contato.status} />
                <Badge variant="outline" className={contato.origem === 'whatsapp' ? 'text-green-700 border-green-300' : 'text-blue-700 border-blue-300'}>
                  {contato.origem === 'whatsapp' ? (
                    <>
                      <IconBrandWhatsapp className="w-3 h-3 mr-1" />
                      WhatsApp
                    </>
                  ) : (
                    <>
                      <IconUser className="w-3 h-3 mr-1" />
                      Manual
                    </>
                  )}
                </Badge>
                {contato.mensagensNaoLidas > 0 && (
                  <Badge variant="destructive">
                    {contato.mensagensNaoLidas} não lidas
                  </Badge>
                )}
              </DrawerDescription>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Salvando..." : "Salvar"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <IconEdit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
              <DrawerClose asChild>
                <Button variant="outline" size="sm">
                  <IconX className="w-4 h-4" />
                </Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-hidden px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="informacoes">Informações</TabsTrigger>
              <TabsTrigger value="conversas">Conversas</TabsTrigger>
              <TabsTrigger value="processos">Processos</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-4 overflow-hidden">
              <TabsContent value="informacoes" className="h-full overflow-y-auto">
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Informações Básicas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isEditing ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-nome">Nome</Label>
                              <Input
                                id="edit-nome"
                                value={editData.nome || ""}
                                onChange={(e) => setEditData({ ...editData, nome: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-telefone">Telefone</Label>
                              <Input
                                id="edit-telefone"
                                value={editData.telefone || ""}
                                onChange={(e) => setEditData({ ...editData, telefone: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                              id="edit-email"
                              type="email"
                              value={editData.email || ""}
                              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-area">Área de Interesse</Label>
                            <Input
                              id="edit-area"
                              value={editData.areaInteresse || ""}
                              onChange={(e) => setEditData({ ...editData, areaInteresse: e.target.value })}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <IconPhone className="w-4 h-4 text-muted-foreground" />
                            <span>{contato.telefone}</span>
                          </div>
                          {contato.email && (
                            <div className="flex items-center gap-3">
                              <IconMail className="w-4 h-4 text-muted-foreground" />
                              <span>{contato.email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <IconCalendar className="w-4 h-4 text-muted-foreground" />
                            <span>
                              Primeiro contato: {format(new Date(contato.primeiroContato), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <IconClock className="w-4 h-4 text-muted-foreground" />
                            <span>
                              Última interação: {formatDistanceToNow(new Date(contato.ultimaInteracao), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Service Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Detalhes do Atendimento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {contato.areaInteresse && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Área de Interesse:</span>
                          <Badge variant="outline">{contato.areaInteresse}</Badge>
                        </div>
                      )}
                      {contato.tipoSolicitacao && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Tipo de Solicitação:</span>
                          <Badge variant="outline">
                            {contato.tipoSolicitacao === 'agendamento' && 'Agendamento'}
                            {contato.tipoSolicitacao === 'consulta' && 'Consulta'}
                            {contato.tipoSolicitacao === 'informacao' && 'Informação'}
                          </Badge>
                        </div>
                      )}
                      {contato.preferenciaAtendimento && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Preferência de Atendimento:</span>
                          <Badge variant="outline">
                            {contato.preferenciaAtendimento === 'presencial' ? 'Presencial' : 'Online'}
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Conversa Completa:</span>
                        <Badge variant={contato.conversaCompleta ? "default" : "secondary"}>
                          {contato.conversaCompleta ? (
                            <>
                              <IconCheck className="w-3 h-3 mr-1" />
                              Sim
                            </>
                          ) : (
                            'Em andamento'
                          )}
                        </Badge>
                      </div>
                      {contato.atendente && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Atendente:</span>
                          <span>{contato.atendente}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Collected Data */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Dados Coletados pelo Bot</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CollectedDataSection dadosColetados={contato.dadosColetados} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="conversas" className="h-full overflow-hidden">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconMessageCircle className="w-5 h-5" />
                      Histórico de Conversas
                      <Badge variant="outline">
                        {messages?.length || 0} mensagens
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden">
                    {messagesLoading ? (
                      <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        ))}
                      </div>
                    ) : messagesError ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          Erro ao carregar mensagens
                        </p>
                      </div>
                    ) : !messages || messages.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          Nenhuma mensagem encontrada
                        </p>
                      </div>
                    ) : (
                      <div className="h-full overflow-y-auto">
                        <div className="space-y-2">
                          {messages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="processos" className="h-full overflow-y-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconFileText className="w-5 h-5" />
                      Processos Relacionados
                      <Badge variant="outline">
                        {processos?.length || 0} processos
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {processosLoading ? (
                      <div className="space-y-4">
                        {[...Array(2)].map((_, i) => (
                          <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        ))}
                      </div>
                    ) : processosError ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          Erro ao carregar processos
                        </p>
                      </div>
                    ) : !processos || processos.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          Nenhum processo relacionado encontrado
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {processos.map((processo: any) => (
                          <Card key={processo.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <h4 className="font-medium">{processo.titulo}</h4>
                                {processo.numero && (
                                  <p className="text-sm text-muted-foreground">
                                    Nº {processo.numero}
                                  </p>
                                )}
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{processo.status}</Badge>
                                  <Badge variant="secondary">{processo.areaJuridica}</Badge>
                                </div>
                              </div>
                              <Button variant="outline" size="sm">
                                Ver Detalhes
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="h-full overflow-y-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconClock className="w-5 h-5" />
                      Timeline de Interações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {timelineEvents.map((event, index) => (
                        <div key={event.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 bg-primary rounded-full"></div>
                            {index < timelineEvents.length - 1 && (
                              <div className="w-px h-12 bg-border mt-2"></div>
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">{event.titulo}</h4>
                              <span className="text-xs text-muted-foreground">
                                {format(event.timestamp, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{event.descricao}</p>
                            <p className="text-xs text-muted-foreground">por {event.usuario}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DrawerFooter className="pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              ID: {contato.id}
            </div>
            <DrawerClose asChild>
              <Button variant="outline">Fechar</Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}