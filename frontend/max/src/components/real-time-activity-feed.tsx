'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  IconUsers,
  IconFileDescription,
  IconMessageCircle,
  IconFile,
  IconClock,
  IconCalendar,
  IconFilter,
  IconSearch,
  IconRefresh,
  IconBell,
  IconEye,
  IconEyeOff,
  IconArrowUp,
  IconArrowDown,
  IconDots
} from '@tabler/icons-react'
import { ActivityFeedItem } from '@/types'
import { cn } from '@/lib/utils'

interface RealTimeActivityFeedProps {
  activities?: ActivityFeedItem[]
  isLoading?: boolean
  className?: string
  maxItems?: number
  showFilters?: boolean
  enableRealTime?: boolean
  onActivityClick?: (activity: ActivityFeedItem) => void
}

// Activity type configurations
const activityConfig = {
  contato: {
    icon: IconUsers,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Contato'
  },
  processo: {
    icon: IconFileDescription,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Processo'
  },
  mensagem: {
    icon: IconMessageCircle,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'Mensagem'
  },
  documento: {
    icon: IconFile,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Documento'
  }
}

// Mock activity generator
function generateMockActivity(): ActivityFeedItem {
  const types = ['contato', 'processo', 'mensagem', 'documento'] as const
  const actions = {
    contato: ['criado', 'atualizado', 'marcado como favorito', 'status alterado'],
    processo: ['criado', 'atualizado', 'prazo definido', 'documento anexado', 'status alterado'],
    mensagem: ['recebida', 'enviada', 'lida', 'respondida'],
    documento: ['anexado', 'atualizado', 'removido', 'compartilhado']
  }
  
  const users = ['João Silva', 'Maria Santos', 'Carlos Oliveira', 'Ana Costa', 'Sistema']
  const contacts = ['Cliente A', 'Cliente B', 'Cliente C', 'Prospect D', 'Lead E']
  
  const type = types[Math.floor(Math.random() * types.length)]
  const action = actions[type][Math.floor(Math.random() * actions[type].length)]
  const user = users[Math.floor(Math.random() * users.length)]
  const contact = contacts[Math.floor(Math.random() * contacts.length)]
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    action,
    description: `${contact} ${action}`,
    user,
    timestamp: new Date(Date.now() - Math.random() * 3600000), // Random time in last hour
    metadata: {
      contactId: Math.random().toString(36).substr(2, 9),
      priority: Math.random() > 0.7 ? 'high' : 'normal',
      source: Math.random() > 0.5 ? 'whatsapp' : 'manual'
    }
  }
}

