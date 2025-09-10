"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Screen reader only text component
export const ScreenReaderOnly = React.memo(({ 
  children,
  className 
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <span 
      className={cn(
        "sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        className
      )}
    >
      {children}
    </span>
  )
})
ScreenReaderOnly.displayName = "ScreenReaderOnly"

// Skip to content link
export const SkipToContent = React.memo(({ 
  targetId = "main-content",
  className 
}: {
  targetId?: string
  className?: string
}) => {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4",
        "bg-primary text-primary-foreground px-4 py-2 rounded-md z-50",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
    >
      Pular para o conteúdo principal
    </a>
  )
})
SkipToContent.displayName = "SkipToContent"

// Accessible button with proper ARIA attributes
export const AccessibleButton = React.memo(({ 
  children,
  onClick,
  disabled = false,
  loading = false,
  ariaLabel,
  ariaDescribedBy,
  ariaExpanded,
  ariaControls,
  className,
  variant = "default",
  size = "md",
  ...props
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  ariaLabel?: string
  ariaDescribedBy?: string
  ariaExpanded?: boolean
  ariaControls?: string
  className?: string
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost" | "destructive"
  size?: "sm" | "md" | "lg"
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const variantClasses = {
    default: "bg-background text-foreground border border-input hover:bg-accent hover:text-accent-foreground",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
  }
  
  const sizeClasses = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4",
    lg: "h-12 px-6 text-lg"
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-busy={loading}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && (
        <>
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <ScreenReaderOnly>Carregando...</ScreenReaderOnly>
        </>
      )}
      {children}
    </button>
  )
})
AccessibleButton.displayName = "AccessibleButton"

// Accessible form field with proper labeling
export const AccessibleFormField = React.memo(({ 
  id,
  label,
  description,
  error,
  required = false,
  children,
  className
}: {
  id: string
  label: string
  description?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) => {
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(' ')
  
  return (
    <div className={cn("space-y-2", className)}>
      <label 
        htmlFor={id}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="obrigatório">
            *
          </span>
        )}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {React.cloneElement(children as React.ReactElement, {
        id,
        'aria-describedby': ariaDescribedBy || undefined,
        'aria-required': required,
        'aria-invalid': !!error
      })}
      
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})
AccessibleFormField.displayName = "AccessibleFormField"

