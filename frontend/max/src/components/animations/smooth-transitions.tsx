"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Transition wrapper component
export const TransitionWrapper = React.memo(({ 
  children,
  isVisible = true,
  type = "fade",
  duration = "300ms",
  delay = "0ms",
  className,
  onTransitionEnd
}: {
  children: React.ReactNode
  isVisible?: boolean
  type?: "fade" | "slide-up" | "slide-down" | "slide-left" | "slide-right" | "scale" | "rotate"
  duration?: string
  delay?: string
  className?: string
  onTransitionEnd?: () => void
}) => {
  const [shouldRender, setShouldRender] = React.useState(isVisible)
  
  React.useEffect(() => {
    if (isVisible) {
      setShouldRender(true)
    }
  }, [isVisible])

  const handleTransitionEnd = React.useCallback(() => {
    if (!isVisible) {
      setShouldRender(false)
    }
    onTransitionEnd?.()
  }, [isVisible, onTransitionEnd])

  if (!shouldRender) return null

  const transitionClasses = {
    fade: isVisible ? "opacity-100" : "opacity-0",
    "slide-up": isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
    "slide-down": isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0",
    "slide-left": isVisible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
    "slide-right": isVisible ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0",
    scale: isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0",
    rotate: isVisible ? "rotate-0 opacity-100" : "rotate-12 opacity-0"
  }

  return (
    <div
      className={cn(
        "transition-all ease-out",
        transitionClasses[type],
        className
      )}
      style={{
        transitionDuration: duration,
        transitionDelay: delay
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      {children}
    </div>
  )
})
TransitionWrapper.displayName = "TransitionWrapper"

// Staggered animation container
export const StaggeredContainer = React.memo(({ 
  children,
  staggerDelay = 100,
  className
}: {
  children: React.ReactNode
  staggerDelay?: number
  className?: string
}) => {
  const childrenArray = React.Children.toArray(children)
  
  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <TransitionWrapper
          key={index}
          type="slide-up"
          delay={`${index * staggerDelay}ms`}
          duration="400ms"
        >
          {child}
        </TransitionWrapper>
      ))}
    </div>
  )
})
StaggeredContainer.displayName = "StaggeredContainer"

// Animated counter component
export const AnimatedCounter = React.memo(({ 
  value,
  duration = 1000,
  className,
  prefix = "",
  suffix = ""
}: {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}) => {
  const [displayValue, setDisplayValue] = React.useState(0)
  const [isAnimating, setIsAnimating] = React.useState(false)
  
  React.useEffect(() => {
    setIsAnimating(true)
    const startTime = Date.now()
    const startValue = displayValue
    const difference = value - startValue
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = Math.round(startValue + (difference * easeOut))
      
      setDisplayValue(currentValue)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }
    
    requestAnimationFrame(animate)
  }, [value, duration, displayValue])
  
  return (
    <span className={cn("tabular-nums", isAnimating && "animate-pulse", className)}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  )
})
AnimatedCounter.displayName = "AnimatedCounter"

// Progress bar with animation
export const AnimatedProgressBar = React.memo(({ 
  value,
  max = 100,
  className,
  showLabel = false,
  color = "primary",
  height = "h-2"
}: {
  value: number
  max?: number
  className?: string
  showLabel?: boolean
  color?: "primary" | "success" | "warning" | "danger"
  height?: string
}) => {
  const percentage = Math.min((value / max) * 100, 100)
  
  const colorClasses = {
    primary: "bg-primary",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    danger: "bg-red-500"
  }
  
  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span>Progresso</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", height)}>
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
})
AnimatedProgressBar.displayName = "AnimatedProgressBar"

// Floating action button with animations
export const FloatingActionButton = React.memo(({ 
  children,
  onClick,
  className,
  variant = "primary",
  size = "md",
  position = "bottom-right"
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  variant?: "primary" | "secondary" | "success" | "warning" | "danger"
  size?: "sm" | "md" | "lg"
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
}) => {
  const [isHovered, setIsHovered] = React.useState(false)
  
  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
    success: "bg-green-500 text-white hover:bg-green-600",
    warning: "bg-yellow-500 text-white hover:bg-yellow-600",
    danger: "bg-red-500 text-white hover:bg-red-600"
  }
  
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-14 h-14",
    lg: "w-16 h-16"
  }
  
  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6"
  }
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "fixed rounded-full shadow-lg transition-all duration-300 ease-out",
        "hover:shadow-xl hover:scale-110 active:scale-95",
        "flex items-center justify-center",
        variantClasses[variant],
        sizeClasses[size],
        positionClasses[position],
        isHovered && "animate-pulse",
        className
      )}
    >
      <div className={cn(
        "transition-transform duration-200",
        isHovered && "scale-110"
      )}>
        {children}
      </div>
    </button>
  )
})
FloatingActionButton.displayName = "FloatingActionButton"

