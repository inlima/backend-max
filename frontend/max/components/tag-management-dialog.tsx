"use client"

import * as React from "react"
import {
  IconTag,
  IconX,
  IconPlus,
  IconCheck,
  IconSearch,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface TagManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItems: { id: string; nome: string; tags?: string[] }[]
  availableTags: string[]
  onApplyTags: (tags: string[]) => Promise<void>
  isLoading?: boolean
}

export function TagManagementDialog({
  open,
  onOpenChange,
  selectedItems,
  availableTags,
  onApplyTags,
  isLoading = false,
}: TagManagementDialogProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedTags, setSelectedTags] = React.useState<string[]>([])
  const [newTag, setNewTag] = React.useState("")
  const [customTags, setCustomTags] = React.useState<string[]>([])

  // Get common tags from selected items
  const commonTags = React.useMemo(() => {
    if (selectedItems.length === 0) return []
    
    const firstItemTags = selectedItems[0].tags || []
    return firstItemTags.filter(tag => 
      selectedItems.every(item => (item.tags || []).includes(tag))
    )
  }, [selectedItems])

  // Initialize selected tags with common tags
  React.useEffect(() => {
    if (open) {
      setSelectedTags(commonTags)
      setSearchTerm("")
      setNewTag("")
    }
  }, [open, commonTags])

  // Filter available tags based on search
  const filteredTags = React.useMemo(() => {
    const allTags = [...availableTags, ...customTags]
    return allTags.filter(tag => 
      tag.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [availableTags, customTags, searchTerm])

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleAddNewTag = () => {
    if (newTag.trim() && !availableTags.includes(newTag.trim()) && !customTags.includes(newTag.trim())) {
      const trimmedTag = newTag.trim()
      setCustomTags(prev => [...prev, trimmedTag])
      setSelectedTags(prev => [...prev, trimmedTag])
      setNewTag("")
    }
  }

  const handleApply = async () => {
    try {
      await onApplyTags(selectedTags)
      onOpenChange(false)
    } catch (error) {
      console.error('Error applying tags:', error)
    }
  }

  const selectedCount = selectedItems.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <IconTag className="w-5 h-5" />
            <span>Gerenciar Tags</span>
          </DialogTitle>
          <DialogDescription>
            Aplicar tags a {selectedCount} contato{selectedCount > 1 ? 's' : ''} selecionado{selectedCount > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Tags */}
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Add New Tag */}
          <div className="flex space-x-2">
            <Input
              placeholder="Nova tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddNewTag()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleAddNewTag}
              disabled={!newTag.trim()}
            >
              <IconPlus className="w-4 h-4" />
            </Button>
          </div>

          <Separator />

          {/* Selected Tags Preview */}
          {selectedTags.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Tags selecionadas:</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                    <IconX className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Available Tags */}
          <div className="max-h-48 overflow-y-auto space-y-2">
            <Label className="text-sm font-medium">Tags disponíveis:</Label>
            {filteredTags.length > 0 ? (
              <div className="space-y-2">
                {filteredTags.map((tag) => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag}`}
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={() => handleTagToggle(tag)}
                    />
                    <Label
                      htmlFor={`tag-${tag}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      {tag}
                    </Label>
                    {commonTags.includes(tag) && (
                      <Badge variant="outline" className="text-xs">
                        Comum
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {searchTerm ? 'Nenhuma tag encontrada' : 'Nenhuma tag disponível'}
              </p>
            )}
          </div>

          {/* Common Tags Info */}
          {commonTags.length > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">
                Tags comuns aos contatos selecionados:
              </p>
              <div className="flex flex-wrap gap-1">
                {commonTags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={isLoading}
          >
            {isLoading ? 'Aplicando...' : 'Aplicar Tags'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}