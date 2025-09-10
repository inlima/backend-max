"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  IconTrendingUp, 
  IconTrendingDown, 
  IconUsers, 
  IconPhone, 
  IconMail, 
  IconStar,
  IconTarget,
  IconClock,
  IconChartBar,
  IconChartPie
} from "@tabler/icons-react"
import { Contato } from "@/types"

interface ContatosAnalyticsProps {
  contatos: Contato[]
}

interface AnalyticsMetrics {
  totalContatos: number
  novosMes: number
  taxaConversao: number
  tempoMedioResposta: number
  contatosFavoritos: number
  distribuicaoOrigem: { origem: string; count: number; percentage: number }[]
  distribuicaoStatus: { status: string; count: number; percentage: number }[]
  distribuicaoArea: { area: string; count: number; percentage: number }[]
  leadQualification: { score: string; count: number; percentage: number }[]
  interactionFrequency: { frequency: string; count: number; percentage: number }[]
  lifecycleStages: { stage: string; count: number; percentage: number }[]
}

export function ContatosAnalytics({ contatos }: ContatosAnalyticsProps) {
  const metrics = React.useMemo((): AnalyticsMetrics => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Basic metrics
    const totalContatos = contatos.length
    const novosMes = contatos.filter(c => new Date(c.primeiroContato) >= thisMonth).length
    const contatosFavoritos = contatos.filter(c => (c as any).favorito).length
    
    // Mock conversion rate and response time (would come from real data)
    const taxaConversao = Math.round((contatos.filter(c => c.status === 'finalizado').length / totalContatos) * 100)
    const tempoMedioResposta = 2.5 // hours
    
    // Distribution calculations
    const distribuicaoOrigem = ['whatsapp', 'manual'].map(origem => {
      const count = contatos.filter(c => c.origem === origem).length
      return {
        origem: origem === 'whatsapp' ? 'WhatsApp' : 'Manual',
        count,
        percentage: Math.round((count / totalContatos) * 100)
      }
    })
    
    const distribuicaoStatus = ['novo', 'existente', 'em_atendimento', 'finalizado'].map(status => {
      const count = contatos.filter(c => c.status === status).length
      return {
        status: status === 'novo' ? 'Novo' :
                status === 'existente' ? 'Existente' :
                status === 'em_atendimento' ? 'Em Atendimento' : 'Finalizado',
        count,
        percentage: Math.round((count / totalContatos) * 100)
      }
    })
    
    // Area distribution
    const areaMap = new Map<string, number>()
    contatos.forEach(c => {
      if (c.areaInteresse) {
        areaMap.set(c.areaInteresse, (areaMap.get(c.areaInteresse) || 0) + 1)
      }
    })
    
    const distribuicaoArea = Array.from(areaMap.entries()).map(([area, count]) => ({
      area,
      count,
      percentage: Math.round((count / totalContatos) * 100)
    })).sort((a, b) => b.count - a.count).slice(0, 5)
    
    // Mock lead qualification scores
    const leadQualification = [
      { score: 'Alto', count: Math.floor(totalContatos * 0.2), percentage: 20 },
      { score: 'Médio', count: Math.floor(totalContatos * 0.5), percentage: 50 },
      { score: 'Baixo', count: Math.floor(totalContatos * 0.3), percentage: 30 },
    ]
    
    // Mock interaction frequency
    const interactionFrequency = [
      { frequency: 'Diária', count: Math.floor(totalContatos * 0.15), percentage: 15 },
      { frequency: 'Semanal', count: Math.floor(totalContatos * 0.35), percentage: 35 },
      { frequency: 'Mensal', count: Math.floor(totalContatos * 0.30), percentage: 30 },
      { frequency: 'Esporádica', count: Math.floor(totalContatos * 0.20), percentage: 20 },
    ]
    
    // Mock lifecycle stages
    const lifecycleStages = [
      { stage: 'Lead', count: Math.floor(totalContatos * 0.4), percentage: 40 },
      { stage: 'Prospect', count: Math.floor(totalContatos * 0.3), percentage: 30 },
      { stage: 'Cliente', count: Math.floor(totalContatos * 0.2), percentage: 20 },
      { stage: 'Inativo', count: Math.floor(totalContatos * 0.1), percentage: 10 },
    ]
    
    return {
      totalContatos,
      novosMes,
      taxaConversao,
      tempoMedioResposta,
      contatosFavoritos,
      distribuicaoOrigem,
      distribuicaoStatus,
      distribuicaoArea,
      leadQualification,
      interactionFrequency,
      lifecycleStages
    }
  }, [contatos])

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    trendValue 
  }: {
    title: string
    value: string | number
    subtitle?: string
    icon: React.ElementType
    trend?: 'up' | 'down'
    trendValue?: string
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trend && trendValue && (
          <div className={`flex items-center text-xs ${
            trend === 'up' ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? (
              <IconTrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <IconTrendingDown className="h-3 w-3 mr-1" />
            )}
            {trendValue}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const DistributionCard = ({ 
    title, 
    data, 
    icon: Icon 
  }: {
    title: string
    data: { label: string; count: number; percentage: number }[]
    icon: React.ElementType
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{item.count}</span>
                <Badge variant="secondary" className="text-xs">
                  {item.percentage}%
                </Badge>
              </div>
            </div>
            <Progress value={item.percentage} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Contatos"
          value={metrics.totalContatos}
          icon={IconUsers}
          subtitle="Todos os contatos"
        />
        <MetricCard
          title="Novos este Mês"
          value={metrics.novosMes}
          icon={IconTrendingUp}
          subtitle="Contatos adicionados"
          trend="up"
          trendValue="+12% vs mês anterior"
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${metrics.taxaConversao}%`}
          icon={IconTarget}
          subtitle="Lead para cliente"
          trend="up"
          trendValue="+5% vs mês anterior"
        />
        <MetricCard
          title="Tempo Médio de Resposta"
          value={`${metrics.tempoMedioResposta}h`}
          icon={IconClock}
          subtitle="Primeira resposta"
          trend="down"
          trendValue="-0.5h vs mês anterior"
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="source" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="source">Origem</TabsTrigger>
          <TabsTrigger value="qualification">Qualificação</TabsTrigger>
          <TabsTrigger value="interaction">Interação</TabsTrigger>
          <TabsTrigger value="lifecycle">Ciclo de Vida</TabsTrigger>
        </TabsList>

        <TabsContent value="source" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DistributionCard
              title="Distribuição por Origem"
              icon={IconPhone}
              data={metrics.distribuicaoOrigem.map(item => ({
                label: item.origem,
                count: item.count,
                percentage: item.percentage
              }))}
            />
            <DistributionCard
              title="Distribuição por Status"
              icon={IconChartBar}
              data={metrics.distribuicaoStatus.map(item => ({
                label: item.status,
                count: item.count,
                percentage: item.percentage
              }))}
            />
          </div>
          
          {metrics.distribuicaoArea.length > 0 && (
            <DistributionCard
              title="Top 5 Áreas de Interesse"
              icon={IconChartPie}
              data={metrics.distribuicaoArea.map(item => ({
                label: item.area,
                count: item.count,
                percentage: item.percentage
              }))}
            />
          )}
        </TabsContent>

        <TabsContent value="qualification" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DistributionCard
              title="Pontuação de Qualificação de Leads"
              icon={IconTarget}
              data={metrics.leadQualification.map(item => ({
                label: `${item.score} Potencial`,
                count: item.count,
                percentage: item.percentage
              }))}
            />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconStar className="h-5 w-5" />
                  Contatos Favoritos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.contatosFavoritos}</div>
                <p className="text-sm text-muted-foreground">
                  {Math.round((metrics.contatosFavoritos / metrics.totalContatos) * 100)}% do total
                </p>
                <Progress 
                  value={(metrics.contatosFavoritos / metrics.totalContatos) * 100} 
                  className="h-2 mt-2" 
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="interaction" className="space-y-4">
          <DistributionCard
            title="Frequência de Interação"
            icon={IconMail}
            data={metrics.interactionFrequency.map(item => ({
              label: item.frequency,
              count: item.count,
              percentage: item.percentage
            }))}
          />
        </TabsContent>

        <TabsContent value="lifecycle" className="space-y-4">
          <DistributionCard
            title="Estágios do Ciclo de Vida"
            icon={IconUsers}
            data={metrics.lifecycleStages.map(item => ({
              label: item.stage,
              count: item.count,
              percentage: item.percentage
            }))}
          />
        </TabsContent>
      </Tabs>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Insights e Recomendações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">📈 Oportunidades</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {metrics.novosMes} novos contatos este mês - tendência positiva</li>
                <li>• Taxa de conversão de {metrics.taxaConversao}% está acima da média</li>
                <li>• Tempo de resposta melhorou em 0.5h</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">⚠️ Pontos de Atenção</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {metrics.distribuicaoStatus.find(s => s.status === 'Novo')?.count || 0} contatos novos precisam de atenção</li>
                <li>• Considere campanhas para áreas menos procuradas</li>
                <li>• Implemente follow-up automático para leads frios</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}