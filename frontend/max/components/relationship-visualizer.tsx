'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Users, 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  ExternalLink,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useRelationships, usePotentialRelationships } from '@/hooks/use-relationships'
import { Relationship } from '@/lib/relationships-service'
import { ContatoEnhanced, ProcessoEnhanced } from '@/types'
import { toast } from 'sonner'

interface RelationshipVisualizerProps {
  entityType: 'contato' | 'processo'
  entityId: string
  entityData: ContatoEnhanced | ProcessoEnhanced
  onNavigate?: (type: 'contato' | 'processo', id: string) => void
}

interface CreateRelationshipDialogProps {
  entityType: 'contato' | 'processo'
  entityId: string
  onCreateRelationship: (
    targetType: 'contato' | 'processo',
    targetId: string,
    relationshipType: Relationship['relationshipType'],
    metadata?: Record<string, any>
  ) => Promise<void>
  isCreating: boolean
}

const relationshipTypeLabels: Record<Relationship['relationshipType'], string> = {
  cliente: 'Cliente',
  advogado: 'Advogado',
  referencia: 'Referência',
  relacionado: 'Relacionado'
}

const relationshipTypeColors: Record<Relationship['relationshipType'], string> = {
  cliente: 'bg-blue-100 text-blue-800',
  advogado: 'bg-green-100 text-green-800',
  referencia: 'bg-yellow-100 text-yellow-800',
  relacionado: 'bg-gray-100 text-gray-800'
}

