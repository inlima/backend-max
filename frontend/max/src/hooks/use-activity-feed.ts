'use client'

import { useState, useEffect, useCallback } from 'react'
import { ActivityFeedItem } from '@/types'

interface UseActivityFeedOptions {
  maxItems?: number
  refreshInterval?: number
  enableRealTime?: boolean
  filters?: {
    type?: string
    user?: string
    dateRange?: string
  }
}

interface UseActivityFeedReturn {
  activities: ActivityFeedItem[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  addActivity: (activity: ActivityFeedItem) => void
  markAsRead: (activityId: string) => void
  clearAll: () => void
  totalCount: number
  unreadCount: number
}

// Enhanced mock activity generator
function generateMockActivity(type?: string): ActivityFeedItem {
  const types = type ? [type] : ['contato', 'processo', 'mensagem', 'documento'] as const
  const selectedType = types[Math.floor(Math.random() * types.length)] as ActivityFeedItem['type']
  
  const actionsByType = {
    contato: [
      'Novo contato criado via WhatsApp',
      'Contato atualizado com novas informações',
      'Contato marcado como favorito',
      'Status do contato alterado para "Em atendimento"',
      'Contato convertido em cliente',
      'Informações de endereço atualizadas',
      'Tags adicionadas ao contato'
    ],
    processo: [
      'Novo processo criado',
      'Processo atualizado com nova informação',
      'Prazo definido para processo',
      'Status alterado para "Em andamento"',
      'Advogado responsável definido',
      'Prioridade alterada para "Alta"',
      'Processo finalizado com sucesso',
      'Anotação adicionada ao processo'
    ],
    mensagem: [
      'Nova mensagem recebida via WhatsApp',
      'Mensagem enviada para cliente',
      'Mensagem marcada como lida',
      'Resposta automática enviada',
      'Template de mensagem utilizado',
      'Mensagem encaminhada para equipe',
      'Conversa finalizada'
    ],
    documento: [
      'Documento anexado ao processo',
      'Documento atualizado',
      'Documento compartilhado com cliente',
      'Documento removido',
      'Nova versão do documento carregada',
      'Documento assinado digitalmente',
      'Documento enviado por email'
    ]
  }
  
  const users = [
    'João Silva',
    'Maria Santos', 
    'Carlos Oliveira',
    'Ana Costa',
    'Pedro Lima',
    'Fernanda Souza',
    'Sistema'
  ]
  
  const contacts = [
    'Maria da Silva',
    'João Santos',
    'Ana Oliveira',
    'Carlos Costa',
    'Fernanda Lima',
    'Pedro Souza',
    'Juliana Pereira',
    'Roberto Alves'
  ]
  
  const action = actionsByType[selectedType][Math.floor(Math.random() * actionsByType[selectedType].length)]
  const user = users[Math.floor(Math.random() * users.length)]
  const contact = contacts[Math.floor(Math.random() * contacts.length)]
  
  // Generate realistic timestamp (more recent activities are more likely)
  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours
  const randomAge = Math.pow(Math.random(), 2) * maxAge // Weighted towards recent
  const timestamp = new Date(now - randomAge)
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    type: selectedType,
    action: action.split(' ')[0].toLowerCase(),
    description: action,
    user,
    timestamp,
    metadata: {
      contactId: Math.random().toString(36).substr(2, 9),
      contactName: contact,
      priority: Math.random() > 0.8 ? 'high' : Math.random() > 0.6 ? 'medium' : 'normal',
      source: Math.random() > 0.5 ? 'whatsapp' : 'manual',
      read: Math.random() > 0.3, // 70% chance of being read
      category: selectedType,
      relatedId: Math.random().toString(36).substr(2, 9)
    }
  }
}

