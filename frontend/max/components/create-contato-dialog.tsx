"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { IconX, IconUser, IconPhone, IconMail, IconLoader } from "@tabler/icons-react"

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
import { Separator } from "@/components/ui/separator"
import { Contato } from "@/types"
import { useCreateContato } from "@/hooks/use-api"
import { toast } from "sonner"
import { FormErrorBoundary } from "@/components/error-boundaries/form-error-boundary"
import { TextField, SelectField, PhoneField } from "@/components/forms/form-field"
import { FormValidationSummary, ServerErrorDisplay } from "@/components/forms/form-validation"

// Enhanced validation schema
const createContatoSchema = z.object({
  nome: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espaços"),
  telefone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Formato: (11) 99999-9999")
    .refine((val) => {
      const digits = val.replace(/\D/g, '')
      return digits.length >= 10 && digits.length <= 11
    }, "Telefone deve ter 10 ou 11 dígitos"),
  email: z.string()
    .email("Email inválido")
    .optional()
    .or(z.literal(""))
    .refine((val) => !val || val.includes("@"), "Email deve conter @"),
  areaInteresse: z.string().optional(),
  tipoSolicitacao: z.enum(["agendamento", "consulta", "informacao"]).optional(),
  preferenciaAtendimento: z.enum(["presencial", "online"]).optional(),
})

type CreateContatoFormData = z.infer<typeof createContatoSchema>

interface CreateContatoDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: (contato: Contato) => void
}

export function CreateContatoDialog({ 
  open, 
  onClose, 
  onSuccess 
}: CreateContatoDialogProps) {
  const { trigger: createContato, isMutating } = useCreateContato()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateContatoFormData>({
    resolver: zodResolver(createContatoSchema),
    defaultValues: {
      nome: "",
      telefone: "",
      email: "",
      areaInteresse: "",
    }
  })

  // Watch form values for controlled components
  const tipoSolicitacao = watch("tipoSolicitacao")
  const preferenciaAtendimento = watch("preferenciaAtendimento")

  const onSubmit = async (data: CreateContatoFormData) => {
    try {
      const now = new Date()
      
      const contatoData: Partial<Contato> = {
        nome: data.nome,
        telefone: data.telefone,
        email: data.email || undefined,
        status: 'novo',
        origem: 'manual',
        areaInteresse: data.areaInteresse || undefined,
        tipoSolicitacao: data.tipoSolicitacao,
        preferenciaAtendimento: data.preferenciaAtendimento,
        primeiroContato: now,
        ultimaInteracao: now,
        mensagensNaoLidas: 0,
        dadosColetados: {
          clienteType: 'novo',
          practiceArea: data.areaInteresse,
          schedulingPreference: data.preferenciaAtendimento,
          wantsScheduling: data.tipoSolicitacao === 'agendamento',
          customRequests: []
        },
        conversaCompleta: false,
      }

      const novoContato = await createContato(contatoData)
      
      toast.success("Contato criado com sucesso!", {
        description: `${novoContato.nome} foi adicionado à lista de contatos.`
      })
      
      reset()
      onSuccess?.(novoContato)
      onClose()
    } catch (error) {
      toast.error("Erro ao criar contato", {
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
              <DrawerTitle className="text-xl">Criar Novo Contato</DrawerTitle>
              <DrawerDescription>
                Adicione um novo contato manualmente ao sistema
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
          <div className="px-4 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Informações Básicas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">
                    Nome <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <IconUser className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="nome"
                      placeholder="Nome completo"
                      className="pl-10"
                      {...register("nome")}
                      disabled={isMutating}
                    />
                  </div>
                  {errors.nome && (
                    <p className="text-sm text-red-500">{errors.nome.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">
                    Telefone <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <IconPhone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="telefone"
                      placeholder="(11) 99999-9999"
                      className="pl-10"
                      {...register("telefone")}
                      disabled={isMutating}
                    />
                  </div>
                  {errors.telefone && (
                    <p className="text-sm text-red-500">{errors.telefone.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (opcional)</Label>
                <div className="relative">
                  <IconMail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    className="pl-10"
                    {...register("email")}
                    disabled={isMutating}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Service Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Informações do Atendimento</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="areaInteresse">Área de Interesse</Label>
                  <Input
                    id="areaInteresse"
                    placeholder="Ex: Direito Civil, Trabalhista..."
                    {...register("areaInteresse")}
                    disabled={isMutating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoSolicitacao">Tipo de Solicitação</Label>
                  <Select
                    value={tipoSolicitacao || ""}
                    onValueChange={(value) => 
                      setValue("tipoSolicitacao", value as "agendamento" | "consulta" | "informacao")
                    }
                    disabled={isMutating}
                  >
                    <SelectTrigger id="tipoSolicitacao">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agendamento">Agendamento</SelectItem>
                      <SelectItem value="consulta">Consulta</SelectItem>
                      <SelectItem value="informacao">Informação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferenciaAtendimento">Preferência de Atendimento</Label>
                <Select
                  value={preferenciaAtendimento || ""}
                  onValueChange={(value) => 
                    setValue("preferenciaAtendimento", value as "presencial" | "online")
                  }
                  disabled={isMutating}
                >
                  <SelectTrigger id="preferenciaAtendimento">
                    <SelectValue placeholder="Selecione a preferência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
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
                  "Criar Contato"
                )}
              </Button>
            </div>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}