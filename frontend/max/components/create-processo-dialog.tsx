"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { IconX, IconScale, IconFileDescription, IconUser, IconLoader, IconCalendar } from "@tabler/icons-react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Processo, Contato } from "@/types"
import { useCreateProcesso, useContatos } from "@/hooks/use-api"
import { toast } from "sonner"
import { FormErrorBoundary } from "@/components/error-boundaries/form-error-boundary"
import { TextField, SelectField, TextareaField, DateField } from "@/components/forms/form-field"
import { FormValidationSummary, ServerErrorDisplay } from "@/components/forms/form-validation"

// Common legal areas
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

// Common lawyers
const ADVOGADOS = [
  "Dr. João Silva",
  "Dra. Maria Santos",
  "Dr. Pedro Oliveira",
  "Dra. Ana Costa",
  "Dr. Carlos Ferreira",
]

// Validation schema
const createProcessoSchema = z.object({
  titulo: z.string().min(3, "Título deve ter pelo menos 3 caracteres"),
  numero: z.string().optional(),
  descricao: z.string().optional(),
  contatoId: z.string().min(1, "Selecione um cliente"),
  areaJuridica: z.string().min(1, "Selecione uma área jurídica"),
  prioridade: z.enum(["baixa", "media", "alta", "urgente"]),
  advogadoResponsavel: z.string().optional(),
  prazoLimite: z.string().optional(),
  observacoes: z.string().optional(),
})

type CreateProcessoFormData = z.infer<typeof createProcessoSchema>

interface CreateProcessoDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: (processo: Processo) => void
  preSelectedContatoId?: string
}

