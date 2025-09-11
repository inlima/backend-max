"use client"

import * as React from "react"
import { useAccessibleDialog } from "@/hooks/use-accessibility"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { IconX } from "@tabler/icons-react"
import { createPortal } from "react-dom"

export interface AccessibleDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnEscape?: boolean
  closeOnOverlayClick?: boolean
  showCloseButton?: boolean
  className?: string
  overlayClassName?: string
  contentClassName?: string
}

export function AccessibleDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnEscape = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  className,
  overlayClassName,
  contentClassName
}: AccessibleDialogProps) {
  const { ref, state, actions, dialogProps, titleProps, descriptionProps } = useAccessibleDialog({
    title,
    description,
    isOpen
  })

  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Handle escape key
  React.useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [closeOnEscape, isOpen, onClose])

  // Prevent body scroll when dialog is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  // Announce dialog state to screen readers
  React.useEffect(() => {
    if (isOpen) {
      actions.announce(`Diálogo aberto: ${title}`, 'assertive')
    }
  }, [isOpen, title, actions])

  if (!mounted || !isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4'
  }

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        className
      )}
      role="presentation"
    >
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm",
          overlayClassName
        )}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      
      {/* Dialog content */}
      <div
        ref={ref}
        {...dialogProps}
        className={cn(
          "relative bg-background border rounded-lg shadow-lg w-full",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          sizeClasses[size],
          contentClassName
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="space-y-1 flex-1 min-w-0">
            <h2 
              {...titleProps}
              className="text-lg font-semibold leading-none tracking-tight"
            >
              {title}
            </h2>
            {description && (
              <p 
                {...descriptionProps}
                className="text-sm text-muted-foreground"
              >
                {description}
              </p>
            )}
          </div>
          
          {showCloseButton && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full flex-shrink-0 ml-4"
              onClick={onClose}
              aria-label="Fechar diálogo"
            >
              <IconX className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
        
        {/* Content */}
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Specialized dialog components
export interface AccessibleAlertDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
}

export function AccessibleAlertDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = 'default',
  loading = false
}: AccessibleAlertDialogProps) {
  const handleConfirm = () => {
    if (!loading) {
      onConfirm()
    }
  }

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
      showCloseButton={!loading}
    >
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={variant === 'destructive' ? 'destructive' : 'default'}
          onClick={handleConfirm}
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? 'Processando...' : confirmText}
        </Button>
      </div>
    </AccessibleDialog>
  )
}

export interface AccessibleFormDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  onSubmit?: (event: React.FormEvent) => void
  submitText?: string
  cancelText?: string
  loading?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function AccessibleFormDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  onSubmit,
  submitText = "Salvar",
  cancelText = "Cancelar",
  loading = false,
  size = 'md'
}: AccessibleFormDialogProps) {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!loading) {
      onSubmit?.(event)
    }
  }

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      closeOnEscape={!loading}
      closeOnOverlayClick={!loading}
      showCloseButton={!loading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset disabled={loading} className="space-y-4">
          {children}
        </fieldset>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Salvando...' : submitText}
          </Button>
        </div>
      </form>
    </AccessibleDialog>
  )
}

// Hook for managing dialog state
export function useDialog(initialOpen = false) {
  const [isOpen, setIsOpen] = React.useState(initialOpen)

  const open = React.useCallback(() => setIsOpen(true), [])
  const close = React.useCallback(() => setIsOpen(false), [])
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), [])

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen
  }
}