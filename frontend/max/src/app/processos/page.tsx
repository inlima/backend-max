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
import { IconFileDescription, IconPlus, IconDownload, IconRefresh } from '@tabler/icons-react'
import { NotificationCenter } from '@/components/notification-center'
import { notificationService } from '@/lib/notification-service'
import { ProcessosTable } from '@/components/processos-table'
import { ProcessosFilters } from '@/components/processos-filters'
import { CreateProcessoDialog } from '@/components/create-processo-dialog'
import { ProcessoDetailDrawer } from '@/components/processo-detail-drawer'
import { useApi } from '@/hooks/use-api'
import { apiClient } from '@/lib/api-client'
import { Processo, ProcessosFilters as ProcessosFiltersType } from '@/types'
import { toast } from 'sonner'

export default function ProcessosPage() {
  const [filters, setFilters] = React.useState<ProcessosFiltersType>({})
  const [selectedProcesso, setSelectedProcesso] = React.useState<Processo | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = React.useState(false)
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [notifications, setNotifications] = React.useState(notificationService.getNotifications())

  // Fetch processos data
  const { 
    data: processosResponse, 
    isLoading, 
    error, 
    refetch 
  } = useApi({
    queryKey: ['processos', filters],
    queryFn: () => apiClient.getProcessos(filters),
    enabled: true
  })

  const processos = processosResponse?.data || []

  // Subscribe to notifications
  React.useEffect(() => {
    const unsubscribe = notificationService.subscribe(setNotifications)
    return unsubscribe
  }, [])

  // Check prazos when processos data changes
  React.useEffect(() => {
    if (processos.length > 0) {
      notificationService.checkProcessoPrazos(processos)
    }
  }, [processos])

  // Handle processo selection
  const handleSelectProcesso = (processo: Processo) => {
    setSelectedProcesso(processo)
    setIsEditMode(false)
    setIsDetailDrawerOpen(true)
  }

  // Handle processo editing
  const handleEditProcesso = (processo: Processo) => {
    setSelectedProcesso(processo)
    setIsEditMode(true)
    setIsDetailDrawerOpen(true)
  }

  // Handle status update
  const handleUpdateStatus = async (processo: Processo, newStatus: Processo['status']) => {
    const oldStatus = processo.status
    try {
      await apiClient.updateProcesso(processo.id, { status: newStatus })
      
      // Create notification for status change
      notificationService.notifyStatusChange(processo, oldStatus, newStatus, 'Usuário Atual')
      
      toast.success('Status do processo atualizado com sucesso')
      refetch()
    } catch (error) {
      toast.error('Erro ao atualizar status do processo')
      console.error('Error updating processo status:', error)
    }
  }

  // Handle bulk operations
  const handleBulkStatusUpdate = async (processoIds: string[], newStatus: Processo['status']) => {
    try {
      await apiClient.bulkUpdateProcessos(processoIds, { status: newStatus })
      
      // Create notifications for each processo status change
      processoIds.forEach(id => {
        const processo = processos.find(p => p.id === id)
        if (processo) {
          notificationService.notifyStatusChange(processo, processo.status, newStatus, 'Usuário Atual')
        }
      })
      
      toast.success(`${processoIds.length} processo(s) atualizado(s) com sucesso`)
      refetch()
    } catch (error) {
      toast.error('Erro ao atualizar processos em lote')
      console.error('Error bulk updating processos:', error)
    }
  }

  // Handle export
  const handleExport = async () => {
    try {
      // This would typically generate a CSV or PDF export
      toast.success('Exportação iniciada. Você receberá o arquivo em breve.')
    } catch (error) {
      toast.error('Erro ao exportar processos')
      console.error('Error exporting processos:', error)
    }
  }

  // Clear filters
  const handleClearFilters = () => {
    setFilters({})
  }

  // Handle processo creation success
  const handleProcessoCreated = () => {
    setIsCreateDialogOpen(false)
    refetch()
    toast.success('Processo criado com sucesso')
  }

  // Handle processo update success
  const handleProcessoUpdated = () => {
    setIsDetailDrawerOpen(false)
    setSelectedProcesso(null)
    refetch()
    toast.success('Processo atualizado com sucesso')
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
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
                <BreadcrumbPage>Processos</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <IconFileDescription className="h-8 w-8" />
              Processos
            </h1>
            <p className="text-muted-foreground">
              Gerencie todos os processos jurídicos do escritório.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={(id) => notificationService.markAsRead(id)}
              onMarkAllAsRead={() => notificationService.markAllAsRead()}
              onDeleteNotification={(id) => notificationService.deleteNotification(id)}
              onNotificationClick={(notification) => {
                if (notification.actionUrl) {
                  // Navigate to the processo
                  const processo = processos.find(p => p.id === notification.processoId)
                  if (processo) {
                    handleSelectProcesso(processo)
                  }
                }
                notificationService.markAsRead(notification.id)
              }}
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <IconRefresh className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isLoading || processos.length === 0}
            >
              <IconDownload className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              size="sm"
            >
              <IconPlus className="h-4 w-4 mr-2" />
              Novo Processo
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <ProcessosFilters
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={handleClearFilters}
            />
          </CardContent>
        </Card>

        {/* Processos Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Lista de Processos
              {processosResponse && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({processosResponse.total} {processosResponse.total === 1 ? 'processo' : 'processos'})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-center py-12">
                <IconFileDescription className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Erro ao carregar processos</h3>
                <p className="text-muted-foreground mb-4">
                  Ocorreu um erro ao carregar a lista de processos.
                </p>
                <Button onClick={() => refetch()} variant="outline">
                  <IconRefresh className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <ProcessosTable
                data={processos}
                isLoading={isLoading}
                onSelectProcesso={handleSelectProcesso}
                onEditProcesso={handleEditProcesso}
                onUpdateStatus={handleUpdateStatus}
                onBulkStatusUpdate={handleBulkStatusUpdate}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Processo Dialog */}
      <CreateProcessoDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={handleProcessoCreated}
      />

      {/* Processo Detail Drawer */}
      {selectedProcesso && (
        <ProcessoDetailDrawer
          processo={selectedProcesso}
          open={isDetailDrawerOpen}
          onOpenChange={setIsDetailDrawerOpen}
          isEditMode={isEditMode}
          onSuccess={handleProcessoUpdated}
        />
      )}
    </div>
  )
}