// Accessible table with proper headers and navigation
export const AccessibleTable = React.memo(({ 
  caption,
  headers,
  data,
  renderCell,
  className,
  ariaLabel
}: {
  caption?: string
  headers: Array<{ key: string; label: string; sortable?: boolean }>
  data: any[]
  renderCell: (item: any, key: string, index: number) => React.ReactNode
  className?: string
  ariaLabel?: string
}) => {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')
  
  const handleSort = (key: string) => {
    if (sortColumn === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(key)
      setSortDirection('asc')
    }
  }
  
  return (
    <div className="overflow-x-auto">
      <table 
        className={cn("w-full border-collapse", className)}
        aria-label={ariaLabel}
      >
        {caption && (
          <caption className="text-sm text-muted-foreground mb-4 text-left">
            {caption}
          </caption>
        )}
        
        <thead>
          <tr className="border-b">
            {headers.map((header) => (
              <th
                key={header.key}
                className="text-left p-4 font-medium"
                scope="col"
              >
                {header.sortable ? (
                  <button
                    onClick={() => handleSort(header.key)}
                    className="flex items-center space-x-1 hover:text-primary focus:outline-none focus:text-primary"
                    aria-sort={
                      sortColumn === header.key 
                        ? sortDirection === 'asc' ? 'ascending' : 'descending'
                        : 'none'
                    }
                  >
                    <span>{header.label}</span>
                    <span className="text-xs">
                      {sortColumn === header.key 
                        ? sortDirection === 'asc' ? '↑' : '↓'
                        : '↕'
                      }
                    </span>
                  </button>
                ) : (
                  header.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody>
          {data.map((item, index) => (
            <tr 
              key={item.id || index}
              className="border-b hover:bg-muted/50 focus-within:bg-muted/50"
            >
              {headers.map((header) => (
                <td key={header.key} className="p-4">
                  {renderCell(item, header.key, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})
AccessibleTable.displayName = "AccessibleTable"

// Accessible modal/dialog
export const AccessibleModal = React.memo(({ 
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  closeOnEscape = true,
  closeOnOverlayClick = true
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  closeOnEscape?: boolean
  closeOnOverlayClick?: boolean
}) => {
  const modalRef = React.useRef<HTMLDivElement>(null)
  const previousFocusRef = React.useRef<HTMLElement | null>(null)
  
  // Focus management
  React.useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      modalRef.current?.focus()
    } else {
      previousFocusRef.current?.focus()
    }
  }, [isOpen])
  
  // Escape key handler
  React.useEffect(() => {
    if (!closeOnEscape) return
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, closeOnEscape])
  
  // Focus trap
  React.useEffect(() => {
    if (!isOpen) return
    
    const modal = modalRef.current
    if (!modal) return
    
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
    
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }
    
    modal.addEventListener('keydown', handleTab)
    return () => modal.removeEventListener('keydown', handleTab)
  }, [isOpen])
  
  if (!isOpen) return null
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      
      {/* Modal content */}
      <div
        ref={modalRef}
        className={cn(
          "relative bg-card border rounded-lg shadow-lg max-w-md w-full mx-4 p-6",
          "focus:outline-none",
          className
        )}
        tabIndex={-1}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 id="modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            {description && (
              <p id="modal-description" className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          
          {children}
        </div>
      </div>
    </div>
  )
})
AccessibleModal.displayName = "AccessibleModal"

// Accessible navigation with keyboard support
export const AccessibleNavigation = React.memo(({ 
  items,
  currentPath,
  onNavigate,
  className,
  ariaLabel = "Navegação principal"
}: {
  items: Array<{ 
    id: string
    label: string
    href: string
    icon?: React.ReactNode
    disabled?: boolean
  }>
  currentPath: string
  onNavigate: (href: string) => void
  className?: string
  ariaLabel?: string
}) => {
  const [focusedIndex, setFocusedIndex] = React.useState(-1)
  const itemRefs = React.useRef<(HTMLAnchorElement | null)[]>([])
  
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        const nextIndex = (index + 1) % items.length
        setFocusedIndex(nextIndex)
        itemRefs.current[nextIndex]?.focus()
        break
        
      case 'ArrowUp':
        e.preventDefault()
        const prevIndex = index === 0 ? items.length - 1 : index - 1
        setFocusedIndex(prevIndex)
        itemRefs.current[prevIndex]?.focus()
        break
        
      case 'Home':
        e.preventDefault()
        setFocusedIndex(0)
        itemRefs.current[0]?.focus()
        break
        
      case 'End':
        e.preventDefault()
        const lastIndex = items.length - 1
        setFocusedIndex(lastIndex)
        itemRefs.current[lastIndex]?.focus()
        break
    }
  }
  
  return (
    <nav className={className} aria-label={ariaLabel} role="navigation">
      <ul className="space-y-1" role="menubar">
        {items.map((item, index) => {
          const isActive = currentPath === item.href
          const isFocused = focusedIndex === index
          
          return (
            <li key={item.id} role="none">
              <a
                ref={(el) => (itemRefs.current[index] = el)}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault()
                  if (!item.disabled) {
                    onNavigate(item.href)
                  }
                }}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(-1)}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  isActive && "bg-primary text-primary-foreground",
                  !isActive && "text-muted-foreground hover:text-foreground hover:bg-accent",
                  item.disabled && "opacity-50 cursor-not-allowed",
                  isFocused && "ring-2 ring-ring ring-offset-2"
                )}
                role="menuitem"
                aria-current={isActive ? "page" : undefined}
                aria-disabled={item.disabled}
                tabIndex={index === 0 ? 0 : -1}
              >
                {item.icon && (
                  <span className="flex-shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
})
AccessibleNavigation.displayName = "AccessibleNavigation"

// Accessible toast notifications
export const AccessibleToast = React.memo(({ 
  message,
  type = "info",
  isVisible,
  onClose,
  duration = 5000,
  className
}: {
  message: string
  type?: "info" | "success" | "warning" | "error"
  isVisible: boolean
  onClose: () => void
  duration?: number
  className?: string
}) => {
  const toastRef = React.useRef<HTMLDivElement>(null)
  
  React.useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])
  
  React.useEffect(() => {
    if (isVisible) {
      toastRef.current?.focus()
    }
  }, [isVisible])
  
  if (!isVisible) return null
  
  const typeConfig = {
    info: { icon: "ℹ️", bgColor: "bg-blue-50 border-blue-200", textColor: "text-blue-800" },
    success: { icon: "✅", bgColor: "bg-green-50 border-green-200", textColor: "text-green-800" },
    warning: { icon: "⚠️", bgColor: "bg-yellow-50 border-yellow-200", textColor: "text-yellow-800" },
    error: { icon: "❌", bgColor: "bg-red-50 border-red-200", textColor: "text-red-800" }
  }
  
  const config = typeConfig[type]
  
  return (
    <div
      ref={toastRef}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={-1}
      className={cn(
        "fixed top-4 right-4 z-50 flex items-center space-x-3 p-4 border rounded-lg shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:opacity-70 focus:outline-none focus:ring-2 focus:ring-ring rounded"
        aria-label="Fechar notificação"
      >
        ✕
      </button>
    </div>
  )
})
AccessibleToast.displayName = "AccessibleToast"