export function useActivityFeed(options: UseActivityFeedOptions = {}): UseActivityFeedReturn {
  const {
    maxItems = 100,
    refreshInterval = 30000,
    enableRealTime = true,
    filters = {}
  } = options

  const [activities, setActivities] = useState<ActivityFeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchActivities = useCallback(async (): Promise<void> => {
    try {
      setError(null)
      
      // In a real implementation, this would be an API call
      // const response = await apiClient.getActivityFeed({ 
      //   limit: maxItems, 
      //   filters 
      // })
      // setActivities(response.data)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Generate mock data
      const mockActivities = Array.from({ length: 30 }, () => generateMockActivity())
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, maxItems)
      
      setActivities(mockActivities)
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch activities'))
    } finally {
      setIsLoading(false)
    }
  }, [maxItems, filters])

  const refresh = async (): Promise<void> => {
    setIsLoading(true)
    await fetchActivities()
  }

  const addActivity = useCallback((activity: ActivityFeedItem): void => {
    setActivities(prev => {
      const updated = [activity, ...prev].slice(0, maxItems)
      return updated
    })
  }, [maxItems])

  const markAsRead = useCallback((activityId: string): void => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, metadata: { ...activity.metadata, read: true } }
          : activity
      )
    )
  }, [])

  const clearAll = useCallback((): void => {
    setActivities([])
  }, [])

  // Real-time activity simulation
  useEffect(() => {
    if (!enableRealTime) return

    const interval = setInterval(() => {
      // Random chance of new activity (30% every interval)
      if (Math.random() > 0.7) {
        const newActivity = generateMockActivity()
        addActivity(newActivity)
      }
    }, refreshInterval / 3) // Check more frequently than refresh interval

    return () => clearInterval(interval)
  }, [enableRealTime, refreshInterval, addActivity])

  // Initial fetch
  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchActivities, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchActivities, refreshInterval])

  // Calculate derived values
  const totalCount = activities.length
  const unreadCount = activities.filter(activity => !activity.metadata.read).length

  return {
    activities,
    isLoading,
    error,
    refresh,
    addActivity,
    markAsRead,
    clearAll,
    totalCount,
    unreadCount
  }
}

// Hook for WebSocket-based real-time activities
export function useRealTimeActivityFeed(): UseActivityFeedReturn {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // In a real implementation, this would connect to WebSocket
    // const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL)
    // 
    // ws.onmessage = (event) => {
    //   const data = JSON.parse(event.data)
    //   if (data.type === 'new_activity') {
    //     setActivities(prev => [data.payload, ...prev].slice(0, 100))
    //   }
    // }
    //
    // ws.onerror = (error) => {
    //   setError(new Error('WebSocket connection failed'))
    // }
    //
    // return () => ws.close()

    // Mock WebSocket behavior
    const initialActivities = Array.from({ length: 20 }, () => generateMockActivity())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    
    setActivities(initialActivities)
    setIsLoading(false)

    // Simulate real-time updates
    const interval = setInterval(() => {
      if (Math.random() > 0.6) { // 40% chance every 5 seconds
        const newActivity = generateMockActivity()
        setActivities(prev => [newActivity, ...prev].slice(0, 100))
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const refresh = async (): Promise<void> => {
    setIsLoading(true)
    setTimeout(() => {
      const newActivities = Array.from({ length: 10 }, () => generateMockActivity())
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      setActivities(prev => [...newActivities, ...prev].slice(0, 100))
      setIsLoading(false)
    }, 500)
  }

  const addActivity = (activity: ActivityFeedItem): void => {
    setActivities(prev => [activity, ...prev].slice(0, 100))
  }

  const markAsRead = (activityId: string): void => {
    setActivities(prev => 
      prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, metadata: { ...activity.metadata, read: true } }
          : activity
      )
    )
  }

  const clearAll = (): void => {
    setActivities([])
  }

  const totalCount = activities.length
  const unreadCount = activities.filter(activity => !activity.metadata.read).length

  return {
    activities,
    isLoading,
    error,
    refresh,
    addActivity,
    markAsRead,
    clearAll,
    totalCount,
    unreadCount
  }
}