function ActivityItem({ 
  activity, 
  onClick, 
  isNew = false 
}: { 
  activity: ActivityFeedItem
  onClick?: (activity: ActivityFeedItem) => void
  isNew?: boolean 
}) {
  const config = activityConfig[activity.type]
  const Icon = config.icon
  
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

  return (
    <div 
      className={cn(
        "flex items-start space-x-3 p-3 rounded-lg transition-all duration-200 cursor-pointer hover:bg-gray-50",
        isNew && "bg-blue-50 border border-blue-200 animate-pulse"
      )}
      onClick={() => onClick?.(activity)}
    >
      <div className={cn("p-2 rounded-full flex-shrink-0", config.bgColor)}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 truncate">
            {activity.description}
          </p>
          {activity.metadata.priority === 'high' && (
            <Badge variant="destructive" className="ml-2 text-xs">
              Urgente
            </Badge>
          )}
        </div>
        
        <div className="flex items-center mt-1 space-x-2">
          <span className="text-xs text-gray-500">
            por {activity.user}
          </span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500">
            {formatTimeAgo(activity.timestamp)}
          </span>
          {activity.metadata.source && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <Badge variant="outline" className="text-xs">
                {activity.metadata.source}
              </Badge>
            </>
          )}
        </div>
      </div>
      
      <Button variant="ghost" size="sm" className="flex-shrink-0">
        <IconDots className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function RealTimeActivityFeed({
  activities: initialActivities,
  isLoading,
  className,
  maxItems = 50,
  showFilters = true,
  enableRealTime = true,
  onActivityClick
}: RealTimeActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityFeedItem[]>(initialActivities || [])
  const [filteredActivities, setFilteredActivities] = useState<ActivityFeedItem[]>([])
  const [newActivities, setNewActivities] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState({
    type: 'all',
    user: 'all',
    search: ''
  })
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(enableRealTime)
  const [page, setPage] = useState(1)
  const itemsPerPage = 10

  // Generate initial mock data if none provided
  useEffect(() => {
    if (!initialActivities && activities.length === 0) {
      const mockActivities = Array.from({ length: 20 }, generateMockActivity)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      setActivities(mockActivities)
    }
  }, [initialActivities, activities.length])

  // Real-time activity simulation
  useEffect(() => {
    if (!isRealTimeEnabled) return

    const interval = setInterval(() => {
      const newActivity = generateMockActivity()
      setActivities(prev => {
        const updated = [newActivity, ...prev].slice(0, maxItems)
        return updated
      })
      
      // Mark as new for animation
      setNewActivities(prev => new Set([...prev, newActivity.id]))
      
      // Remove new status after animation
      setTimeout(() => {
        setNewActivities(prev => {
          const updated = new Set(prev)
          updated.delete(newActivity.id)
          return updated
        })
      }, 3000)
      
    }, Math.random() * 10000 + 5000) // Random interval between 5-15 seconds

    return () => clearInterval(interval)
  }, [isRealTimeEnabled, maxItems])

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...activities]

    // Apply type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(activity => activity.type === filters.type)
    }

    // Apply user filter
    if (filters.user !== 'all') {
      filtered = filtered.filter(activity => activity.user === filters.user)
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(activity =>
        activity.description.toLowerCase().includes(searchLower) ||
        activity.user.toLowerCase().includes(searchLower)
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const timeA = a.timestamp.getTime()
      const timeB = b.timestamp.getTime()
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
    })

    setFilteredActivities(filtered)
    setPage(1) // Reset to first page when filters change
  }, [activities, filters, sortOrder])

  const handleRefresh = useCallback(() => {
    const newMockActivities = Array.from({ length: 10 }, generateMockActivity)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    setActivities(prev => {
      const combined = [...newMockActivities, ...prev]
      return combined.slice(0, maxItems)
    })
  }, [maxItems])

  const uniqueUsers = Array.from(new Set(activities.map(a => a.user)))
  const paginatedActivities = filteredActivities.slice(0, page * itemsPerPage)
  const hasMore = filteredActivities.length > page * itemsPerPage

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Atividade em Tempo Real</CardTitle>
              <CardDescription>Carregando atividades...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Atividade em Tempo Real
              {isRealTimeEnabled && (
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-600">Ao vivo</span>
                </div>
              )}
            </CardTitle>
            <CardDescription>
              {filteredActivities.length} atividades • Última atualização: agora mesmo
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
            >
              {isRealTimeEnabled ? <IconEye className="h-4 w-4" /> : <IconEyeOff className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <IconRefresh className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {showFilters && (
        <div className="px-6 pb-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar atividades..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full"
              />
            </div>
            <Select
              value={filters.type}
              onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="contato">Contatos</SelectItem>
                <SelectItem value="processo">Processos</SelectItem>
                <SelectItem value="mensagem">Mensagens</SelectItem>
                <SelectItem value="documento">Documentos</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.user}
              onValueChange={(value) => setFilters(prev => ({ ...prev, user: value }))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user} value={user}>{user}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            >
              {sortOrder === 'desc' ? <IconArrowDown className="h-4 w-4" /> : <IconArrowUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {paginatedActivities.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <IconBell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>Nenhuma atividade encontrada</p>
              <p className="text-sm">Tente ajustar os filtros ou aguarde novas atividades</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paginatedActivities.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  onClick={onActivityClick}
                  isNew={newActivities.has(activity.id)}
                />
              ))}
            </div>
          )}
        </div>

        {hasMore && (
          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setPage(prev => prev + 1)}
            >
              Carregar mais atividades
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}