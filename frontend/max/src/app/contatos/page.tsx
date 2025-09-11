'use client'

import * as React from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IconUsers, IconPlus, IconDownload, IconStar, IconTrash, IconChartBar } from '@tabler/icons-react'
import { ContatosTable } from '@/components/contatos-table'
import { ContatosFilters } from '@/components/contatos-filters'
import { CreateContatoDialog } from '@/components/create-contato-dialog'
import { ContatoDetailDrawer } from '@/components/contato-detail-drawer'
import { ContatosAnalytics } from '@/components/contatos-analytics'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useContatos } from '@/hooks/use-react-query'
import { Contato, ContatosFilters as ContatosFiltersType } from '@/types'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'

export default function ContatosPage() {
  const [filters, setFilters] = React.useState<ContatosFiltersType>({})
  const [selectedContato, setSelectedContato] = React.useState<Contato | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = React.useState(false)
  const [selectedContatoIds, setSelectedContatoIds] = React.useState<string[]>([])

  const { data: contatosData, isLoading, error, refetch } = useContatos(filters)

  const handleSelectContato = (contato: Contato) => {
    setSelectedContato(contato)
    setIsDetailDrawerOpen(true)
  }

  const handleEditContato = (contato: Contato) => {
    setSelectedContato(contato)
    setIsDetailDrawerOpen(true)
  }

  const handleCreateContato = () => {
    setIsCreateDialogOpen(true)
  }

  const handleContatoCreated = () => {
    refetch()
    toast.success('Contato criado com sucesso!')
  }

  const handleContatoUpdated = () => {
    refetch()
    toast.success('Contato atualizado com sucesso!')
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  const handleBulkFavorite = async () => {
    if (selectedContatoIds.length === 0) {
      toast.error('Selecione pelo menos um contato')
      return
    }

    try {
      await apiClient.bulkUpdateContatos(selectedContatoIds, { favorito: true })
      refetch()
      setSelectedContatoIds([])
      toast.success(`${selectedContatoIds.length} contato(s) marcado(s) como favorito`)
    } catch (error) {
      toast.error('Erro ao marcar contatos como favoritos')
    }
  }

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedContatoIds.length === 0) {
      toast.error('Selecione pelo menos um contato')
      return
    }

    try {
      await apiClient.bulkUpdateContatos(selectedContatoIds, { status })
      refetch()
      setSelectedContatoIds([])
      toast.success(`Status de ${selectedContatoIds.length} contato(s) atualizado`)
    } catch (error) {
      toast.error('Erro ao atualizar status dos contatos')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedContatoIds.length === 0) {
      toast.error('Selecione pelo menos um contato')
      return
    }

    if (!confirm(`Tem certeza que deseja excluir ${selectedContatoIds.length} contato(s)?`)) {
      return
    }

    try {
      await Promise.all(selectedContatoIds.map(id => apiClient.deleteContato(id)))
      refetch()
      setSelectedContatoIds([])
      toast.success(`${selectedContatoIds.length} contato(s) excluído(s)`)
    } catch (error) {
      toast.error('Erro ao excluir contatos')
    }
  }

  const handleExportContatos = async () => {
    try {
      // This would typically generate a CSV or Excel file
      const contatos = contatosData?.data || []
      const csvContent = [
        'Nome,Telefone,Email,Status,Origem,Área de Interesse,Última Interação',
        ...contatos.map(c => 
          `"${c.nome}","${c.telefone}","${c.email || ''}","${c.status}","${c.origem}","${c.areaInteresse || ''}","${c.ultimaInteracao}"`
        )
      ].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `contatos_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Contatos exportados com sucesso!')
    } catch (error) {
      toast.error('Erro ao exportar contatos')
    }
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Contatos</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-destructive">Erro ao carregar contatos: {error.message}</p>
                <Button onClick={() => refetch()} className="mt-4">
                  Tentar novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2" role="banner">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" aria-label="Abrir menu lateral" />
          <Separator orientation="vertical" className="mr-2 h-4" aria-hidden="true" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Contatos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col gap-4 p-4 pt-0" id="main-content" role="main">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <IconUsers className="h-8 w-8" aria-hidden="true" />
              Contatos
            </h1>
            <p className="text-muted-foreground">
              Gerencie todos os contatos do seu escritório.
            </p>
          </div>
          
          <div className="flex items-center gap-2" role="toolbar" aria-label="Ações dos contatos">
            {selectedContatoIds.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkFavorite}
                  aria-label={`Marcar ${selectedContatoIds.length} contato(s) como favorito`}
                >
                  <IconStar className="h-4 w-4 mr-2" aria-hidden="true" />
                  Favoritar ({selectedContatoIds.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkStatusUpdate('em_atendimento')}
                  aria-label={`Alterar status de ${selectedContatoIds.length} contato(s) para em atendimento`}
                >
                  Em Atendimento
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-destructive hover:text-destructive"
                  aria-label={`Excluir ${selectedContatoIds.length} contato(s) selecionado(s)`}
                >
                  <IconTrash className="h-4 w-4 mr-2" aria-hidden="true" />
                  Excluir
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportContatos}
              aria-label="Exportar lista de contatos"
            >
              <IconDownload className="h-4 w-4 mr-2" aria-hidden="true" />
              Exportar
            </Button>
            <Button onClick={handleCreateContato} aria-label="Criar novo contato">
              <IconPlus className="h-4 w-4 mr-2" aria-hidden="true" />
              Novo Contato
            </Button>
          </div>
        </div>

        <Tabs defaultValue="lista" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2" role="tablist" aria-label="Visualizações dos contatos">
            <TabsTrigger value="lista" className="flex items-center gap-2" role="tab" aria-controls="lista-panel">
              <IconUsers className="h-4 w-4" aria-hidden="true" />
              Lista de Contatos
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2" role="tab" aria-controls="analytics-panel">
              <IconChartBar className="h-4 w-4" aria-hidden="true" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lista" role="tabpanel" id="lista-panel" aria-labelledby="lista-tab">
            <Card>
              <CardHeader>
                <CardTitle>
                  Lista de Contatos
                  {contatosData && (
                    <span className="text-sm font-normal text-muted-foreground ml-2" role="status" aria-live="polite">
                      ({contatosData.total} contatos)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ContatosFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    onClearFilters={handleClearFilters}
                  />
                  
                  <ContatosTable
                    data={contatosData?.data || []}
                    isLoading={isLoading}
                    onSelectContato={handleSelectContato}
                    onEditContato={handleEditContato}
                    selectedIds={selectedContatoIds}
                    onSelectionChange={setSelectedContatoIds}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" role="tabpanel" id="analytics-panel" aria-labelledby="analytics-tab">
            <ContatosAnalytics contatos={contatosData?.data || []} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs and Drawers */}
      <CreateContatoDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onContatoCreated={handleContatoCreated}
      />

      <ContatoDetailDrawer
        contato={selectedContato}
        open={isDetailDrawerOpen}
        onOpenChange={setIsDetailDrawerOpen}
        onContatoUpdated={handleContatoUpdated}
      />
    </div>
  )
}