"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Enhanced skeleton components with animations
export const EnhancedSkeleton = React.memo(({ 
  className, 
  variant = "default",
  animation = "pulse",
  ...props 
}: {
  className?: string
  variant?: "default" | "rounded" | "circular" | "text"
  animation?: "pulse" | "wave" | "shimmer" | "none"
} & React.HTMLAttributes<HTMLDivElement>) => {
  const animationClasses = {
    pulse: "animate-pulse",
    wave: "animate-wave",
    shimmer: "animate-shimmer",
    none: ""
  }

  const variantClasses = {
    default: "rounded-md",
    rounded: "rounded-lg",
    circular: "rounded-full",
    text: "rounded-sm h-4"
  }

  return (
    <div
      className={cn(
        "bg-muted",
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      {...props}
    />
  )
})
EnhancedSkeleton.displayName = "EnhancedSkeleton"

// Table loading skeleton with staggered animation
export const TableLoadingSkeleton = React.memo(({ 
  rows = 5, 
  columns = 6,
  showHeader = true 
}: {
  rows?: number
  columns?: number
  showHeader?: boolean
}) => {
  return (
    <div className="w-full">
      {showHeader && (
        <div className="flex space-x-4 p-4 border-b bg-muted/50">
          {Array.from({ length: columns }).map((_, i) => (
            <EnhancedSkeleton
              key={i}
              className="h-4 flex-1"
              animation="shimmer"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      )}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div 
            key={rowIndex} 
            className="flex space-x-4 p-4 hover:bg-muted/20 transition-colors"
            style={{ animationDelay: `${rowIndex * 150}ms` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <EnhancedSkeleton
                key={colIndex}
                className={cn(
                  "h-4",
                  colIndex === 0 ? "w-8" : "flex-1",
                  colIndex === columns - 1 ? "w-16" : ""
                )}
                animation="wave"
                style={{ animationDelay: `${(rowIndex * columns + colIndex) * 50}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
})
TableLoadingSkeleton.displayName = "TableLoadingSkeleton"

// Card loading skeleton with content structure
export const CardLoadingSkeleton = React.memo(({ 
  showAvatar = false,
  showActions = true,
  lines = 3,
  className
}: {
  showAvatar?: boolean
  showActions?: boolean
  lines?: number
  className?: string
}) => {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1">
            {showAvatar && (
              <EnhancedSkeleton 
                variant="circular" 
                className="w-10 h-10" 
                animation="shimmer"
              />
            )}
            <div className="flex-1 space-y-2">
              <EnhancedSkeleton 
                className="h-5 w-3/4" 
                animation="wave"
              />
              <EnhancedSkeleton 
                className="h-3 w-1/2" 
                animation="wave"
                style={{ animationDelay: "100ms" }}
              />
            </div>
          </div>
          {showActions && (
            <EnhancedSkeleton 
              className="w-8 h-8" 
              variant="rounded"
              animation="pulse"
              style={{ animationDelay: "200ms" }}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <EnhancedSkeleton
              key={i}
              className={cn(
                "h-3",
                i === lines - 1 ? "w-2/3" : "w-full"
              )}
              animation="wave"
              style={{ animationDelay: `${(i + 3) * 100}ms` }}
            />
          ))}
        </div>
        <div className="flex space-x-2 mt-4">
          <EnhancedSkeleton 
            className="h-6 w-16" 
            variant="rounded"
            animation="shimmer"
            style={{ animationDelay: "600ms" }}
          />
          <EnhancedSkeleton 
            className="h-6 w-20" 
            variant="rounded"
            animation="shimmer"
            style={{ animationDelay: "700ms" }}
          />
        </div>
      </CardContent>
    </Card>
  )
})
CardLoadingSkeleton.displayName = "CardLoadingSkeleton"

// Dashboard metrics loading skeleton
export const MetricsLoadingSkeleton = React.memo(() => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <EnhancedSkeleton 
                  className="h-4 w-24" 
                  animation="wave"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
                <EnhancedSkeleton 
                  className="h-8 w-16" 
                  animation="wave"
                  style={{ animationDelay: `${i * 100 + 50}ms` }}
                />
                <EnhancedSkeleton 
                  className="h-3 w-20" 
                  animation="wave"
                  style={{ animationDelay: `${i * 100 + 100}ms` }}
                />
              </div>
              <EnhancedSkeleton 
                variant="circular" 
                className="w-12 h-12" 
                animation="shimmer"
                style={{ animationDelay: `${i * 100 + 150}ms` }}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
})
MetricsLoadingSkeleton.displayName = "MetricsLoadingSkeleton"

// Chart loading skeleton
export const ChartLoadingSkeleton = React.memo(({ 
  height = "h-64",
  showLegend = true,
  title
}: {
  height?: string
  showLegend?: boolean
  title?: string
}) => {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        {title && (
          <EnhancedSkeleton 
            className="h-6 w-48" 
            animation="wave"
          />
        )}
        <EnhancedSkeleton 
          className="h-4 w-64" 
          animation="wave"
          style={{ animationDelay: "100ms" }}
        />
      </CardHeader>
      <CardContent>
        <div className={cn("w-full bg-muted/30 rounded-lg relative overflow-hidden", height)}>
          {/* Animated chart placeholder */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          
          {/* Mock chart elements */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-primary/20 rounded-t-sm animate-pulse"
                style={{
                  height: `${Math.random() * 60 + 20}%`,
                  width: "8%",
                  animationDelay: `${i * 100}ms`
                }}
              />
            ))}
          </div>
        </div>
        
        {showLegend && (
          <div className="flex justify-center space-x-4 mt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <EnhancedSkeleton 
                  variant="circular" 
                  className="w-3 h-3" 
                  animation="pulse"
                  style={{ animationDelay: `${i * 150 + 500}ms` }}
                />
                <EnhancedSkeleton 
                  className="h-3 w-16" 
                  animation="wave"
                  style={{ animationDelay: `${i * 150 + 550}ms` }}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
ChartLoadingSkeleton.displayName = "ChartLoadingSkeleton"

// Progressive loading component
export const ProgressiveLoader = React.memo(({ 
  stages,
  currentStage,
  className
}: {
  stages: string[]
  currentStage: number
  className?: string
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="text-center">
        <div className="inline-flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          <span className="text-sm text-muted-foreground">
            {stages[currentStage] || "Carregando..."}
          </span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentStage + 1) / stages.length) * 100}%` }}
        />
      </div>
      
      {/* Stage indicators */}
      <div className="flex justify-between text-xs text-muted-foreground">
        {stages.map((stage, index) => (
          <div 
            key={index}
            className={cn(
              "flex items-center space-x-1 transition-colors duration-300",
              index <= currentStage ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div 
              className={cn(
                "w-2 h-2 rounded-full transition-colors duration-300",
                index < currentStage ? "bg-primary" : 
                index === currentStage ? "bg-primary animate-pulse" : "bg-muted"
              )}
            />
            <span className="hidden sm:inline">{stage}</span>
          </div>
        ))}
      </div>
    </div>
  )
})
ProgressiveLoader.displayName = "ProgressiveLoader"

// Spinner variants
export const LoadingSpinner = React.memo(({ 
  size = "md",
  variant = "default",
  className
}: {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "dots" | "bars" | "pulse"
  className?: string
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8",
    xl: "w-12 h-12"
  }

  if (variant === "dots") {
    return (
      <div className={cn("flex space-x-1", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "bg-primary rounded-full animate-bounce",
              size === "sm" ? "w-1 h-1" : 
              size === "md" ? "w-2 h-2" :
              size === "lg" ? "w-3 h-3" : "w-4 h-4"
            )}
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    )
  }

  if (variant === "bars") {
    return (
      <div className={cn("flex space-x-1 items-end", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "bg-primary animate-pulse",
              size === "sm" ? "w-1" : 
              size === "md" ? "w-1.5" :
              size === "lg" ? "w-2" : "w-3"
            )}
            style={{ 
              height: `${Math.random() * 20 + 10}px`,
              animationDelay: `${i * 200}ms` 
            }}
          />
        ))}
      </div>
    )
  }

  if (variant === "pulse") {
    return (
      <div 
        className={cn(
          "bg-primary rounded-full animate-ping",
          sizeClasses[size],
          className
        )}
      />
    )
  }

  // Default spinner
  return (
    <div 
      className={cn(
        "animate-spin rounded-full border-2 border-muted border-t-primary",
        sizeClasses[size],
        className
      )}
    />
  )
})
LoadingSpinner.displayName = "LoadingSpinner"

// Full page loading overlay
export const LoadingOverlay = React.memo(({ 
  isVisible,
  message = "Carregando...",
  progress,
  onCancel
}: {
  isVisible: boolean
  message?: string
  progress?: number
  onCancel?: () => void
}) => {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="p-6 text-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="space-y-2">
            <p className="text-sm font-medium">{message}</p>
            {progress !== undefined && (
              <div className="space-y-1">
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{progress}%</p>
              </div>
            )}
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  )
})
LoadingOverlay.displayName = "LoadingOverlay"