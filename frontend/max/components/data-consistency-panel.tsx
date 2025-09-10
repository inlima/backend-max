'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Wrench, 
  X, 
  ChevronDown, 
  ChevronRight,
  Play,
  BarChart3,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react'
import { 
  useDataConsistency, 
  useConsistencyMonitoring, 
  useValidationRules 
} from '@/hooks/use-data-consistency'
import { ConsistencyIssue, ConsistencyReport } from '@/lib/data-consistency-service'
import { toast } from 'sonner'

interface DataConsistencyPanelProps {
  className?: string
  showHeader?: boolean
  maxHeight?: string
}

interface IssueCardProps {
  issue: ConsistencyIssue
  onAutoFix: (issueId: string) => void
  onResolve: (issueId: string) => void
  isAutoFixing: boolean
}

interface ConsistencyReportDialogProps {
  report: ConsistencyReport | undefined
  isLoading: boolean
  onRunCheck: () => void
}

interface ConsistencyStatsProps {
  stats: ReturnType<typeof useConsistencyMonitoring>['stats']
  className?: string
}

const severityConfig = {
  error: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badgeVariant: 'destructive' as const
  },
  warning: {
    icon: AlertCircle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badgeVariant: 'secondary' as const
  },
  info: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeVariant: 'outline' as const
  }
}

