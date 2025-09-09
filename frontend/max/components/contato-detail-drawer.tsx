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

import { Contato, ConversaMessage } from "@/types"
import { useConversaMessages } from "@/hooks/use-api"

interface ContatoDetailDrawerProps {
  contato: Contato | null
  open: boolean
  onClose: () => void
  onEdit?: (contato: Contato) => void
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
  onClose, 
  onEdit 
}: ContatoDetailDrawerProps) {
  // Fetch conversation messages
  const { 
    data: messages, 
    error: messagesError, 
    isLoading: messagesLoading 
  } = useConversaMessages(contato?.id || null)

  if (!contato) return null

  return (
    <Drawer open={open} onOpenChange={(open) => !open && onClose()}>
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
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(contato)}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Contact Information */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informações de Contato</h3>
                <div className="space-y-3">
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
                </div>
              </div>

              <Separator />

              {/* Additional Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Detalhes do Atendimento</h3>
                <div className="space-y-3">
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
                </div>
              </div>

              <Separator />

              {/* Collected Data */}
              <CollectedDataSection dadosColetados={contato.dadosColetados} />
            </div>

            {/* Conversation History */}
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Histórico de Conversa</h3>
                <Badge variant="outline">
                  <IconMessageCircle className="w-3 h-3 mr-1" />
                  {messages?.length || 0} mensagens
                </Badge>
              </div>

              <div className="flex-1 min-h-0">
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
                  <div className="h-full overflow-y-auto pr-4">
                    <div className="space-y-2">
                      {messages.map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
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