function CreateRelationshipDialog({ 
  entityType, 
  entityId, 
  onCreateRelationship, 
  isCreating 
}: CreateRelationshipDialogProps) {
  const [open, setOpen] = useState(false)
  const [targetType, setTargetType] = useState<'contato' | 'processo'>('contato')
  const [targetId, setTargetId] = useState('')
  const [relationshipType, setRelationshipType] = useState<Relationship['relationshipType']>('relacionado')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!targetId.trim()) {
      toast.error('Por favor, informe o ID da entidade relacionada')
      return
    }

    try {
      await onCreateRelationship(
        targetType,
        targetId.trim(),
        relationshipType,
        notes ? { notes } : undefined
      )
      
      // Reset form and close dialog
      setTargetId('')
      setNotes('')
      setOpen(false)
    } catch (error) {
      // Error is handled by the hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Relacionamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Relacionamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetType">Tipo de Entidade</Label>
            <Select value={targetType} onValueChange={(value: 'contato' | 'processo') => setTargetType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contato">Contato</SelectItem>
                <SelectItem value="processo">Processo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetId">ID da Entidade</Label>
            <Input
              id="targetId"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder={`ID do ${targetType}`}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="relationshipType">Tipo de Relacionamento</Label>
            <Select 
              value={relationshipType} 
              onValueChange={(value: Relationship['relationshipType']) => setRelationshipType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(relationshipTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre este relacionamento..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? 'Criando...' : 'Criar Relacionamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RelationshipCard({ 
  relationship, 
  onEdit, 
  onDelete, 
  onNavigate,
  isDeleting 
}: {
  relationship: Relationship
  onEdit: (relationship: Relationship) => void
  onDelete: (relationshipId: string) => void
  onNavigate?: (type: 'contato' | 'processo', id: string) => void
  isDeleting: boolean
}) {
  const targetEntity = relationship.targetType === 'contato' ? 'Contato' : 'Processo'
  const icon = relationship.targetType === 'contato' ? Users : FileText

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-gray-100">
              {React.createElement(icon, { className: "h-4 w-4" })}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{targetEntity}</span>
                <Badge 
                  variant="secondary" 
                  className={relationshipTypeColors[relationship.relationshipType]}
                >
                  {relationshipTypeLabels[relationship.relationshipType]}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                ID: {relationship.targetId}
              </p>
              {relationship.metadata?.notes && (
                <p className="text-xs text-gray-500 line-clamp-2">
                  {relationship.metadata.notes}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Criado em {new Date(relationship.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {onNavigate && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigate(relationship.targetType, relationship.targetId)}
                className="h-8 w-8 p-0"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(relationship)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(relationship.id)}
              disabled={isDeleting}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PotentialRelationshipsSection({ 
  entityType, 
  entityId, 
  onCreateRelationship 
}: {
  entityType: 'contato' | 'processo'
  entityId: string
  onCreateRelationship: (
    targetType: 'contato' | 'processo',
    targetId: string,
    relationshipType: Relationship['relationshipType']
  ) => Promise<void>
}) {
  const { data: suggestions = [], isLoading } = usePotentialRelationships(entityType, entityId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Relacionamentos Sugeridos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Carregando sugestões...</div>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Relacionamentos Sugeridos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.slice(0, 3).map((suggestion, index) => (
          <div key={index} className="p-3 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Confiança: {Math.round(suggestion.confidence * 100)}%
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // For now, suggest as 'relacionado' type
                  if (suggestion.contatos.length > 0) {
                    onCreateRelationship('contato', suggestion.contatos[0].id, 'relacionado')
                  } else if (suggestion.processos.length > 0) {
                    onCreateRelationship('processo', suggestion.processos[0].id, 'relacionado')
                  }
                }}
                className="gap-1"
              >
                <Plus className="h-3 w-3" />
                Conectar
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              {suggestion.contatos.length > 0 && (
                <div>Contatos: {suggestion.contatos.map(c => c.nome).join(', ')}</div>
              )}
              {suggestion.processos.length > 0 && (
                <div>Processos: {suggestion.processos.map(p => p.titulo).join(', ')}</div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function RelationshipVisualizer({ 
  entityType, 
  entityId, 
  entityData, 
  onNavigate 
}: RelationshipVisualizerProps) {
  const {
    relationships,
    relatedContatos,
    relatedProcessos,
    isLoading,
    createRelationship,
    updateRelationship,
    deleteRelationship,
    isCreating,
    isDeleting
  } = useRelationships(entityType, entityId)

  const [editingRelationship, setEditingRelationship] = useState<Relationship | null>(null)

  const handleCreateRelationship = async (
    targetType: 'contato' | 'processo',
    targetId: string,
    relationshipType: Relationship['relationshipType'],
    metadata?: Record<string, any>
  ) => {
    await createRelationship(targetType, targetId, relationshipType, metadata)
  }

  const handleEditRelationship = (relationship: Relationship) => {
    setEditingRelationship(relationship)
    // TODO: Implement edit dialog
    toast.info('Funcionalidade de edição será implementada em breve')
  }

  const handleDeleteRelationship = async (relationshipId: string) => {
    if (confirm('Tem certeza que deseja remover este relacionamento?')) {
      await deleteRelationship(relationshipId)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Relacionamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Carregando relacionamentos...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Relacionamentos ({relationships.length})
            </CardTitle>
            <CreateRelationshipDialog
              entityType={entityType}
              entityId={entityId}
              onCreateRelationship={handleCreateRelationship}
              isCreating={isCreating}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {relationships.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum relacionamento encontrado</p>
              <p className="text-xs">Adicione relacionamentos para conectar entidades</p>
            </div>
          ) : (
            <>
              {relatedContatos.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Contatos Relacionados ({relatedContatos.length})
                  </h4>
                  <div className="space-y-2">
                    {relatedContatos.map((relationship) => (
                      <RelationshipCard
                        key={relationship.id}
                        relationship={relationship}
                        onEdit={handleEditRelationship}
                        onDelete={handleDeleteRelationship}
                        onNavigate={onNavigate}
                        isDeleting={isDeleting}
                      />
                    ))}
                  </div>
                </div>
              )}

              {relatedProcessos.length > 0 && (
                <div>
                  {relatedContatos.length > 0 && <Separator className="my-4" />}
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Processos Relacionados ({relatedProcessos.length})
                  </h4>
                  <div className="space-y-2">
                    {relatedProcessos.map((relationship) => (
                      <RelationshipCard
                        key={relationship.id}
                        relationship={relationship}
                        onEdit={handleEditRelationship}
                        onDelete={handleDeleteRelationship}
                        onNavigate={onNavigate}
                        isDeleting={isDeleting}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <PotentialRelationshipsSection
        entityType={entityType}
        entityId={entityId}
        onCreateRelationship={handleCreateRelationship}
      />
    </div>
  )
}