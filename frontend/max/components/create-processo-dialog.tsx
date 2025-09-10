"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon, X } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { Processo, Contato } from "@/types"
import { toast } from "sonner"

const processoFormSchema = z.object({
  titulo: z.string().min(1, "Título é obrigatório"),
  numero: z.string().optional(),
  descricao: z.string().optional(),
  contatoId: z.string().min(1, "Cliente é obrigatório"),
  areaJuridica: z.string().min(1, "Área jurídica é obrigatória"),
  status: z.enum(['novo', 'em_andamento', 'aguardando_cliente', 'finalizado', 'arquivado']),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']),
  advogadoResponsavel: z.string().optional(),
  prazoLimite: z.date().optional(),
  observacoes: z.string().optional(),
})

type ProcessoFormValues = z.infer<typeof processoFormSchema>

interface CreateProcessoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const AREAS_JURIDICAS = [
  "Direito Civil",
  "Direito Penal", 
  "Direito Trabalhista",
  "Direito Empresarial",
  "Direito de Família",
  "Direito Imobiliário",
  "Direito Tributário",
  "Direito do Consumidor",
  "Direito Previdenciário",
  "Direito Administrativo",
]

const ADVOGADOS = [
  "Dr. João Silva",
  "Dra. Maria Santos",
  "Dr. Pedro Oliveira", 
  "Dra. Ana Costa",
  "Dr. Carlos Ferreira",
]

export function CreateProcessoDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProcessoDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [contatos, setContatos] = React.useState<Contato[]>([])
  const [contatoSearch, setContatoSearch] = React.useState("")

  const form = useForm<ProcessoFormValues>({
    resolver: zodResolver(processoFormSchema),
    defaultValues: {
      titulo: "",
      numero: "",
      descricao: "",
      contatoId: "",
      areaJuridica: "",
      status: "novo",
      prioridade: "media",
      advogadoResponsavel: "",
      observacoes: "",
    },
  })

  // Load contatos for selection
  React.useEffect(() => {
    const loadContatos = async () => {
      try {
        const response = await apiClient.getContatos({ search: contatoSearch })
        setContatos(response.data)
      } catch (error) {
        console.error('Error loading contatos:', error)
      }
    }

    if (open) {
      loadContatos()
    }
  }, [open, contatoSearch])

  const onSubmit = async (data: ProcessoFormValues) => {
    setIsLoading(true)
    try {
      await apiClient.createProcesso({
        ...data,
        dataAbertura: new Date(),
        dataUltimaAtualizacao: new Date(),
        origem: 'manual',
        documentos: [],
        historico: [],
      })
      
      toast.success("Processo criado com sucesso!")
      form.reset()
      onSuccess()
    } catch (error) {
      toast.error("Erro ao criar processo")
      console.error('Error creating processo:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Processo</DialogTitle>
          <DialogDescription>
            Preencha as informações do novo processo jurídico.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Título */}
              <FormField
                control={form.control}
                name="titulo"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Título do Processo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Ação de Cobrança - João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Número */}
              <FormField
                control={form.control}
                name="numero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Processo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 1234567-89.2024.8.26.0001" {...field} />
                    </FormControl>
                    <FormDescription>
                      Número oficial do processo (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cliente */}
              <FormField
                control={form.control}
                name="contatoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Buscar cliente por nome ou telefone..."
                            value={contatoSearch}
                            onChange={(e) => setContatoSearch(e.target.value)}
                          />
                        </div>
                        <Button type="button" variant="outline" size="sm">
                          Novo Cliente
                        </Button>
                      </div>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contatos.length > 0 ? (
                            contatos.map((contato) => (
                              <SelectItem key={contato.id} value={contato.id}>
                                <div className="flex flex-col">
                                  <span>{contato.nome}</span>
                                  <span className="text-xs text-muted-foreground">{contato.telefone}</span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>
                              {contatoSearch ? 'Nenhum cliente encontrado' : 'Digite para buscar clientes'}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormDescription>
                      Busque por nome ou telefone, ou crie um novo cliente
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Área Jurídica */}
              <FormField
                control={form.control}
                name="areaJuridica"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área Jurídica *</FormLabel>
                    <div className="space-y-2">
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a área" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AREAS_JURIDICAS.map((area) => (
                            <SelectItem key={area} value={area}>
                              {area}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">Outra área (personalizada)</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {field.value === 'custom' && (
                        <Input
                          placeholder="Digite a área jurídica personalizada..."
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      )}
                    </div>
                    <FormDescription>
                      Selecione uma área padrão ou digite uma personalizada
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="novo">Novo</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                        <SelectItem value="finalizado">Finalizado</SelectItem>
                        <SelectItem value="arquivado">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prioridade */}
              <FormField
                control={form.control}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Advogado Responsável */}
              <FormField
                control={form.control}
                name="advogadoResponsavel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advogado Responsável</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o advogado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ADVOGADOS.map((advogado) => (
                          <SelectItem key={advogado} value={advogado}>
                            {advogado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Prazo Limite */}
              <FormField
                control={form.control}
                name="prazoLimite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo Limite</FormLabel>
                    <div className="space-y-3">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy", { locale: ptBR })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      
                      {field.value && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Configurações de Notificação</h4>
                          <div className="space-y-2">
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" defaultChecked className="rounded" />
                              <span>Notificar 7 dias antes</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" defaultChecked className="rounded" />
                              <span>Notificar 3 dias antes</span>
                            </label>
                            <label className="flex items-center space-x-2 text-sm">
                              <input type="checkbox" defaultChecked className="rounded" />
                              <span>Notificar 1 dia antes</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                    <FormDescription>
                      Defina um prazo e configure as notificações automáticas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva os detalhes do processo..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Criando..." : "Criar Processo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}