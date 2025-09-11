"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartDataPoint } from "@/types"

export const description = "Interactive chart for legal practice metrics"

// Default/mock data for when no data is provided
const defaultChartData: ChartDataPoint[] = [
  { date: "2024-12-01", contatos: 12, processos: 8, respostas: 10 },
  { date: "2024-12-02", contatos: 15, processos: 6, respostas: 14 },
  { date: "2024-12-03", contatos: 8, processos: 10, respostas: 7 },
  { date: "2024-12-04", contatos: 20, processos: 12, respostas: 18 },
  { date: "2024-12-05", contatos: 18, processos: 9, respostas: 16 },
  { date: "2024-12-06", contatos: 22, processos: 15, respostas: 20 },
  { date: "2024-12-07", contatos: 14, processos: 7, respostas: 12 },
  { date: "2024-12-08", contatos: 25, processos: 18, respostas: 23 },
  { date: "2024-12-09", contatos: 16, processos: 11, respostas: 15 },
  { date: "2024-12-10", contatos: 19, processos: 13, respostas: 17 },
  { date: "2024-12-11", contatos: 21, processos: 16, respostas: 19 },
  { date: "2024-12-12", contatos: 17, processos: 9, respostas: 15 },
  { date: "2024-12-13", contatos: 23, processos: 14, respostas: 21 },
  { date: "2024-12-14", contatos: 13, processos: 8, respostas: 11 },
  { date: "2024-12-15", contatos: 26, processos: 19, respostas: 24 },
  { date: "2024-12-16", contatos: 18, processos: 12, respostas: 16 },
  { date: "2024-12-17", contatos: 24, processos: 17, respostas: 22 },
  { date: "2024-12-18", contatos: 20, processos: 14, respostas: 18 },
  { date: "2024-12-19", contatos: 15, processos: 10, respostas: 13 },
  { date: "2024-12-20", contatos: 28, processos: 21, respostas: 26 },
  { date: "2024-12-21", contatos: 22, processos: 16, respostas: 20 },
  { date: "2024-12-22", contatos: 19, processos: 13, respostas: 17 },
  { date: "2024-12-23", contatos: 16, processos: 11, respostas: 14 },
  { date: "2024-12-24", contatos: 12, processos: 7, respostas: 10 },
  { date: "2024-12-25", contatos: 8, processos: 4, respostas: 6 },
  { date: "2024-12-26", contatos: 14, processos: 9, respostas: 12 },
  { date: "2024-12-27", contatos: 25, processos: 18, respostas: 23 },
  { date: "2024-12-28", contatos: 21, processos: 15, respostas: 19 },
  { date: "2024-12-29", contatos: 18, processos: 12, respostas: 16 },
  { date: "2024-12-30", contatos: 23, processos: 17, respostas: 21 },
]

const chartConfig = {
  contatos: {
    label: "Contatos",
    color: "hsl(var(--chart-1))",
  },
  processos: {
    label: "Processos",
    color: "hsl(var(--chart-2))",
  },
  respostas: {
    label: "Respostas",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

interface ChartAreaInteractiveProps {
  data?: ChartDataPoint[]
  isLoading?: boolean
  error?: Error
}

export function ChartAreaInteractive({ data, isLoading, error }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  // Use provided data or fallback to default data
  const chartData = data || defaultChartData

  const filteredData = React.useMemo(() => {
    const today = new Date()
    let daysToSubtract = 30
    
    if (timeRange === "90d") {
      daysToSubtract = 90
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    
    return chartData.filter((item) => {
      const itemDate = new Date(item.date)
      return itemDate >= startDate
    })
  }, [chartData, timeRange])

  if (isLoading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <Skeleton className="aspect-auto h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Tendências do Escritório</CardTitle>
          <CardDescription>Erro ao carregar dados do gráfico</CardDescription>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-center h-[250px] text-muted-foreground">
            Não foi possível carregar os dados do gráfico
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Tendências do Escritório</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Contatos, processos e respostas dos últimos {timeRange === "7d" ? "7 dias" : timeRange === "30d" ? "30 dias" : "3 meses"}
          </span>
          <span className="@[540px]/card:hidden">
            Últimos {timeRange === "7d" ? "7 dias" : timeRange === "30d" ? "30 dias" : "3 meses"}
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Últimos 3 meses</ToggleGroupItem>
            <ToggleGroupItem value="30d">Últimos 30 dias</ToggleGroupItem>
            <ToggleGroupItem value="7d">Últimos 7 dias</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Selecionar período"
            >
              <SelectValue placeholder="Últimos 30 dias" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Últimos 3 meses
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Últimos 30 dias
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Últimos 7 dias
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillContatos" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-contatos)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-contatos)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillProcessos" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-processos)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-processos)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillRespostas" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-respostas)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-respostas)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("pt-BR", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("pt-BR", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="contatos"
              type="natural"
              fill="url(#fillContatos)"
              stroke="var(--color-contatos)"
              stackId="a"
            />
            <Area
              dataKey="processos"
              type="natural"
              fill="url(#fillProcessos)"
              stroke="var(--color-processos)"
              stackId="a"
            />
            <Area
              dataKey="respostas"
              type="natural"
              fill="url(#fillRespostas)"
              stroke="var(--color-respostas)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
