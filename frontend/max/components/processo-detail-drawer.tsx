"use client"

import * as React from "react"
import { formatDistanceToNow, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  IconX,
  IconPhone,
  IconClock,
  IconUser,
  IconBrandWhatsapp,
  IconEdit,
  IconCalendar,
  IconFileDescription,
  IconCheck,
  IconArrowRight,
  IconAlertTriangle,
  IconDownload,
  IconEye,
  IconHistory,
  IconScale,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { Processo, ConversaMessage } from "@/types"
import { useConversaMessages } from "@/hooks/use-api"

interface ProcessoDetailDrawerProps {
  processo: Processo | null
  open: boolean
  onClose: () => void
  onEdit?: (processo: Processo) => void
}

// Status badge component
function StatusBadge({ status }: { status: Processo['status'] }) {
  const variants = {
    novo: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
    em_andamento: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
    aguardando_cliente: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
    finalizado: { color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
    arquivado: { color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  }

  const config = variants[status] || variants.novo

  return (
    <Badge className={config.color}>
      {status === 'novo' && 'Novo'}
      {status === 'em_andamento' && 'Em Andamento'}
      {status === 'aguardando_cliente' && 'Aguardando Cliente'}
      {status === 'finalizado' && 'Finalizado'}
      {status === 'arquivado' && 'Arquivado'}
    </Badge>
  )
}

// Prioridade badge component
function PrioridadeBadge({ prioridade }: { prioridade: Processo['prioridade'] }) {
  const variants = {
    baixa: { color: "text-green-700 border-green-300" },
    media: { color: "text-blue-700 border-blue-300" },
    alta: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
    urgente: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  }

  const config = variants[prioridade] || variants.media

  return (
    <Badge variant="outline" className={config.color}>
      {prioridade === 'urgente' && <IconAlertTriangle className="w-3 h-3 mr-1" />}
      {prioridade === 'baixa' && 'Baixa'}
      {prioridade === 'media' && 'Média'}
      {prioridade === 'alta' && 'Alta'}
      {prioridade === 'urgente' && 'Urgente'}
    </Badge>
  )
}

// Prazo indicator
function PrazoIndicator({ prazoLimite }: { prazoLimite?: Date }) {
  if (!prazoLimite) return null
  
  const now = new Date()
  const prazo = new Date(prazoLimite)
  const diffDays = Math.ceil((prazo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  let variant: "default" | "destructive" | "secondary" = "default"
  let color = ""
  
  if (diffDays < 0) {
    variant = "destructive"
  } else if (diffDays <= 3) {
    color = "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
  } else if (diffDays <= 7) {
    color = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
  } else {
    variant = "secondary"
  }
  
  return (
    <Badge variant={variant} className={color}>
      <IconCalendar className="w-3 h-3 mr-1" />
      {diffDays < 0 ? `${Math.abs(diffDays)}d atrasado` : `${diffDays}d restantes`}
    </Badge>
  )
}

// Document item component
function DocumentItem({ documento }: { documento: Processo['documentos'][0] }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <IconFileDescription className="w-4 h-4 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">{documento.nome}</p>
          <p className="text-xs text-muted-foreground">
            {documento.tipo} • {format(new Date(documento.uploadedAt), 'dd/MM/yyyy', { locale: ptBR })} • {documento.uploadedBy}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          <IconEye className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <IconDownload className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// History item component
function HistoryItem({ item }: { item: Processo['historico'][0] }) {
  return (
    <div className="flex gap-3 pb-3">
      <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2"></div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{item.acao}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(item.timestamp), 'dd/MM HH:mm', { locale: ptBR })}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{item.descricao}</p>
        <p className="text-xs text-muted-foreground">por {item.usuario}</p>
      </div>
    </div>
  )
}

// Message component for WhatsApp interactions
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

export function ProcessoDetailDrawer({ 
  processo, 
  open, 
  onClose, 
  onEdit 
}: ProcessoDetailDrawerProps) {
  // Fetch WhatsApp messages related to this process (via contact)
  const { 
    data: messages, 
    error: messagesError, 
    isLoading: messagesLoading 
  } = useConversaMessages(processo?.contatoId || null)

  if (!processo) return null

  return (
    <Drawer open={open} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DrawerTitle className="text-xl">{processo.titulo}</DrawerTitle>
              <DrawerDescription className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={processo.status} />
                <PrioridadeBadge prioridade={processo.prioridade} />
                <Badge variant="outline" className={processo.origem === 'whatsapp' ? 'text-green-700 border-green-300' : 'text-blue-700 border-blue-300'}>
                  {processo.origem === 'whatsapp' ? (
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
                <PrazoIndicator prazoLimite={processo.prazoLimite} />
              </DrawerDescription>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(processo)}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Process Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconScale className="w-5 h-5" />
                    Informações do Processo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {processo.numero && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Número do Processo:</span>
                      <Badge variant="outline">{processo.numero}</Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Área Jurídica:</span>
                    <Badge variant="outline">{processo.areaJuridica}</Badge>
                  </div>
                  {processo.advogadoResponsavel && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Advogado Responsável:</span>
                      <span>{processo.advogadoResponsavel}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Data de Abertura:</span>
                    <span>{format(new Date(processo.dataAbertura), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Última Atualização:</span>
                    <span>
                      {formatDistanceToNow(new Date(processo.dataUltimaAtualizacao), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                  </div>
                  {processo.prazoLimite && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Prazo Limite:</span>
                      <span>{format(new Date(processo.prazoLimite), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Client Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconUser className="w-5 h-5" />
                    Informações do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <IconUser className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{processo.contato.nome}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <IconPhone className="w-4 h-4 text-muted-foreground" />
                    <span>{processo.contato.telefone}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              {processo.descricao && (
                <Card>
                  <CardHeader>
                    <CardTitle>Descrição</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{processo.descricao}</p>
                  </CardContent>
                </Card>
              )}

              {/* Observations */}
              {processo.observacoes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{processo.observacoes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <IconFileDescription className="w-5 h-5" />
                      Documentos ({processo.documentos.length})
                    </span>
                    <Button variant="outline" size="sm">
                      <IconFileDescription className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {processo.documentos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum documento anexado
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {processo.documentos.map((documento) => (
                        <DocumentItem key={documento.id} documento={documento} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - History and WhatsApp */}
            <div className="space-y-6 h-full flex flex-col">
              {/* Process History */}
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconHistory className="w-5 h-5" />
                    Histórico ({processo.historico.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {processo.historico.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum histórico disponível
                    </p>
                  ) : (
                    <div className="space-y-4 max-h-64 overflow-y-auto">
                      {processo.historico
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((item) => (
                          <HistoryItem key={item.id} item={item} />
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* WhatsApp Interactions */}
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconBrandWhatsapp className="w-5 h-5" />
                    Interações WhatsApp
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                      <p className="text-muted-foreground text-sm">
                        Erro ao carregar mensagens
                      </p>
                    </div>
                  ) : !messages || messages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground text-sm">
                        Nenhuma interação via WhatsApp
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      <div className="space-y-2">
                        {messages
                          .slice(-10) // Show last 10 messages
                          .map((message) => (
                            <MessageBubble key={message.id} message={message} />
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <DrawerFooter className="pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              ID: {processo.id}
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