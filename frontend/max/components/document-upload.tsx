"use client"

import * as React from "react"
import { useDropzone } from "react-dropzone"
import { 
  IconUpload, 
  IconFile, 
  IconFileText, 
  IconImage, 
  IconFilePdf,
  IconX,
  IconEye,
  IconDownload,
  IconTag
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface DocumentFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  category: string
  tags: string[]
  uploadProgress: number
  uploaded: boolean
  url?: string
  uploadedAt?: Date
  uploadedBy?: string
}

interface DocumentUploadProps {
  processoId: string
  existingDocuments?: DocumentFile[]
  onUpload?: (files: DocumentFile[]) => void
  onDelete?: (documentId: string) => void
  className?: string
}

const DOCUMENT_CATEGORIES = [
  { value: "peticao", label: "Petição" },
  { value: "contrato", label: "Contrato" },
  { value: "comprovante", label: "Comprovante" },
  { value: "procuracao", label: "Procuração" },
  { value: "documento_pessoal", label: "Documento Pessoal" },
  { value: "correspondencia", label: "Correspondência" },
  { value: "laudo", label: "Laudo/Perícia" },
  { value: "sentenca", label: "Sentença" },
  { value: "recurso", label: "Recurso" },
  { value: "outros", label: "Outros" },
]

const getFileIcon = (type: string) => {
  if (type.includes('pdf')) return IconFilePdf
  if (type.includes('image')) return IconImage
  if (type.includes('text') || type.includes('document')) return IconFileText
  return IconFile
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function DocumentUpload({
  processoId,
  existingDocuments = [],
  onUpload,
  onDelete,
  className
}: DocumentUploadProps) {
  const [documents, setDocuments] = React.useState<DocumentFile[]>(existingDocuments)
  const [selectedCategory, setSelectedCategory] = React.useState<string>("")
  const [tags, setTags] = React.useState<string>("")
  const [isUploading, setIsUploading] = React.useState(false)

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    const newDocuments: DocumentFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      category: selectedCategory || "outros",
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      uploadProgress: 0,
      uploaded: false,
    }))

    setDocuments(prev => [...prev, ...newDocuments])
    
    // Simulate upload progress
    newDocuments.forEach((doc, index) => {
      setTimeout(() => {
        simulateUpload(doc.id)
      }, index * 500)
    })
  }, [selectedCategory, tags])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const simulateUpload = (documentId: string) => {
    const interval = setInterval(() => {
      setDocuments(prev => prev.map(doc => {
        if (doc.id === documentId) {
          const newProgress = Math.min(doc.uploadProgress + 10, 100)
          const uploaded = newProgress === 100
          
          if (uploaded) {
            clearInterval(interval)
            return {
              ...doc,
              uploadProgress: newProgress,
              uploaded: true,
              url: `/api/documents/${doc.id}`,
              uploadedAt: new Date(),
              uploadedBy: 'Usuário Atual'
            }
          }
          
          return { ...doc, uploadProgress: newProgress }
        }
        return doc
      }))
    }, 200)
  }

  const handleDelete = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId))
    onDelete?.(documentId)
  }

  const handleCategoryChange = (documentId: string, category: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId ? { ...doc, category } : doc
    ))
  }

  const groupedDocuments = documents.reduce((acc, doc) => {
    const category = doc.category || 'outros'
    if (!acc[category]) acc[category] = []
    acc[category].push(doc)
    return acc
  }, {} as Record<string, DocumentFile[]>)

  return (
    <div className={cn("space-y-6", className)}>
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconUpload className="h-5 w-5" />
            Upload de Documentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category and Tags Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                placeholder="urgente, importante, revisão"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            )}
          >
            <input {...getInputProps()} />
            <IconUpload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-lg font-medium">Solte os arquivos aqui...</p>
            ) : (
              <div>
                <p className="text-lg font-medium mb-2">
                  Arraste arquivos aqui ou clique para selecionar
                </p>
                <p className="text-sm text-muted-foreground">
                  Suporte para PDF, DOC, DOCX, TXT e imagens (máx. 10MB)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      {Object.keys(groupedDocuments).length > 0 && (
        <div className="space-y-4">
          {Object.entries(groupedDocuments).map(([category, docs]) => {
            const categoryLabel = DOCUMENT_CATEGORIES.find(c => c.value === category)?.label || category
            
            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{categoryLabel}</span>
                    <Badge variant="outline">{docs.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {docs.map((doc) => {
                      const FileIcon = getFileIcon(doc.type)
                      
                      return (
                        <div key={doc.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                          <div className="flex-shrink-0">
                            <div className="p-2 bg-muted rounded-lg">
                              <FileIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{doc.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatFileSize(doc.size)} • {doc.type}
                                </p>
                                
                                {doc.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {doc.tags.map((tag, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        <IconTag className="h-3 w-3 mr-1" />
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                
                                {doc.uploadedAt && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Enviado por {doc.uploadedBy} em {format(doc.uploadedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-2 ml-4">
                                {!doc.uploaded && (
                                  <div className="w-24">
                                    <Progress value={doc.uploadProgress} className="h-2" />
                                  </div>
                                )}
                                
                                {doc.uploaded && (
                                  <>
                                    <Button variant="ghost" size="sm">
                                      <IconEye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm">
                                      <IconDownload className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(doc.id)}
                                >
                                  <IconX className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {!doc.uploaded && doc.uploadProgress > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>Enviando...</span>
                                  <span>{doc.uploadProgress}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}