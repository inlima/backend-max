"use client"

import * as React from "react"
import { runAccessibilityTests, AccessibilityTestResult, AccessibilityIssue } from "@/lib/accessibility-testing"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  IconAccessible, 
  IconAlertTriangle, 
  IconBug, 
  IconCheck, 
  IconChevronDown, 
  IconChevronRight,
  IconEye,
  IconInfo,
  IconLoader2,
  IconRefresh,
  IconX
} from "@tabler/icons-react"

export interface AccessibilityTesterProps {
  target?: HTMLElement
  level?: 'A' | 'AA' | 'AAA'
  autoRun?: boolean
  showOnlyErrors?: boolean
  className?: string
}

export function AccessibilityTester({
  target,
  level = 'AA',
  autoRun = false,
  showOnlyErrors = false,
  className
}: AccessibilityTesterProps) {
  const [isRunning, setIsRunning] = React.useState(false)
  const [results, setResults] = React.useState<AccessibilityTestResult | null>(null)
  const [expandedIssues, setExpandedIssues] = React.useState<Set<string>>(new Set())

  // Run tests
  const runTests = React.useCallback(async () => {
    setIsRunning(true)
    try {
      const testResults = await runAccessibilityTests(target, level)
      setResults(testResults)
    } catch (error) {
      console.error('Accessibility test failed:', error)
    } finally {
      setIsRunning(false)
    }
  }, [target, level])

  // Auto-run tests when component mounts or target changes
  React.useEffect(() => {
    if (autoRun) {
      runTests()
    }
  }, [autoRun, runTests])

  // Toggle issue expansion
  const toggleIssue = (issueId: string) => {
    setExpandedIssues(prev => {
      const newSet = new Set(prev)
      if (newSet.has(issueId)) {
        newSet.delete(issueId)
      } else {
        newSet.add(issueId)
      }
      return newSet
    })
  }

  // Group issues by severity
  const groupedIssues = React.useMemo(() => {
    if (!results) return {}
    
    return results.issues.reduce((groups, issue, index) => {
      const key = issue.severity
      if (!groups[key]) groups[key] = []
      groups[key].push({ ...issue, id: `${key}-${index}` })
      return groups
    }, {} as Record<string, (AccessibilityIssue & { id: string })[]>)
  }, [results])

  // Filter issues based on showOnlyErrors
  const filteredIssues = React.useMemo(() => {
    if (!results) return {}
    
    if (showOnlyErrors) {
      return Object.fromEntries(
        Object.entries(groupedIssues).filter(([severity]) => 
          severity === 'critical' || severity === 'serious'
        )
      )
    }
    
    return groupedIssues
  }, [groupedIssues, results, showOnlyErrors])

  // Get severity icon and color
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { 
          icon: IconX, 
          color: 'text-red-600', 
          bgColor: 'bg-red-50 border-red-200',
          badgeVariant: 'destructive' as const
        }
      case 'serious':
        return { 
          icon: IconAlertTriangle, 
          color: 'text-orange-600', 
          bgColor: 'bg-orange-50 border-orange-200',
          badgeVariant: 'destructive' as const
        }
      case 'moderate':
        return { 
          icon: IconBug, 
          color: 'text-yellow-600', 
          bgColor: 'bg-yellow-50 border-yellow-200',
          badgeVariant: 'secondary' as const
        }
      case 'minor':
        return { 
          icon: IconInfo, 
          color: 'text-blue-600', 
          bgColor: 'bg-blue-50 border-blue-200',
          badgeVariant: 'outline' as const
        }
      default:
        return { 
          icon: IconInfo, 
          color: 'text-gray-600', 
          bgColor: 'bg-gray-50 border-gray-200',
          badgeVariant: 'outline' as const
        }
    }
  }

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  // Highlight element in DOM
  const highlightElement = (element?: HTMLElement) => {
    if (!element) return

    // Remove existing highlights
    document.querySelectorAll('.accessibility-highlight').forEach(el => {
      el.classList.remove('accessibility-highlight')
    })

    // Add highlight to target element
    element.classList.add('accessibility-highlight')
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // Remove highlight after 3 seconds
    setTimeout(() => {
      element.classList.remove('accessibility-highlight')
    }, 3000)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Add CSS for highlighting */}
      <style jsx global>{`
        .accessibility-highlight {
          outline: 3px solid #ef4444 !important;
          outline-offset: 2px !important;
          background-color: rgba(239, 68, 68, 0.1) !important;
        }
      `}</style>

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconAccessible className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">Teste de Acessibilidade</CardTitle>
                <CardDescription>
                  WCAG 2.1 {level} - {target ? 'Elemento específico' : 'Página completa'}
                </CardDescription>
              </div>
            </div>
            
            <Button
              onClick={runTests}
              disabled={isRunning}
              size="sm"
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <IconRefresh className="h-4 w-4" />
              )}
              {isRunning ? 'Testando...' : 'Executar Testes'}
            </Button>
          </div>
        </CardHeader>

        {results && (
          <CardContent>
            <div className="space-y-4">
              {/* Score */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Pontuação de Acessibilidade</p>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-2xl font-bold", getScoreColor(results.score))}>
                      {results.score}/100
                    </span>
                    <Badge variant={results.passed ? "default" : "destructive"}>
                      {results.passed ? 'Aprovado' : 'Reprovado'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <Progress value={results.score} className="w-24 h-2" />
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(groupedIssues).map(([severity, issues]) => {
                  const config = getSeverityConfig(severity)
                  return (
                    <div key={severity} className="text-center">
                      <div className={cn("text-2xl font-bold", config.color)}>
                        {issues.length}
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {severity === 'critical' && 'Críticos'}
                        {severity === 'serious' && 'Sérios'}
                        {severity === 'moderate' && 'Moderados'}
                        {severity === 'minor' && 'Menores'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Issues */}
      {results && results.issues.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Problemas Encontrados ({results.issues.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedIssues(new Set())}
                >
                  Recolher Todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedIssues(new Set(results.issues.map((_, i) => `issue-${i}`)))}
                >
                  Expandir Todos
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="critical">Críticos</TabsTrigger>
                <TabsTrigger value="serious">Sérios</TabsTrigger>
                <TabsTrigger value="moderate">Moderados</TabsTrigger>
                <TabsTrigger value="minor">Menores</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3">
                {Object.entries(filteredIssues).map(([severity, issues]) => (
                  <div key={severity} className="space-y-2">
                    {issues.map((issue) => (
                      <IssueCard
                        key={issue.id}
                        issue={issue}
                        isExpanded={expandedIssues.has(issue.id)}
                        onToggle={() => toggleIssue(issue.id)}
                        onHighlight={() => highlightElement(issue.element)}
                      />
                    ))}
                  </div>
                ))}
              </TabsContent>

              {['critical', 'serious', 'moderate', 'minor'].map(severity => (
                <TabsContent key={severity} value={severity} className="space-y-2">
                  {(filteredIssues[severity] || []).map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      isExpanded={expandedIssues.has(issue.id)}
                      onToggle={() => toggleIssue(issue.id)}
                      onHighlight={() => highlightElement(issue.element)}
                    />
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* No issues */}
      {results && results.issues.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <IconCheck className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-600 mb-2">
                Parabéns! Nenhum problema encontrado
              </h3>
              <p className="text-muted-foreground">
                Seu conteúdo atende aos critérios de acessibilidade WCAG 2.1 {level}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Issue card component
interface IssueCardProps {
  issue: AccessibilityIssue & { id: string }
  isExpanded: boolean
  onToggle: () => void
  onHighlight: () => void
}

function IssueCard({ issue, isExpanded, onToggle, onHighlight }: IssueCardProps) {
  const config = getSeverityConfig(issue.severity)
  const Icon = config.icon

  return (
    <Card className={cn("border-l-4", config.bgColor)}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.color)} />
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{issue.rule}</h4>
                    <Badge variant={config.badgeVariant} className="text-xs">
                      {issue.severity === 'critical' && 'Crítico'}
                      {issue.severity === 'serious' && 'Sério'}
                      {issue.severity === 'moderate' && 'Moderado'}
                      {issue.severity === 'minor' && 'Menor'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {issue.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {issue.element && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onHighlight()
                    }}
                    className="h-8 w-8 p-0"
                    title="Destacar elemento"
                  >
                    <IconEye className="h-4 w-4" />
                  </Button>
                )}
                {isExpanded ? (
                  <IconChevronDown className="h-4 w-4" />
                ) : (
                  <IconChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3 pl-8">
              <div>
                <h5 className="font-medium text-sm mb-1">Descrição</h5>
                <p className="text-sm text-muted-foreground">{issue.description}</p>
              </div>

              {issue.wcagCriteria.length > 0 && (
                <div>
                  <h5 className="font-medium text-sm mb-1">Critérios WCAG</h5>
                  <div className="flex flex-wrap gap-1">
                    {issue.wcagCriteria.map((criteria) => (
                      <Badge key={criteria} variant="outline" className="text-xs">
                        {criteria}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {issue.element && (
                <div>
                  <h5 className="font-medium text-sm mb-1">Elemento</h5>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {issue.element.tagName.toLowerCase()}
                    {issue.element.id && `#${issue.element.id}`}
                    {issue.element.className && `.${issue.element.className.split(' ').join('.')}`}
                  </code>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'critical':
      return { 
        icon: IconX, 
        color: 'text-red-600', 
        bgColor: 'bg-red-50 border-red-200',
        badgeVariant: 'destructive' as const
      }
    case 'serious':
      return { 
        icon: IconAlertTriangle, 
        color: 'text-orange-600', 
        bgColor: 'bg-orange-50 border-orange-200',
        badgeVariant: 'destructive' as const
      }
    case 'moderate':
      return { 
        icon: IconBug, 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-50 border-yellow-200',
        badgeVariant: 'secondary' as const
      }
    case 'minor':
      return { 
        icon: IconInfo, 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50 border-blue-200',
        badgeVariant: 'outline' as const
      }
    default:
      return { 
        icon: IconInfo, 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-50 border-gray-200',
        badgeVariant: 'outline' as const
      }
  }
}