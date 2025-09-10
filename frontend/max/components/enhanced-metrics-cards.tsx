'use client'

import { 
  IconTrendingDown, 
  IconTrendingUp, 
  IconUsers, 
  IconFileDescription, 
  IconStar,
  IconCurrencyReal,
  IconTarget,
  IconChartLine
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardMetricsEnhanced } from "@/types"
import { cn } from "@/lib/utils"

interface EnhancedMetricsCardsProps {
  metrics?: DashboardMetricsEnhanced | null
  isLoading?: boolean
  className?: string
}

// Helper function to format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Helper function to format percentage
function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

// Helper function to get trend color
function getTrendColor(value: number): string {
  if (value > 0) return "text-green-600 bg-green-50 border-green-200"
  if (value < 0) return "text-red-600 bg-red-50 border-red-200"
  return "text-gray-600 bg-gray-50 border-gray-200"
}

// Helper function to get trend icon
function getTrendIcon(value: number) {
  return value >= 0 ? <IconTrendingUp className="h-3 w-3" /> : <IconTrendingDown className="h-3 w-3" />
}

export function EnhancedMetricsCards({ metrics, isLoading, className }: EnhancedMetricsCardsProps) {
  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
            </CardHeader>
            <div className="px-6 pb-2">
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-4 w-20" />
            </div>
            <CardFooter className="pt-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  // Default values if metrics are not available
  const defaultMetrics: DashboardMetricsEnhanced = {
    totalContatos: 0,
    contatosHoje: 0,
    processosAtivos: 0,
    taxaResposta: 0,
    tempoMedioResposta: "0min",
    satisfacaoCliente: 0,
    crescimentoContatos: 0,
    crescimentoProcessos: 0,
    taxaConversao: 0,
    receitaMensal: 0,
    projecaoReceita: 0,
    tempoMedioResolucao: 0,
    npsScore: 0
  }

  const data = metrics || defaultMetrics

  const cards = [
    {
      title: "Total de Contatos",
      value: data.totalContatos.toLocaleString('pt-BR'),
      subtitle: `+${data.contatosHoje} hoje`,
      trend: data.crescimentoContatos,
      icon: <IconUsers className="h-4 w-4" />,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Contatos cadastrados"
    },
    {
      title: "Processos Ativos",
      value: data.processosAtivos.toString(),
      subtitle: "Em andamento",
      trend: data.crescimentoProcessos,
      icon: <IconFileDescription className="h-4 w-4" />,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Casos em tramitação"
    },
    {
      title: "Taxa de Conversão",
      value: `${data.taxaConversao.toFixed(1)}%`,
      subtitle: "Lead → Cliente",
      trend: data.taxaConversao - 15, // Mock previous value
      icon: <IconTarget className="h-4 w-4" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Conversão de leads",
      progress: data.taxaConversao
    },
    {
      title: "Receita Mensal",
      value: formatCurrency(data.receitaMensal),
      subtitle: "Este mês",
      trend: ((data.receitaMensal - (data.receitaMensal * 0.85)) / (data.receitaMensal * 0.85)) * 100, // Mock calculation
      icon: <IconCurrencyReal className="h-4 w-4" />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      description: "Faturamento atual"
    },
    {
      title: "Satisfação (NPS)",
      value: `${data.npsScore}`,
      subtitle: `${data.satisfacaoCliente.toFixed(1)}/5 estrelas`,
      trend: data.npsScore - 65, // Mock previous NPS
      icon: <IconStar className="h-4 w-4" />,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      description: "Net Promoter Score",
      progress: Math.max(0, (data.npsScore + 100) / 2) // Convert NPS (-100 to 100) to percentage
    },
    {
      title: "Taxa de Resposta",
      value: `${data.taxaResposta.toFixed(1)}%`,
      subtitle: data.tempoMedioResposta,
      trend: data.taxaResposta - 85, // Mock previous value
      icon: <IconChartLine className="h-4 w-4" />,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      description: "Tempo médio de resposta",
      progress: data.taxaResposta
    }
  ]

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6", className)}>
      {cards.map((card, index) => (
        <Card key={index} className="relative overflow-hidden transition-all duration-200 hover:shadow-md">
          {/* Background gradient */}
          <div className={cn("absolute inset-0 opacity-5", card.bgColor)} />
          
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs font-medium text-muted-foreground">
                {card.title}
              </CardDescription>
              <div className={cn("p-1.5 rounded-md", card.bgColor, card.color)}>
                {card.icon}
              </div>
            </div>
          </CardHeader>
          
          <div className="px-6 pb-2">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {card.value}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {card.subtitle}
            </p>
          </div>

          {/* Progress bar for percentage metrics */}
          {card.progress !== undefined && (
            <div className="px-6 pb-2">
              <Progress 
                value={card.progress} 
                className="h-1.5"
              />
            </div>
          )}

          <CardFooter className="pt-2">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs font-medium border",
                    getTrendColor(card.trend)
                  )}
                >
                  {getTrendIcon(card.trend)}
                  {formatPercentage(card.trend)}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                vs. período anterior
              </span>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}