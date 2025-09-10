"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { IconX, IconUser, IconPhone, IconMail, IconLoader, IconMapPin, IconStar, IconTag, IconPlus } from "@tabler/icons-react"

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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Contato, ContatoFormData, EnderecoCompleto } from "@/types"
import { useCreateContato } from "@/hooks/use-react-query"
import { toast } from "sonner"

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
  areaInteresse: z.array(z.string()).optional(),
  tipoSolicitacao: z.enum(["agendamento", "consulta", "informacao"]).optional(),
  preferenciaAtendimento: z.enum(["presencial", "online"]).optional(),
  endereco: z.object({
    cep: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido").optional(),
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
  }).optional(),
  observacoes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  favorito: z.boolean().optional(),
})

type CreateContatoFormData = z.infer<typeof createContatoSchema>

interface CreateContatoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContatoCreated?: () => void
}

export function CreateContatoDialog({ 
  open, 
  onOpenChange, 
  onContatoCreated 
}: CreateContatoDialogProps) {
  const { trigger: createContato, isMutating } = useCreateContato()
  const [tags, setTags] = React.useState<string[]>([])
  const [newTag, setNewTag] = React.useState("")
  const [cepLoading, setCepLoading] = React.useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    getValues,
  } = useForm<CreateContatoFormData>({
    resolver: zodResolver(createContatoSchema),
    defaultValues: {
      nome: "",
      telefone: "",
      email: "",
      areaInteresse: [],
      endereco: {
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
      },
      observacoes: "",
      tags: [],
      favorito: false,
    }
  })

  // Watch form values for controlled components
  const tipoSolicitacao = watch("tipoSolicitacao")
  const preferenciaAtendimento = watch("preferenciaAtendimento")
  const favorito = watch("favorito")
  const cep = watch("endereco.cep")

  // CEP lookup function
  const lookupCep = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '')
    if (cleanCep.length !== 8) return

    setCepLoading(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await response.json()
      
      if (!data.erro) {
        setValue("endereco.logradouro", data.logradouro || "")
        setValue("endereco.bairro", data.bairro || "")
        setValue("endereco.cidade", data.localidade || "")
        setValue("endereco.estado", data.uf || "")
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error)
    } finally {
      setCepLoading(false)
    }
  }

  // Watch CEP changes for auto-lookup
  React.useEffect(() => {
    if (cep && cep.length === 9) { // Format: 12345-678
      lookupCep(cep)
    }
  }, [cep])

  // Tag management functions
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()]
      setTags(updatedTags)
      setValue("tags", updatedTags)
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove)
    setTags(updatedTags)
    setValue("tags", updatedTags)
  }

  const onSubmit = async (data: CreateContatoFormData) => {
    try {
      const now = new Date()
      
      const contatoData: Partial<Contato> = {
        nome: data.nome,
        telefone: data.telefone,
        email: data.email || undefined,
        status: 'novo',
        origem: 'manual',
        areaInteresse: data.areaInteresse?.[0] || undefined, // Take first area for compatibility
        tipoSolicitacao: data.tipoSolicitacao,
        preferenciaAtendimento: data.preferenciaAtendimento,
        primeiroContato: now,
        ultimaInteracao: now,
        mensagensNaoLidas: 0,
        dadosColetados: {
          clienteType: 'novo',
          practiceArea: data.areaInteresse?.[0],
          schedulingPreference: data.preferenciaAtendimento,
          wantsScheduling: data.tipoSolicitacao === 'agendamento',
          customRequests: []
        },
        conversaCompleta: false,
        // Enhanced fields (these would need to be added to the Contato type)
        // endereco: data.endereco,
        // tags: data.tags || [],
        // favorito: data.favorito || false,
        // observacoes: data.observacoes,
      }

      const novoContato = await createContato(contatoData)
      
      toast.success("Contato criado com sucesso!", {
        description: `${novoContato.nome} foi adicionado à lista de contatos.`
      })
      
      reset()
      setTags([])
      setNewTag("")
      onContatoCreated?.()
      onOpenChange(false)
    } catch (error) {
      toast.error("Erro ao criar contato", {
        description: error instanceof Error ? error.message : "Tente novamente."
      })
    }
  }

  const handleClose = () => {
    if (!isMutating) {
      reset()
      setTags([])
      setNewTag("")
      onOpenChange(false)
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const value = e.currentTarget.value.trim()
                        if (value) {
                          const currentAreas = getValues("areaInteresse") || []
                          if (!currentAreas.includes(value)) {
                            setValue("areaInteresse", [...currentAreas, value])
                            e.currentTarget.value = ""
                          }
                        }
                      }
                    }}
                    disabled={isMutating}
                  />
                  {watch("areaInteresse") && watch("areaInteresse")!.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {watch("areaInteresse")!.map((area, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {area}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                            onClick={() => {
                              const currentAreas = getValues("areaInteresse") || []
                              setValue("areaInteresse", currentAreas.filter((_, i) => i !== index))
                            }}
                          >
                            <IconX className="h-2 w-2" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
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

              {/* Favorite checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="favorito"
                  checked={favorito}
                  onCheckedChange={(checked) => setValue("favorito", !!checked)}
                  disabled={isMutating}
                />
                <Label htmlFor="favorito" className="flex items-center gap-2">
                  <IconStar className="w-4 h-4" />
                  Marcar como favorito
                </Label>
              </div>
            </div>

            <Separator />

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Endereço (opcional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <div className="relative">
                    <IconMapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="cep"
                      placeholder="12345-678"
                      className="pl-10"
                      {...register("endereco.cep")}
                      disabled={isMutating || cepLoading}
                    />
                    {cepLoading && (
                      <IconLoader className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input
                    id="logradouro"
                    placeholder="Rua, Avenida..."
                    {...register("endereco.logradouro")}
                    disabled={isMutating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    placeholder="123"
                    {...register("endereco.numero")}
                    disabled={isMutating}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    placeholder="Apto, Sala..."
                    {...register("endereco.complemento")}
                    disabled={isMutating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    placeholder="Centro"
                    {...register("endereco.bairro")}
                    disabled={isMutating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    placeholder="São Paulo"
                    {...register("endereco.cidade")}
                    disabled={isMutating}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Tags and Notes */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Tags e Observações</h3>
              
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    placeholder="Adicionar tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    disabled={isMutating}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTag}
                    disabled={!newTag.trim() || isMutating}
                  >
                    <IconPlus className="w-4 h-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <IconTag className="w-3 h-3 mr-1" />
                        {tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                          onClick={() => removeTag(tag)}
                        >
                          <IconX className="h-2 w-2" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Observações adicionais sobre o contato..."
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