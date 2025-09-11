'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { 
  IconUser, 
  IconCamera, 
  IconTrash, 
  IconPlus, 
  IconX,
  IconSave,
  IconUpload
} from '@tabler/icons-react'
import type { ProfileSettings as ProfileSettingsType } from '@/types'

interface ProfileSettingsProps {
  initialData?: Partial<ProfileSettingsType>
  onSave?: (data: ProfileSettingsType) => Promise<void>
}

export function ProfileSettings({ initialData, onSave }: ProfileSettingsProps) {
  const [formData, setFormData] = useState<ProfileSettingsType>({
    nome: initialData?.nome || '',
    email: initialData?.email || '',
    telefone: initialData?.telefone || '',
    oab: initialData?.oab || '',
    especialidades: initialData?.especialidades || [],
    assinatura: initialData?.assinatura || ''
  })
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [newEspecialidade, setNewEspecialidade] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (field: keyof ProfileSettingsType, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione apenas arquivos de imagem')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB')
        return
      }

      setFormData(prev => ({
        ...prev,
        avatar: file
      }))

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveAvatar = () => {
    setFormData(prev => ({
      ...prev,
      avatar: undefined
    }))
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAddEspecialidade = () => {
    if (newEspecialidade.trim() && !formData.especialidades.includes(newEspecialidade.trim())) {
      setFormData(prev => ({
        ...prev,
        especialidades: [...prev.especialidades, newEspecialidade.trim()]
      }))
      setNewEspecialidade('')
    }
  }

  const handleRemoveEspecialidade = (especialidade: string) => {
    setFormData(prev => ({
      ...prev,
      especialidades: prev.especialidades.filter(e => e !== especialidade)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    
    if (!formData.email.trim()) {
      toast.error('Email é obrigatório')
      return
    }
    
    if (!formData.telefone.trim()) {
      toast.error('Telefone é obrigatório')
      return
    }

    setIsLoading(true)
    
    try {
      await onSave?.(formData)
      toast.success('Perfil atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast.error('Erro ao salvar perfil. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconUser className="h-5 w-5" />
          Perfil Profissional
        </CardTitle>
        <CardDescription>
          Configure suas informações pessoais e profissionais
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage 
                  src={avatarPreview || undefined} 
                  alt={formData.nome || 'Avatar'} 
                />
                <AvatarFallback className="text-lg">
                  {formData.nome ? getInitials(formData.nome) : <IconUser className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <IconCamera className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <IconUpload className="h-4 w-4 mr-2" />
                Alterar Foto
              </Button>
              {(avatarPreview || formData.avatar) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAvatar}
                >
                  <IconTrash className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          <Separator />

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="oab">Número da OAB</Label>
              <Input
                id="oab"
                value={formData.oab}
                onChange={(e) => handleInputChange('oab', e.target.value)}
                placeholder="123456/SP"
              />
            </div>
          </div>

          <Separator />

          {/* Especialidades */}
          <div className="space-y-4">
            <div>
              <Label>Especialidades Jurídicas</Label>
              <p className="text-sm text-muted-foreground">
                Adicione suas áreas de especialização
              </p>
            </div>
            
            <div className="flex gap-2">
              <Input
                value={newEspecialidade}
                onChange={(e) => setNewEspecialidade(e.target.value)}
                placeholder="Ex: Direito Civil, Direito Trabalhista..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddEspecialidade()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddEspecialidade}
                disabled={!newEspecialidade.trim()}
              >
                <IconPlus className="h-4 w-4" />
              </Button>
            </div>
            
            {formData.especialidades.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.especialidades.map((especialidade, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {especialidade}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleRemoveEspecialidade(especialidade)}
                    >
                      <IconX className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Digital Signature */}
          <div className="space-y-2">
            <Label htmlFor="assinatura">Assinatura Digital</Label>
            <Textarea
              id="assinatura"
              value={formData.assinatura}
              onChange={(e) => handleInputChange('assinatura', e.target.value)}
              placeholder="Sua assinatura digital para documentos e emails..."
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Esta assinatura será usada em documentos e emails automáticos
            </p>
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
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}