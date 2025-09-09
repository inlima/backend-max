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
  IconTrendingUp,
  IconClock,
  IconStar,
  IconActivity
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface DashboardMetrics {
  totalContatos: number
  contatosHoje: number
  processosAtivos: number
  taxaResposta: number
  tempoMedioResposta: string
  satisfacaoCliente: number
}

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
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    // Simular carregamento de dados
    const loadDashboardData = async () => {
      try {
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Dados mock para demonstração
        setMetrics({
          totalContatos: 156,
          contatosHoje: 12,
          processosAtivos: 23,
          taxaResposta: 94.5,
          tempoMedioResposta: "2h 15min",
          satisfacaoCliente: 4.7
        })

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
          }
        ])
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error)
      } finally {
        setLoadingData(false)
      }
    }

    if (isAuthenticated) {
      loadDashboardData()
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
                <BreadcrumbPage>Visão Geral</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Bem-vindo, {user?.name}!
          </h1>
          <p className="text-muted-foreground">
            Aqui está um resumo das atividades do seu escritório hoje.
          </p>
        </div>

        {/* Metrics Cards */}
        {loadingData ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Contatos
                </CardTitle>
                <IconUsers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalContatos}</div>
                <p className="text-xs text-muted-foreground">
                  +{metrics?.contatosHoje} hoje
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Processos Ativos
                </CardTitle>
                <IconFileDescription className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.processosAtivos}</div>
                <p className="text-xs text-muted-foreground">
                  Em andamento
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Taxa de Resposta
                </CardTitle>
                <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.taxaResposta}%</div>
                <Progress value={metrics?.taxaResposta} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Satisfação
                </CardTitle>
                <IconStar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.satisfacaoCliente}/5</div>
                <p className="text-xs text-muted-foreground">
                  Avaliação média
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>
                Últimas atividades do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${getActivityColor(activity.tipo)}`}>
                        {getActivityIcon(activity.tipo)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {activity.descricao}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activity.contato} • {activity.telefone}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Tempo Médio de Resposta</CardTitle>
              <CardDescription>
                Performance do atendimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <IconClock className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{metrics?.tempoMedioResposta}</div>
                  <p className="text-xs text-muted-foreground">
                    Tempo médio de primeira resposta
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Meta: 2h</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Dentro da meta
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}