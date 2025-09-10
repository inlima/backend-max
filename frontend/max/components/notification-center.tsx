"use client"

import * as React from "react"
import {
  IconBell,
  IconBellRinging,
  IconCalendar,
  IconClock,
  IconFileDescription,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconSettings,
  IconFilter,
  IconDot
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

export interface ProcessoNotification {
  id: string
  type: 'prazo_proximo' | 'prazo_vencido' | 'status_alterado' | 'documento_adicionado' | 'custom'
  title: string
  message: string
  processoId: string
  processoTitulo: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  read: boolean
  createdAt: Date
  actionUrl?: string
  metadata?: Record<string, any>
}

interface NotificationCenterProps {
  notifications: ProcessoNotification[]
  onMarkAsRead: (notificationId: string) => void
  onMarkAllAsRead: () => void
  onDeleteNotification: (notificationId: string) => void
  onNotificationClick: (notification: ProcessoNotification) => void
}

const getNotificationIcon = (type: ProcessoNotification['type']) => {
  switch (type) {
    case 'prazo_proximo':
    case 'prazo_vencido':
      return IconCalendar
    case 'status_alterado':
      return IconFileDescription
    case 'documento_adicionado':
      return IconFileDescription
    default:
      return IconBell
  }
}

const getPriorityColor = (priority: ProcessoNotification['priority']) => {
  switch (priority) {
    case 'urgent':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'medium':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'low':
      return 'text-gray-600 bg-gray-50 border-gray-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onNotificationClick,
}: NotificationCenterProps) {
  const [filter, setFilter] = React.useState<string>('all')
  const [showSettings, setShowSettings] = React.useState(false)

  const unreadCount = notifications.filter(n => !n.read).length
  
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true
    if (filter === 'unread') return !notification.read
    if (filter === 'prazos') return notification.type.includes('prazo')
    if (filter === 'status') return notification.type === 'status_alterado'
    if (filter === 'documentos') return notification.type === 'documento_adicionado'
    return true
  })

  const groupedNotifications = filteredNotifications.reduce((acc, notification) => {
    const today = new Date()
    const notificationDate = new Date(notification.createdAt)
    const isToday = notificationDate.toDateString() === today.toDateString()
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = notificationDate.toDateString() === yesterday.toDateString()
    
    let group = 'Mais antigas'
    if (isToday) group = 'Hoje'
    else if (isYesterday) group = 'Ontem'
    
    if (!acc[group]) acc[group] = []
    acc[group].push(notification)
    return acc
  }, {} as Record<string, ProcessoNotification[]>)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <IconBell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <IconBellRinging className="h-5 w-5" />
                Notificações
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <IconSettings className="h-4 w-4" />
                </Button>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onMarkAllAsRead}
                  >
                    <IconCheck className="h-4 w-4 mr-1" />
                    Marcar todas
                  </Button>
                )}
              </div>
            </div>
            
            {/* Filter */}
            <div className="flex items-center gap-2">
              <IconFilter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="unread">Não lidas ({unreadCount})</SelectItem>
                  <SelectItem value="prazos">Prazos</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="documentos">Documentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 border-b bg-muted/50">
              <h4 className="font-medium mb-3">Configurações de Notificação</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prazo-notifications" className="text-sm">
                    Notificações de prazo
                  </Label>
                  <Switch id="prazo-notifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="status-notifications" className="text-sm">
                    Mudanças de status
                  </Label>
                  <Switch id="status-notifications" defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="document-notifications" className="text-sm">
                    Novos documentos
                  </Label>
                  <Switch id="document-notifications" defaultChecked />
                </div>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <IconBell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">Nenhuma notificação</h3>
                <p className="text-sm text-muted-foreground">
                  {filter === 'unread' 
                    ? 'Todas as notificações foram lidas'
                    : 'Você não tem notificações no momento'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {Object.entries(groupedNotifications).map(([group, groupNotifications]) => (
                  <div key={group}>
                    <div className="px-4 py-2 bg-muted/30">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {group}
                      </h4>
                    </div>
                    
                    {groupNotifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type)
                      const priorityClass = getPriorityColor(notification.priority)
                      
                      return (
                        <div
                          key={notification.id}
                          className={cn(
                            "p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                            !notification.read && "bg-blue-50/50"
                          )}
                          onClick={() => onNotificationClick(notification)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={cn(
                              "p-2 rounded-lg border",
                              priorityClass
                            )}>
                              <Icon className="h-4 w-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-sm font-medium truncate",
                                    !notification.read && "font-semibold"
                                  )}>
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {notification.processoTitulo}
                                  </p>
                                </div>
                                
                                <div className="flex items-center space-x-1 ml-2">
                                  {!notification.read && (
                                    <IconDot className="h-4 w-4 text-blue-600" />
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      onDeleteNotification(notification.id)
                                    }}
                                  >
                                    <IconX className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between mt-2">
                                <time className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(notification.createdAt), {
                                    addSuffix: true,
                                    locale: ptBR
                                  })}
                                </time>
                                
                                {notification.priority === 'urgent' && (
                                  <Badge variant="destructive" className="text-xs">
                                    <IconAlertTriangle className="h-3 w-3 mr-1" />
                                    Urgente
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="p-3 border-t">
              <Button variant="ghost" className="w-full text-sm">
                Ver todas as notificações
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}