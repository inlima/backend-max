'use client'

import { useAuth } from '@/providers/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  IconUsers,
  IconFileDescription,
  IconMessageCircle,
  IconActivity,
  IconRefresh,
  IconClock
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EnhancedMetricsCards } from '@/components/enhanced-metrics-cards'
import { DashboardChartsSection } from '@/components/dashboard-charts-section'
import { RealTimeActivityFeed } from '@/components/real-time-activity-feed'
import { DashboardFiltersExport } from '@/components/dashboard-filters-export'
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics'
import { useDashboardCharts } from '@/hooks/use-dashboard-charts'
import { useActivityFeed } from '@/hooks/use-activity-feed'
import { useDashboardFilters } from '@/hooks/use-dashboard-filters'

// Remove the local interface since we're using the one from types

interface ActivityItem {
  id: string
  tipo: string
  descricao: string
  contato: string
  telefone: string
  timestamp: Date
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const { metrics, isLoading: metricsLoading, error: metricsError, refresh } = useDashboardMetrics()
  const { charts, isLoading: chartsLoading, updateDateRange } = useDashboardCharts()
  const { activities, isLoading: activitiesLoading } = useActivityFeed({ enableRealTime: true })
  const { 
    filters, 
    setFilters, 
    exportDashboard, 
    isExporting,
    autoRefreshEnabled,
    toggleAutoRefresh 
  } = useDashboardFilters({ persistFilters: true, autoRefresh: true })
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    // Load recent activity data
    const loadActivityData = async () => {
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800))

        setRecentActivity([
          {
            id: '1',
            tipo: 'Contato',
            descricao: 'Novo contato via WhatsApp',
            contato: 'Maria Silva',
            telefone: '(11) 99999-9999',
            timestamp: new Date(Date.now() - 5 * 60 * 1000)
          },
          {
            id: '2',
            tipo: 'Processo',
            descricao: 'Processo atualizado',
            contato: 'João Santos',
            telefone: '(11) 88888-8888',
            timestamp: new Date(Date.now() - 15 * 60 * 1000)
          },
          {
            id: '3',
            tipo: 'Mensagem',
            descricao: 'Nova mensagem recebida',
            contato: 'Ana Costa',
            telefone: '(11) 77777-7777',
            timestamp: new Date(Date.now() - 30 * 60 * 1000)
          },
          {
            id: '4',
            tipo: 'Documento',
            descricao: 'Documento anexado ao processo',
            contato: 'Carlos Oliveira',
            telefone: '(11) 66666-6666',
            timestamp: new Date(Date.now() - 45 * 60 * 1000)
          },
          {
            id: '5',
            tipo: 'Prazo',
            descricao: 'Prazo próximo ao vencimento',
            contato: 'Fernanda Lima',
            telefone: '(11) 55555-5555',
            timestamp: new Date(Date.now() - 60 * 60 * 1000)
          }
        ])
      } catch (error) {
        console.error('Erro ao carregar atividades:', error)
      } finally {
        setLoadingData(false)
      }
    }

    if (isAuthenticated) {
      loadActivityData()
    }
  }, [isAuthenticated])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Redirecionando para login...</p>
        </div>
      </div>
    )
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Agora mesmo'
    if (diffInMinutes < 60) return `${diffInMinutes}min atrás`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h atrás`

    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d atrás`
  }

  const getActivityIcon = (tipo: string) => {
    switch (tipo) {
      case 'Contato':
        return <IconUsers className="h-4 w-4" />
      case 'Processo':
        return <IconFileDescription className="h-4 w-4" />
      case 'Mensagem':
        return <IconMessageCircle className="h-4 w-4" />
      default:
        return <IconActivity className="h-4 w-4" />
    }
  }

  const getActivityColor = (tipo: string) => {
    switch (tipo) {
      case 'Contato':
        return 'bg-blue-100 text-blue-800'
      case 'Processo':
        return 'bg-green-100 text-green-800'
      case 'Mensagem':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
                <BreadcrumbPage>Visão Geral</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col gap-4 p-4 pt-0" id="main-content" role="main">
        {/* Welcome Section */}
        <section className="mb-6 flex items-center justify-between" aria-labelledby="welcome-heading">
          <div>
            <h1 id="welcome-heading" className="text-3xl font-bold tracking-tight">
              Bem-vindo, {user?.name}!
            </h1>
            <p className="text-muted-foreground">
              Aqui está um resumo das atividades do seu escritório hoje.
              {autoRefreshEnabled && (
                <span className="ml-2 text-green-600 text-sm" role="status" aria-live="polite">
                  • Atualização automática ativa
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={metricsLoading || isExporting}
            className="flex items-center gap-2"
            aria-label={metricsLoading ? 'Atualizando dados...' : 'Atualizar dados do dashboard'}
          >
            <IconRefresh 
              className={`h-4 w-4 ${metricsLoading ? 'animate-spin' : ''}`} 
              aria-hidden="true"
            />
            Atualizar
          </Button>
        </section>

        {/* Dashboard Filters and Export */}
        <DashboardFiltersExport
          filters={filters}
          onFiltersChange={setFilters}
          onExport={exportDashboard}
          onRefresh={refresh}
          isLoading={metricsLoading || chartsLoading}
          className="mb-6"
        />

        {/* Enhanced Metrics Cards */}
        <EnhancedMetricsCards 
          metrics={metrics} 
          isLoading={metricsLoading}
          className="mb-6"
        />

        {/* Error handling for metrics */}
        {metricsError && (
          <Card className="mb-6 border-red-200 bg-red-50" role="alert" aria-live="assertive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800">
                <IconActivity className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm font-medium">
                  Erro ao carregar métricas: {metricsError.message}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Charts Section */}
        <DashboardChartsSection 
          charts={charts}
          isLoading={chartsLoading}
          onDateRangeChange={updateDateRange}
          className="mb-6"
        />

        {/* Real-time Activity Feed */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-7" aria-labelledby="activity-section-heading">
          <div className="col-span-4">
            <h2 id="activity-section-heading" className="sr-only">Feed de Atividades em Tempo Real</h2>
            <RealTimeActivityFeed
              activities={activities}
              isLoading={activitiesLoading}
              showFilters={true}
              enableRealTime={true}
              maxItems={50}
              onActivityClick={(activity) => {
                console.log('Activity clicked:', activity)
                // Handle activity click - could open a modal or navigate
              }}
            />
          </div>

          <Card className="col-span-3" role="region" aria-labelledby="response-time-heading">
            <CardHeader>
              <CardTitle id="response-time-heading">Tempo Médio de Resposta</CardTitle>
              <CardDescription>
                Performance do atendimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <IconClock className="h-8 w-8 text-blue-600" aria-hidden="true" />
                <div>
                  <div className="text-2xl font-bold" aria-label={`Tempo médio de resposta: ${metrics?.tempoMedioResposta}`}>
                    {metrics?.tempoMedioResposta}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tempo médio de primeira resposta
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Meta: 2h</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800" role="status">
                    Dentro da meta
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}