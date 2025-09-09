'use client'

import { 
  IconMessage, 
  IconFileDescription, 
  IconSettings, 
  IconUser,
  IconClock,
  IconPhone
} from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ActivityItem } from "@/types"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface RecentActivityTableProps {
  data?: ActivityItem[]
  isLoading?: boolean
  error?: Error
}

// Helper function to get icon based on activity type
function getActivityIcon(tipo: string) {
  switch (tipo) {
    case 'contato':
      return <IconUser className="h-4 w-4" />
    case 'processo':
      return <IconFileDescription className="h-4 w-4" />
    case 'sistema':
      return <IconSettings className="h-4 w-4" />
    default:
      return <IconMessage className="h-4 w-4" />
  }
}

// Helper function to get badge variant based on activity type
function getBadgeVariant(tipo: string): "default" | "secondary" | "destructive" | "outline" {
  switch (tipo) {
    case 'contato':
      return 'default'
    case 'processo':
      return 'secondary'
    case 'sistema':
      return 'outline'
    default:
      return 'outline'
  }
}

// Helper function to format relative time
function formatRelativeTime(timestamp: Date): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { 
      addSuffix: true, 
      locale: ptBR 
    })
  } catch {
    return 'Agora mesmo'
  }
}

export function RecentActivityTable({ data, isLoading, error }: RecentActivityTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
          <CardDescription>Erro ao carregar atividades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Não foi possível carregar as atividades recentes
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconClock className="h-5 w-5" />
          Atividades Recentes
        </CardTitle>
        <CardDescription>
          Últimas interações e atualizações do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Horário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                      {getActivityIcon(activity.tipo)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium leading-none">
                        {activity.titulo}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.descricao}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getBadgeVariant(activity.tipo)}>
                      {activity.tipo === 'contato' && 'Contato'}
                      {activity.tipo === 'processo' && 'Processo'}
                      {activity.tipo === 'sistema' && 'Sistema'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {activity.usuario || 'Sistema'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm text-muted-foreground">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <IconMessage className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nenhuma atividade recente encontrada</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}