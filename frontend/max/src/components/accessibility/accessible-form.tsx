"use client"

import * as React from "react"
import { useAccessibleForm } from "@/hooks/use-accessibility"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { IconAlertCircle, IconCheck, IconLoader2 } from "@tabler/icons-react"

export interface AccessibleFormFieldProps {
  label: string
  description?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function AccessibleFormField({
  label,
  description,
  error,
  required = false,
  children,
  className
}: AccessibleFormFieldProps) {
  const { ref, state, actions, fieldProps, labelProps, descriptionProps, errorProps } = useAccessibleForm({
    label,
    description,
    error,
    required
  })

  return (
    <div className={cn("space-y-2", className)} ref={ref}>
      <Label {...labelProps} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="obrigatório">
            *
          </span>
        )}
      </Label>
      
      {description && (
        <p {...descriptionProps} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {React.cloneElement(children as React.ReactElement, fieldProps)}
      
      {error && (
        <div {...errorProps} className="flex items-center gap-2 text-sm text-destructive">
          <IconAlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  description?: string
  error?: string
  required?: boolean
  loading?: boolean
}

export function AccessibleInput({
  label,
  description,
  error,
  required = false,
  loading = false,
  className,
  ...props
}: AccessibleInputProps) {
  return (
    <AccessibleFormField
      label={label}
      description={description}
      error={error}
      required={required}
    >
      <div className="relative">
        <Input
          className={cn(
            error && "border-destructive focus-visible:ring-destructive",
            loading && "pr-10",
            className
          )}
          aria-busy={loading}
          {...props}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>
    </AccessibleFormField>
  )
}

export interface AccessibleTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  description?: string
  error?: string
  required?: boolean
  loading?: boolean
}

export function AccessibleTextarea({
  label,
  description,
  error,
  required = false,
  loading = false,
  className,
  ...props
}: AccessibleTextareaProps) {
  return (
    <AccessibleFormField
      label={label}
      description={description}
      error={error}
      required={required}
    >
      <div className="relative">
        <Textarea
          className={cn(
            error && "border-destructive focus-visible:ring-destructive",
            loading && "pr-10",
            className
          )}
          aria-busy={loading}
          {...props}
        />
        {loading && (
          <div className="absolute right-3 top-3">
            <IconLoader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>
    </AccessibleFormField>
  )
}

export interface AccessibleSelectProps {
  label: string
  description?: string
  error?: string
  required?: boolean
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  options: Array<{ value: string; label: string; disabled?: boolean }>
  loading?: boolean
  className?: string
}

export function AccessibleSelect({
  label,
  description,
  error,
  required = false,
  placeholder = "Selecione uma opção",
  value,
  onValueChange,
  options,
  loading = false,
  className
}: AccessibleSelectProps) {
  return (
    <AccessibleFormField
      label={label}
      description={description}
      error={error}
      required={required}
    >
      <Select value={value} onValueChange={onValueChange} disabled={loading}>
        <SelectTrigger 
          className={cn(
            error && "border-destructive focus:ring-destructive",
            className
          )}
          aria-busy={loading}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </AccessibleFormField>
  )
}

export interface AccessibleCheckboxProps {
  label: string
  description?: string
  error?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function AccessibleCheckbox({
  label,
  description,
  error,
  checked,
  onCheckedChange,
  disabled = false,
  className
}: AccessibleCheckboxProps) {
  const { ref, state, actions, fieldProps, labelProps, descriptionProps, errorProps } = useAccessibleForm({
    label,
    description,
    error
  })

  return (
    <div className={cn("space-y-2", className)} ref={ref}>
      <div className="flex items-start space-x-2">
        <Checkbox
          {...fieldProps}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className={cn(
            error && "border-destructive data-[state=checked]:bg-destructive",
            "mt-0.5"
          )}
        />
        <div className="space-y-1 leading-none">
          <Label 
            {...labelProps}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
          </Label>
          {description && (
            <p {...descriptionProps} className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      
      {error && (
        <div {...errorProps} className="flex items-center gap-2 text-sm text-destructive">
          <IconAlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export interface AccessibleRadioGroupProps {
  label: string
  description?: string
  error?: string
  required?: boolean
  value?: string
  onValueChange?: (value: string) => void
  options: Array<{ value: string; label: string; description?: string; disabled?: boolean }>
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function AccessibleRadioGroup({
  label,
  description,
  error,
  required = false,
  value,
  onValueChange,
  options,
  orientation = 'vertical',
  className
}: AccessibleRadioGroupProps) {
  const { ref, state, actions, fieldProps, labelProps, descriptionProps, errorProps } = useAccessibleForm({
    label,
    description,
    error,
    required
  })

  return (
    <div className={cn("space-y-3", className)} ref={ref}>
      <div className="space-y-1">
        <Label {...labelProps} className="text-sm font-medium leading-none">
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-label="obrigatório">
              *
            </span>
          )}
        </Label>
        {description && (
          <p {...descriptionProps} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      
      <RadioGroup
        {...fieldProps}
        value={value}
        onValueChange={onValueChange}
        className={cn(
          orientation === 'horizontal' && "flex flex-wrap gap-6",
          orientation === 'vertical' && "space-y-2"
        )}
        aria-invalid={!!error}
        aria-describedby={fieldProps['aria-describedby']}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-start space-x-2">
            <RadioGroupItem 
              value={option.value} 
              id={`${state.id}-${option.value}`}
              disabled={option.disabled}
              className={cn(
                error && "border-destructive text-destructive",
                "mt-0.5"
              )}
            />
            <div className="space-y-1 leading-none">
              <Label 
                htmlFor={`${state.id}-${option.value}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {option.label}
              </Label>
              {option.description && (
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </RadioGroup>
      
      {error && (
        <div {...errorProps} className="flex items-center gap-2 text-sm text-destructive">
          <IconAlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export interface AccessibleFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  title?: string
  description?: string
  children: React.ReactNode
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void
  loading?: boolean
  className?: string
}

export function AccessibleForm({
  title,
  description,
  children,
  onSubmit,
  loading = false,
  className,
  ...props
}: AccessibleFormProps) {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!loading) {
      onSubmit?.(event)
    }
  }

  return (
    <form
      className={cn("space-y-6", className)}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={loading}
      {...props}
    >
      {title && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      
      <fieldset disabled={loading} className="space-y-4">
        {loading && <span className="sr-only">Formulário sendo processado...</span>}
        {children}
      </fieldset>
    </form>
  )
}

export interface AccessibleSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  successText?: string
  showSuccess?: boolean
  children: React.ReactNode
}

export function AccessibleSubmitButton({
  loading = false,
  loadingText = "Processando...",
  successText = "Sucesso!",
  showSuccess = false,
  children,
  disabled,
  className,
  ...props
}: AccessibleSubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled || loading}
      className={cn(
        "relative",
        showSuccess && "bg-green-600 hover:bg-green-700",
        className
      )}
      aria-busy={loading}
      aria-live="polite"
      {...props}
    >
      {loading && (
        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      {showSuccess && (
        <IconCheck className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      
      <span>
        {loading ? loadingText : showSuccess ? successText : children}
      </span>
      
      {loading && (
        <span className="sr-only">
          Formulário sendo enviado, aguarde...
        </span>
      )}
    </Button>
  )
}

// Utility component for form sections
export function FormSection({
  title,
  description,
  children,
  className
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <fieldset className={cn("space-y-4", className)}>
      {title && (
        <legend className="text-base font-medium leading-none">
          {title}
        </legend>
      )}
      {description && (
        <p className="text-sm text-muted-foreground -mt-2">
          {description}
        </p>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </fieldset>
  )
}

// Utility component for form actions
export function FormActions({
  children,
  className,
  align = 'right'
}: {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
}) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  }

  return (
    <div className={cn(
      "flex items-center gap-2 pt-4 border-t",
      alignClasses[align],
      className
    )}>
      {children}
    </div>
  )
}