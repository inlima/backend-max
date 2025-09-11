'use client'

import React from 'react'
import Link from 'next/link'
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  ChevronDown,
  Home,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  ArrowLeft,
  Clock
} from 'lucide-react'
import { useBreadcrumbs, useNavigationHistory, useNavigationContext } from '@/hooks/use-navigation-context'
import { BreadcrumbItem as BreadcrumbItemType } from '@/lib/navigation-context-service'

interface BreadcrumbNavigationProps {
  className?: string
  showBackButton?: boolean
  showHistory?: boolean
  maxItems?: number
}

const iconMap = {
  Home,
  LayoutDashboard,
  Users,
  FileText,
  Settings
}

function getIcon(iconName?: string) {
  if (!iconName || !(iconName in iconMap)) {
    return null
  }
  const IconComponent = iconMap[iconName as keyof typeof iconMap]
  return <IconComponent className="h-4 w-4" />
}

function HistoryDropdown() {
  const { history, frequentPaths } = useNavigationHistory()
  const { navigateWithContext } = useNavigationContext()

  const recentPaths = history
    .slice(-10)
    .reverse()
    .filter((item, index, arr) => 
      arr.findIndex(other => other.path === item.path) === index
    )

  if (recentPaths.length === 0 && frequentPaths.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Clock className="h-4 w-4" />
          Histórico
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {recentPaths.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
              Recentes
            </div>
            {recentPaths.slice(0, 5).map((item, index) => (
              <DropdownMenuItem
                key={`recent-${index}`}
                onClick={() => navigateWithContext(item.path, { preserveState: true })}
                className="flex items-center gap-2"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {getPathLabel(item.path)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(item.timestamp).toLocaleString('pt-BR')}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}

        {frequentPaths.length > 0 && recentPaths.length > 0 && (
          <div className="border-t my-1" />
        )}

        {frequentPaths.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
              Mais Visitados
            </div>
            {frequentPaths.slice(0, 5).map((item, index) => (
              <DropdownMenuItem
                key={`frequent-${index}`}
                onClick={() => navigateWithContext(item.path, { preserveState: true })}
                className="flex items-center gap-2"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {getPathLabel(item.path)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.count} visita{item.count > 1 ? 's' : ''}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getPathLabel(path: string): string {
  const segments = path.split('/').filter(Boolean)
  
  if (segments.length === 0) return 'Home'
  
  const pathLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    contatos: 'Contatos',
    processos: 'Processos',
    configuracoes: 'Configurações'
  }

  const mainSegment = segments[0]
  const label = pathLabels[mainSegment] || mainSegment

  if (segments.length > 1) {
    return `${label} - ${segments[1]}`
  }

  return label
}

function CollapsedBreadcrumbs({ 
  items, 
  onNavigate 
}: { 
  items: BreadcrumbItemType[]
  onNavigate: (item: BreadcrumbItemType) => void 
}) {
  const hiddenItems = items.slice(1, -1) // Hide middle items, keep first and last

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-1">
          <span className="sr-only">Mostrar itens ocultos</span>
          <div className="flex items-center gap-1">
            <span className="text-sm">...</span>
            <ChevronDown className="h-3 w-3" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {hiddenItems.map((item, index) => (
          <DropdownMenuItem
            key={index}
            onClick={() => onNavigate(item)}
            className="flex items-center gap-2"
          >
            {getIcon(item.icon)}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function BreadcrumbNavigation({ 
  className,
  showBackButton = true,
  showHistory = true,
  maxItems = 4
}: BreadcrumbNavigationProps) {
  const { breadcrumbs, navigateToBreadcrumb } = useBreadcrumbs()
  const { goBack, previousPath } = useNavigationContext()

  if (breadcrumbs.length === 0) {
    return null
  }

  const shouldCollapse = breadcrumbs.length > maxItems
  const displayItems = shouldCollapse 
    ? [breadcrumbs[0], ...breadcrumbs.slice(-1)] // Show first and last
    : breadcrumbs

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Back button */}
      {showBackButton && previousPath && (
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      )}

      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          {displayItems.map((item, index) => (
            <React.Fragment key={item.href}>
              <BreadcrumbItem>
                {item.isActive ? (
                  <BreadcrumbPage className="flex items-center gap-2">
                    {getIcon(item.icon)}
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link 
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault()
                        navigateToBreadcrumb(item)
                      }}
                      className="flex items-center gap-2 hover:text-foreground"
                    >
                      {getIcon(item.icon)}
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              
              {/* Show collapsed items dropdown between first and last */}
              {shouldCollapse && index === 0 && breadcrumbs.length > 2 && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <CollapsedBreadcrumbs 
                      items={breadcrumbs}
                      onNavigate={navigateToBreadcrumb}
                    />
                  </BreadcrumbItem>
                </>
              )}
              
              {/* Regular separator */}
              {index < displayItems.length - 1 && (
                <BreadcrumbSeparator />
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* History dropdown */}
      {showHistory && <HistoryDropdown />}
    </div>
  )
}

// Compact version for mobile or tight spaces
export function CompactBreadcrumbNavigation({ className }: { className?: string }) {
  const { breadcrumbs } = useBreadcrumbs()
  const { goBack, previousPath } = useNavigationContext()

  if (breadcrumbs.length === 0) {
    return null
  }

  const currentItem = breadcrumbs[breadcrumbs.length - 1]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {previousPath && (
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      
      <div className="flex items-center gap-2 min-w-0">
        {getIcon(currentItem.icon)}
        <span className="font-medium truncate">{currentItem.label}</span>
      </div>
    </div>
  )
}