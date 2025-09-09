import { 
  IconTrendingDown, 
  IconTrendingUp, 
  IconUsers, 
  IconFileDescription, 
  IconClock, 
  IconStar,
  IconCircleCheckFilled 
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardMetrics } from "@/types"

interface SectionCardsProps {
  metrics?: DashboardMetrics
  isLoading?: boolean
}

// Helper function to calculate growth percentage (mock for now)
function calculateGrowth(current: number, previous?: number): number {
  if (!previous) return 0
  return Math.round(((current - previous) / previous) * 100)
}

// Helper function to format response time
function formatResponseTime(timeString: string): string {
  return timeString || "N/A"
}

export function SectionCards({ metrics, isLoading }: SectionCardsProps) {
  if (isLoading) {
    return (
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="@container/card">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }

  // Default values if metrics are not available
  const defaultMetrics: DashboardMetrics = {
    totalContatos: 0,
    contatosHoje: 0,
    processosAtivos: 0,
    taxaResposta: 0,
    tempoMedioResposta: "0min",
    satisfacaoCliente: 0
  }

  const data = metrics || defaultMetrics

  // Mock growth calculations (in real implementation, these would come from API)
  const contatosGrowth = calculateGrowth(data.contatosHoje, 15) // Mock previous day value
  const processosGrowth = calculateGrowth(data.processosAtivos, 45) // Mock previous value
  const taxaGrowth = calculateGrowth(data.taxaResposta, 75) // Mock previous value
  const satisfacaoGrowth = calculateGrowth(data.satisfacaoCliente, 4.2) // Mock previous value

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 sm:grid-cols-2 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Contatos Hoje Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Contatos Hoje</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.contatosHoje}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {contatosGrowth >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {contatosGrowth >= 0 ? '+' : ''}{contatosGrowth}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Novos contatos via WhatsApp <IconUsers className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Últimas 24 horas
          </div>
        </CardFooter>
      </Card>

      {/* Processos Ativos Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Processos Ativos</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.processosAtivos}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {processosGrowth >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {processosGrowth >= 0 ? '+' : ''}{processosGrowth}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Em andamento <IconFileDescription className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Requer acompanhamento
          </div>
        </CardFooter>
      </Card>

      {/* Taxa de Resposta Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Taxa de Resposta</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.taxaResposta}%
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {taxaGrowth >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {taxaGrowth >= 0 ? '+' : ''}{taxaGrowth}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Conversas completadas <IconCircleCheckFilled className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Meta: 80%
          </div>
        </CardFooter>
      </Card>

      {/* Satisfação Cliente Card */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Satisfação Cliente</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {data.satisfacaoCliente.toFixed(1)}/5
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {satisfacaoGrowth >= 0 ? <IconTrendingUp /> : <IconTrendingDown />}
              {satisfacaoGrowth >= 0 ? '+' : ''}{satisfacaoGrowth}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Avaliação média <IconStar className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Baseado em pesquisas
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
