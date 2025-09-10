"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { 
  IconFileDescription, 
  IconEdit, 
  IconCalendar, 
  IconUser, 
  IconPhone,
  IconClock,
  IconAlertTriangle,
  IconFileText,
  IconNotes,
  IconHistory,
  IconUpload
} from "@tabler/icons-react"
import { DocumentUpload } from "@/components/document-upload"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Processo } from "@/types"

interface ProcessoDetailDrawerProps {
  processo: Processo
  open: boolean
  onOpenChange: (open: boolean) => void
  isEditMode?: boolean
  onSuccess?: () => void
}

// Status badge component
function StatusBadge({ status }: { status: Processo['status'] }) {
  const variants = {
    novo: { variant: "default" as const, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
    em_andamento: { variant: "default" as const, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
    aguardando_cliente: { variant: "default" as const, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
    finalizado: { variant: "outline" as const, color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
    arquivado: { variant: "secondary" as const, color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  }

  const config = variants[status] || variants.novo

  return (
    <Badge variant={config.variant} className={config.color}>
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
    baixa: { variant: "outline" as const, color: "text-green-700 border-green-300" },
    media: { variant: "outline" as const, color: "text-blue-700 border-blue-300" },
    alta: { variant: "default" as const, color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
    urgente: { variant: "destructive" as const, color: "" },
  }

  const config = variants[prioridade] || variants.media

  return (
    <Badge variant={config.variant} className={config.color}>
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
    variant = "default"
    color = "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
  } else if (diffDays <= 7) {
    variant = "default"
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

export function ProcessoDetailDrawer({
  processo,
  open,
  onOpenChange,
  isEditMode = false,
  onSuccess,
}: ProcessoDetailDrawerProps) {
  const dataAbertura = new Date(processo.dataAbertura)
  const dataUltimaAtualizacao = new Date(processo.dataUltimaAtualizacao)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <SheetTitle className="flex items-center gap-2">
                <IconFileDescription className="h-5 w-5" />
                {processo.titulo}
              </SheetTitle>
              {processo.numero && (
                <SheetDescription>
                  Processo nº {processo.numero}
                </SheetDescription>
              )}
            </div>
            <Button variant="outline" size="sm">
              <IconEdit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status and Priority */}
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={processo.status} />
            <PrioridadeBadge prioridade={processo.prioridade} />
            {processo.prazoLimite && <PrazoIndicator prazoLimite={processo.prazoLimite} />}
            <Badge variant="outline">{processo.areaJuridica}</Badge>
          </div>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <IconUser className="h-4 w-4 text-muted-foreground" />
                    <span>{processo.contato.nome}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <IconPhone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{processo.contato.telefone}</span>
                  </div>
                </div>
                
                {processo.advogadoResponsavel && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Advogado Responsável</label>
                    <p className="mt-1">{processo.advogadoResponsavel}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Abertura</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <IconCalendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(dataAbertura, "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Última Atualização</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <IconClock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDistanceToNow(dataUltimaAtualizacao, { addSuffix: true, locale: ptBR })}</span>
                  </div>
                </div>
              </div>
              
              {processo.descricao && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                  <p className="mt-1 text-sm">{processo.descricao}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs for detailed information */}
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="prazos">Prazos</TabsTrigger>
              <TabsTrigger value="anotacoes">Anotações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconHistory className="h-5 w-5" />
                    Timeline do Processo
                  </CardTitle>
                  <CardDescription>
                    Histórico completo de eventos e atualizações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {processo.historico.length > 0 ? (
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
                        
                        {processo.historico.map((evento, index) => {
                          const isLast = index === processo.historico.length - 1
                          return (
                            <div key={evento.id} className="relative flex space-x-4 pb-6">
                              {/* Timeline dot */}
                              <div className="flex-shrink-0 relative">
                                <div className="w-8 h-8 bg-background border-2 border-primary rounded-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                                </div>
                              </div>
                              
                              {/* Event content */}
                              <div className="flex-1 min-w-0 pb-4">
                                <div className="bg-muted/50 rounded-lg p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="text-sm font-medium">{evento.acao}</h4>
                                    <time className="text-xs text-muted-foreground">
                                      {format(new Date(evento.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                    </time>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{evento.descricao}</p>
                                  <div className="flex items-center space-x-2">
                                    <IconUser className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{evento.usuario}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <IconHistory className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Timeline vazio</h3>
                        <p className="text-muted-foreground mb-4">
                          Nenhum evento foi registrado ainda para este processo
                        </p>
                        <Button variant="outline">
                          <IconHistory className="h-4 w-4 mr-2" />
                          Adicionar Evento
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="documentos" className="space-y-4">
              <DocumentUpload
                processoId={processo.id}
                existingDocuments={processo.documentos.map(doc => ({
                  id: doc.id,
                  file: new File([], doc.nome),
                  name: doc.nome,
                  size: 0,
                  type: doc.tipo,
                  category: 'outros',
                  tags: [],
                  uploadProgress: 100,
                  uploaded: true,
                  url: doc.url,
                  uploadedAt: new Date(doc.uploadedAt),
                  uploadedBy: doc.uploadedBy
                }))}
                onUpload={(files) => {
                  console.log('Files uploaded:', files)
                  // Handle file upload
                }}
                onDelete={(documentId) => {
                  console.log('Document deleted:', documentId)
                  // Handle file deletion
                }}
              />
            </TabsContent>
            
            <TabsContent value="prazos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconCalendar className="h-5 w-5" />
                    Prazos e Deadlines
                  </CardTitle>
                  <CardDescription>
                    Gerenciamento de prazos processuais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {processo.prazoLimite ? (
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Prazo Principal</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(processo.prazoLimite), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <PrazoIndicator prazoLimite={processo.prazoLimite} />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <IconCalendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhum prazo definido</p>
                        <Button variant="outline" className="mt-4">
                          Adicionar Prazo
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="anotacoes" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <IconNotes className="h-5 w-5" />
                        Anotações
                      </CardTitle>
                      <CardDescription>
                        Notas e observações sobre o processo
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                      <IconNotes className="h-4 w-4 mr-2" />
                      Nova Anotação
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {processo.observacoes ? (
                      <div className="space-y-4">
                        {/* Main observation */}
                        <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-sm font-medium">Observação Principal</h4>
                            <time className="text-xs text-muted-foreground">
                              {format(dataAbertura, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </time>
                          </div>
                          <p className="text-sm text-muted-foreground">{processo.observacoes}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <IconUser className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {processo.advogadoResponsavel || 'Sistema'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Additional notes placeholder */}
                        <div className="text-center py-6 border-2 border-dashed border-muted rounded-lg">
                          <IconNotes className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground mb-3">
                            Adicione mais anotações para acompanhar o progresso
                          </p>
                          <Button variant="outline" size="sm">
                            Adicionar Anotação
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
                        <IconNotes className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Nenhuma anotação registrada</h3>
                        <p className="text-muted-foreground mb-4">
                          Adicione anotações para acompanhar o desenvolvimento do processo
                        </p>
                        <Button variant="outline">
                          <IconNotes className="h-4 w-4 mr-2" />
                          Primeira Anotação
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}