export function CreateProcessoDialog({ 
  open, 
  onClose, 
  onSuccess,
  preSelectedContatoId
}: CreateProcessoDialogProps) {
  const { trigger: createProcesso, isMutating } = useCreateProcesso()
  
  // Fetch contatos for the dropdown
  const { data: contatosResponse } = useContatos()
  const contatos = contatosResponse?.data || []
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateProcessoFormData>({
    resolver: zodResolver(createProcessoSchema),
    defaultValues: {
      titulo: "",
      numero: "",
      descricao: "",
      contatoId: preSelectedContatoId || "",
      areaJuridica: "",
      prioridade: "media",
      advogadoResponsavel: "",
      prazoLimite: "",
      observacoes: "",
    }
  })

  // Watch form values for controlled components
  const contatoId = watch("contatoId")
  const areaJuridica = watch("areaJuridica")
  const prioridade = watch("prioridade")
  const advogadoResponsavel = watch("advogadoResponsavel")

  // Set pre-selected contact when dialog opens
  React.useEffect(() => {
    if (preSelectedContatoId && open) {
      setValue("contatoId", preSelectedContatoId)
    }
  }, [preSelectedContatoId, open, setValue])

  const onSubmit = async (data: CreateProcessoFormData) => {
    try {
      const now = new Date()
      
      // Find the selected contact
      const selectedContato = contatos.find(c => c.id === data.contatoId)
      if (!selectedContato) {
        toast.error("Cliente selecionado não encontrado")
        return
      }
      
      const processoData: Partial<Processo> = {
        titulo: data.titulo,
        numero: data.numero || undefined,
        descricao: data.descricao || undefined,
        contatoId: data.contatoId,
        contato: {
          nome: selectedContato.nome,
          telefone: selectedContato.telefone,
        },
        areaJuridica: data.areaJuridica,
        status: 'novo',
        prioridade: data.prioridade,
        origem: 'manual',
        advogadoResponsavel: data.advogadoResponsavel || undefined,
        dataAbertura: now,
        dataUltimaAtualizacao: now,
        prazoLimite: data.prazoLimite ? new Date(data.prazoLimite) : undefined,
        documentos: [],
        historico: [
          {
            id: crypto.randomUUID(),
            acao: "Processo Criado",
            descricao: "Processo criado manualmente no sistema",
            usuario: "Sistema", // TODO: Get current user
            timestamp: now,
          }
        ],
        observacoes: data.observacoes || undefined,
      }

      const novoProcesso = await createProcesso(processoData)
      
      toast.success("Processo criado com sucesso!", {
        description: `${novoProcesso.titulo} foi adicionado à lista de processos.`
      })
      
      reset()
      onSuccess?.(novoProcesso)
      onClose()
    } catch (error) {
      toast.error("Erro ao criar processo", {
        description: error instanceof Error ? error.message : "Tente novamente."
      })
    }
  }

  const handleClose = () => {
    if (!isMutating) {
      reset()
      onClose()
    }
  }

  return (
    <Drawer open={open} onOpenChange={(open) => !open && handleClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DrawerTitle className="text-xl">Criar Novo Processo</DrawerTitle>
              <DrawerDescription>
                Adicione um novo processo jurídico ao sistema
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="outline" size="sm" disabled={isMutating}>
                <IconX className="w-4 h-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-hidden">
          <div className="px-4 space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Informações Básicas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">
                    Título do Processo <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <IconScale className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="titulo"
                      placeholder="Ex: Ação de Cobrança - João Silva"
                      className="pl-10"
                      {...register("titulo")}
                      disabled={isMutating}
                    />
                  </div>
                  {errors.titulo && (
                    <p className="text-sm text-red-500">{errors.titulo.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero">Número do Processo (opcional)</Label>
                  <div className="relative">
                    <IconFileDescription className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="numero"
                      placeholder="Ex: 1234567-89.2024.8.26.0001"
                      className="pl-10"
                      {...register("numero")}
                      disabled={isMutating}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição (opcional)</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva brevemente o processo..."
                  rows={3}
                  {...register("descricao")}
                  disabled={isMutating}
                />
              </div>
            </div>

            <Separator />

            {/* Client and Legal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Cliente e Área Jurídica</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contatoId">
                    Cliente <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={contatoId || ""}
                    onValueChange={(value) => setValue("contatoId", value)}
                    disabled={isMutating}
                  >
                    <SelectTrigger id="contatoId">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {contatos.map((contato) => (
                        <SelectItem key={contato.id} value={contato.id}>
                          {contato.nome} - {contato.telefone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.contatoId && (
                    <p className="text-sm text-red-500">{errors.contatoId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="areaJuridica">
                    Área Jurídica <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={areaJuridica || ""}
                    onValueChange={(value) => setValue("areaJuridica", value)}
                    disabled={isMutating}
                  >
                    <SelectTrigger id="areaJuridica">
                      <SelectValue placeholder="Selecione a área" />
                    </SelectTrigger>
                    <SelectContent>
                      {AREAS_JURIDICAS.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.areaJuridica && (
                    <p className="text-sm text-red-500">{errors.areaJuridica.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Management Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Gestão do Processo</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prioridade">
                    Prioridade <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={prioridade || "media"}
                    onValueChange={(value) => setValue("prioridade", value as "baixa" | "media" | "alta" | "urgente")}
                    disabled={isMutating}
                  >
                    <SelectTrigger id="prioridade">
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advogadoResponsavel">Advogado Responsável</Label>
                  <Select
                    value={advogadoResponsavel || ""}
                    onValueChange={(value) => setValue("advogadoResponsavel", value)}
                    disabled={isMutating}
                  >
                    <SelectTrigger id="advogadoResponsavel">
                      <SelectValue placeholder="Selecione o advogado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Não atribuído</SelectItem>
                      {ADVOGADOS.map((advogado) => (
                        <SelectItem key={advogado} value={advogado}>
                          {advogado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prazoLimite">Prazo Limite</Label>
                  <div className="relative">
                    <IconCalendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="prazoLimite"
                      type="date"
                      className="pl-10"
                      {...register("prazoLimite")}
                      disabled={isMutating}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Observações adicionais sobre o processo..."
                  rows={3}
                  {...register("observacoes")}
                  disabled={isMutating}
                />
              </div>
            </div>
          </div>

          <DrawerFooter className="pt-6">
            <div className="flex items-center justify-end gap-2">
              <DrawerClose asChild>
                <Button variant="outline" disabled={isMutating}>
                  Cancelar
                </Button>
              </DrawerClose>
              <Button type="submit" disabled={isMutating}>
                {isMutating ? (
                  <>
                    <IconLoader className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Processo"
                )}
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}