function IssueCard({ issue, onAutoFix, onResolve, isAutoFixing }: IssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = severityConfig[issue.severity]
  const IconComponent = config.icon

  const entityTypeLabels = {
    contato: 'Contato',
    processo: 'Processo',
    message: 'Mensagem',
    relationship: 'Relacionamento'
  }

  return (
    <Card className={`${config.borderColor} ${config.bgColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <IconComponent className={`h-5 w-5 ${config.color} mt-0.5 flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={config.badgeVariant} className="text-xs">
                  {entityTypeLabels[issue.entityType]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {issue.severity.toUpperCase()}
                </Badge>
                {issue.autoFixable && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                    Auto-corrigível
                  </Badge>
                )}
              </div>
              
              <h4 className="font-medium text-sm mb-1">{issue.message}</h4>
              
              <div className="text-xs text-gray-600 mb-2">
                ID: {issue.entityId} • {new Date(issue.timestamp).toLocaleString('pt-BR')}
              </div>

              {issue.affectedFields && issue.affectedFields.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {issue.affectedFields.map(field => (
                    <Badge key={field} variant="outline" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              )}

              {(issue.details || issue.suggestedFix) && (
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-0 h-auto text-xs">
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 mr-1" />
                      ) : (
                        <ChevronRight className="h-3 w-3 mr-1" />
                      )}
                      Ver detalhes
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    {issue.details && (
                      <div className="text-xs text-gray-600 mb-2">
                        <strong>Detalhes:</strong> {issue.details}
                      </div>
                    )}
                    {issue.suggestedFix && (
                      <div className="text-xs text-gray-600">
                        <strong>Correção sugerida:</strong>
                        <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {typeof issue.suggestedFix === 'object' 
                            ? JSON.stringify(issue.suggestedFix, null, 2)
                            : String(issue.suggestedFix)
                          }
                        </pre>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {issue.autoFixable && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAutoFix(issue.id)}
                disabled={isAutoFixing}
                className="gap-1"
              >
                {isAutoFixing ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                ) : (
                  <Wrench className="h-3 w-3" />
                )}
                Corrigir
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onResolve(issue.id)}
              className="gap-1"
            >
              <CheckCircle className="h-3 w-3" />
              Resolver
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ConsistencyStats({ stats, className }: ConsistencyStatsProps) {
  const totalIssues = stats.activeIssues
  const criticalIssues = stats.issuesBySeverity.error || 0
  const warningIssues = stats.issuesBySeverity.warning || 0
  const infoIssues = stats.issuesBySeverity.info || 0

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <div>
              <div className="text-2xl font-bold text-red-600">{criticalIssues}</div>
              <div className="text-xs text-gray-600">Críticos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <div>
              <div className="text-2xl font-bold text-yellow-600">{warningIssues}</div>
              <div className="text-xs text-gray-600">Avisos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-blue-600">{infoIssues}</div>
              <div className="text-xs text-gray-600">Informativos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.autoFixableIssues}</div>
              <div className="text-xs text-gray-600">Auto-corrigíveis</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ConsistencyReportDialog({ report, isLoading, onRunCheck }: ConsistencyReportDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Relatório Completo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Relatório de Consistência</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Verificação completa do sistema</span>
            <Button
              onClick={onRunCheck}
              disabled={isLoading}
              size="sm"
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Executar Verificação
                </>
              )}
            </Button>
          </div>

          {report && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{report.entitiesChecked}</div>
                      <div className="text-sm text-gray-600">Entidades verificadas</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{report.totalIssues}</div>
                      <div className="text-sm text-gray-600">Problemas encontrados</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Erros críticos:</span>
                  <span className="font-medium text-red-600">{report.errorCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Avisos:</span>
                  <span className="font-medium text-yellow-600">{report.warningCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Informativos:</span>
                  <span className="font-medium text-blue-600">{report.infoCount}</span>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Última verificação: {report.lastCheck.toLocaleString('pt-BR')}
              </div>

              {report.totalIssues > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Resumo dos Problemas</h4>
                  <ScrollArea className="h-32">
                    <div className="space-y-1">
                      {report.issues.slice(0, 10).map((issue, index) => (
                        <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                          <div className="font-medium">{issue.message}</div>
                          <div className="text-gray-600">
                            {issue.entityType} {issue.entityId}
                          </div>
                        </div>
                      ))}
                      {report.issues.length > 10 && (
                        <div className="text-xs text-gray-500 text-center py-2">
                          ... e mais {report.issues.length - 10} problemas
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {!report && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma verificação executada ainda</p>
              <p className="text-xs">Clique em "Executar Verificação" para começar</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DataConsistencyPanel({ 
  className, 
  showHeader = true, 
  maxHeight = "400px" 
}: DataConsistencyPanelProps) {
  const {
    issues,
    consistencyReport,
    isCheckingConsistency,
    isAutoFixing,
    runConsistencyCheck,
    autoFixIssue,
    resolveIssue,
    clearResolvedIssues
  } = useDataConsistency()

  const { stats, criticalIssues, hasCriticalIssues } = useConsistencyMonitoring()

  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'error' | 'warning' | 'info'>('all')
  const [selectedEntityType, setSelectedEntityType] = useState<'all' | 'contato' | 'processo' | 'message'>('all')

  // Filter issues based on selected filters
  const filteredIssues = issues.filter(issue => {
    if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) {
      return false
    }
    if (selectedEntityType !== 'all' && issue.entityType !== selectedEntityType) {
      return false
    }
    return true
  })

  const handleAutoFixAll = async () => {
    const autoFixableIssues = filteredIssues.filter(issue => issue.autoFixable)
    
    if (autoFixableIssues.length === 0) {
      toast.info('Nenhum problema auto-corrigível encontrado')
      return
    }

    const confirmed = confirm(
      `Deseja corrigir automaticamente ${autoFixableIssues.length} problema(s)?`
    )

    if (confirmed) {
      let successCount = 0
      for (const issue of autoFixableIssues) {
        try {
          const success = await autoFixIssue(issue.id)
          if (success) successCount++
        } catch (error) {
          console.error(`Failed to auto-fix issue ${issue.id}:`, error)
        }
      }
      
      toast.success(`${successCount} problema(s) corrigido(s) automaticamente`)
    }
  }

  return (
    <div className={className}>
      {showHeader && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Consistência de Dados
                {hasCriticalIssues && (
                  <Badge variant="destructive" className="ml-2">
                    {criticalIssues.length} Crítico{criticalIssues.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                <ConsistencyReportDialog
                  report={consistencyReport}
                  isLoading={isCheckingConsistency}
                  onRunCheck={() => runConsistencyCheck()}
                />
                
                {stats.autoFixableIssues > 0 && (
                  <Button
                    onClick={handleAutoFixAll}
                    disabled={isAutoFixing}
                    size="sm"
                    className="gap-2"
                  >
                    <Wrench className="h-4 w-4" />
                    Corrigir Tudo ({stats.autoFixableIssues})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ConsistencyStats stats={stats} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Problemas Ativos ({filteredIssues.length})
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* Severity filter */}
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="all">Todas as severidades</option>
                <option value="error">Apenas erros</option>
                <option value="warning">Apenas avisos</option>
                <option value="info">Apenas informativos</option>
              </select>

              {/* Entity type filter */}
              <select
                value={selectedEntityType}
                onChange={(e) => setSelectedEntityType(e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="all">Todos os tipos</option>
                <option value="contato">Contatos</option>
                <option value="processo">Processos</option>
                <option value="message">Mensagens</option>
              </select>

              {stats.resolvedIssues > 0 && (
                <Button
                  onClick={clearResolvedIssues}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpar Resolvidos
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <ScrollArea style={{ height: maxHeight }}>
            {filteredIssues.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum problema encontrado</p>
                <p className="text-xs">Seus dados estão consistentes!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onAutoFix={autoFixIssue}
                    onResolve={resolveIssue}
                    isAutoFixing={isAutoFixing}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// Compact version for dashboard or sidebar
export function CompactConsistencyPanel({ className }: { className?: string }) {
  const { stats, hasCriticalIssues, criticalIssues } = useConsistencyMonitoring()

  if (!hasCriticalIssues && stats.activeIssues === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <div className="font-medium text-sm">Dados Consistentes</div>
              <div className="text-xs text-gray-600">Nenhum problema encontrado</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <div className="font-medium text-sm">
                {stats.activeIssues} Problema{stats.activeIssues > 1 ? 's' : ''}
              </div>
              <div className="text-xs text-gray-600">
                {criticalIssues.length} crítico{criticalIssues.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Eye className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle>Problemas de Consistência</DialogTitle>
              </DialogHeader>
              <DataConsistencyPanel showHeader={false} maxHeight="500px" />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}