// Animated badge component
export const AnimatedBadge = React.memo(({ 
  children,
  count,
  showZero = false,
  max = 99,
  className
}: {
  children: React.ReactNode
  count: number
  showZero?: boolean
  max?: number
  className?: string
}) => {
  const [prevCount, setPrevCount] = React.useState(count)
  const [isAnimating, setIsAnimating] = React.useState(false)
  
  React.useEffect(() => {
    if (count !== prevCount) {
      setIsAnimating(true)
      setPrevCount(count)
      
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [count, prevCount])
  
  const displayCount = count > max ? `${max}+` : count.toString()
  const shouldShow = count > 0 || showZero
  
  return (
    <div className={cn("relative inline-block", className)}>
      {children}
      <TransitionWrapper
        isVisible={shouldShow}
        type="scale"
        duration="200ms"
      >
        <span className={cn(
          "absolute -top-2 -right-2 bg-red-500 text-white text-xs",
          "rounded-full min-w-[1.25rem] h-5 flex items-center justify-center",
          "transition-all duration-300",
          isAnimating && "animate-bounce scale-125"
        )}>
          {displayCount}
        </span>
      </TransitionWrapper>
    </div>
  )
})
AnimatedBadge.displayName = "AnimatedBadge"

// Micro-interactions for buttons
export const InteractiveButton = React.memo(({ 
  children,
  onClick,
  variant = "default",
  size = "md",
  className,
  disabled = false,
  loading = false
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  className?: string
  disabled?: boolean
  loading?: boolean
}) => {
  const [isPressed, setIsPressed] = React.useState(false)
  const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([])
  
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (disabled || loading) return
    
    setIsPressed(true)
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const newRipple = { id: Date.now(), x, y }
    setRipples(prev => [...prev, newRipple])
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
    }, 600)
  }, [disabled, loading])
  
  const handleMouseUp = React.useCallback(() => {
    setIsPressed(false)
  }, [])
  
  const variantClasses = {
    default: "bg-background text-foreground border border-input hover:bg-accent",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground"
  }
  
  const sizeClasses = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4",
    lg: "h-12 px-6 text-lg"
  }
  
  return (
    <button
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      disabled={disabled || loading}
      className={cn(
        "relative overflow-hidden rounded-md font-medium transition-all duration-200",
        "hover:scale-105 active:scale-95",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        variantClasses[variant],
        sizeClasses[size],
        isPressed && "scale-95",
        className
      )}
    >
      {/* Ripple effect */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full animate-ping"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20
          }}
        />
      ))}
      
      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Content */}
      <span className={cn("relative", loading && "opacity-0")}>
        {children}
      </span>
    </button>
  )
})
InteractiveButton.displayName = "InteractiveButton"

// Animated list item
export const AnimatedListItem = React.memo(({ 
  children,
  index = 0,
  isVisible = true,
  onRemove,
  className
}: {
  children: React.ReactNode
  index?: number
  isVisible?: boolean
  onRemove?: () => void
  className?: string
}) => {
  const [isRemoving, setIsRemoving] = React.useState(false)
  
  const handleRemove = React.useCallback(() => {
    setIsRemoving(true)
    setTimeout(() => {
      onRemove?.()
    }, 300)
  }, [onRemove])
  
  return (
    <TransitionWrapper
      isVisible={isVisible && !isRemoving}
      type="slide-up"
      delay={`${index * 50}ms`}
      duration="300ms"
      className={cn(
        "transform transition-all duration-300",
        isRemoving && "scale-95 opacity-0 -translate-x-full",
        className
      )}
    >
      <div className="hover:bg-accent/50 transition-colors duration-200 rounded-md">
        {children}
      </div>
    </TransitionWrapper>
  )
})
AnimatedListItem.displayName = "AnimatedListItem"