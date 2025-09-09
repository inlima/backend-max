'use client'

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface BaseFieldProps {
  name: string
  label?: string
  description?: string
  required?: boolean
  className?: string
  disabled?: boolean
}

interface FormFieldErrorProps {
  message?: string
  className?: string
}

export function FormFieldError({ message, className }: FormFieldErrorProps) {
  if (!message) return null

  return (
    <div className={cn('flex items-center gap-1 text-sm text-red-600 dark:text-red-400', className)}>
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

interface FormFieldSuccessProps {
  message?: string
  className?: string
}

export function FormFieldSuccess({ message, className }: FormFieldSuccessProps) {
  if (!message) return null

  return (
    <div className={cn('flex items-center gap-1 text-sm text-green-600 dark:text-green-400', className)}>
      <CheckCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}

interface FormFieldWrapperProps extends BaseFieldProps {
  children: React.ReactNode
  error?: string
  success?: string
}

function FormFieldWrapper({ 
  name, 
  label, 
  description, 
  required, 
  className, 
  children, 
  error, 
  success 
}: FormFieldWrapperProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      
      {children}
      
      <FormFieldError message={error} />
      <FormFieldSuccess message={success} />
    </div>
  )
}

// Text Input Field
interface TextFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'tel' | 'password' | 'url'
  placeholder?: string
  autoComplete?: string
}

export function TextField({ 
  name, 
  type = 'text', 
  placeholder, 
  autoComplete, 
  ...wrapperProps 
}: TextFieldProps) {
  const { register, formState: { errors } } = useFormContext()
  const error = errors[name]?.message as string

  return (
    <FormFieldWrapper name={name} error={error} {...wrapperProps}>
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(error && 'border-red-500 focus:border-red-500')}
        {...register(name)}
      />
    </FormFieldWrapper>
  )
}

// Textarea Field
interface TextareaFieldProps extends BaseFieldProps {
  placeholder?: string
  rows?: number
}

export function TextareaField({ 
  name, 
  placeholder, 
  rows = 3, 
  ...wrapperProps 
}: TextareaFieldProps) {
  const { register, formState: { errors } } = useFormContext()
  const error = errors[name]?.message as string

  return (
    <FormFieldWrapper name={name} error={error} {...wrapperProps}>
      <Textarea
        id={name}
        placeholder={placeholder}
        rows={rows}
        className={cn(error && 'border-red-500 focus:border-red-500')}
        {...register(name)}
      />
    </FormFieldWrapper>
  )
}

// Select Field
interface SelectFieldProps extends BaseFieldProps {
  placeholder?: string
  options: Array<{ value: string; label: string; disabled?: boolean }>
}

export function SelectField({ 
  name, 
  placeholder = 'Selecione uma opção', 
  options, 
  ...wrapperProps 
}: SelectFieldProps) {
  const { setValue, watch, formState: { errors } } = useFormContext()
  const value = watch(name)
  const error = errors[name]?.message as string

  return (
    <FormFieldWrapper name={name} error={error} {...wrapperProps}>
      <Select
        value={value || ''}
        onValueChange={(newValue) => setValue(name, newValue, { shouldValidate: true })}
      >
        <SelectTrigger 
          id={name}
          className={cn(error && 'border-red-500 focus:border-red-500')}
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
    </FormFieldWrapper>
  )
}

// Checkbox Field
interface CheckboxFieldProps extends BaseFieldProps {
  text?: string
}

export function CheckboxField({ 
  name, 
  text, 
  ...wrapperProps 
}: CheckboxFieldProps) {
  const { setValue, watch, formState: { errors } } = useFormContext()
  const value = watch(name)
  const error = errors[name]?.message as string

  return (
    <FormFieldWrapper name={name} error={error} {...wrapperProps}>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={name}
          checked={value || false}
          onCheckedChange={(checked) => setValue(name, checked, { shouldValidate: true })}
          className={cn(error && 'border-red-500')}
        />
        {text && (
          <Label htmlFor={name} className="text-sm font-normal cursor-pointer">
            {text}
          </Label>
        )}
      </div>
    </FormFieldWrapper>
  )
}

// Radio Group Field
interface RadioFieldProps extends BaseFieldProps {
  options: Array<{ value: string; label: string; description?: string }>
}

export function RadioField({ 
  name, 
  options, 
  ...wrapperProps 
}: RadioFieldProps) {
  const { setValue, watch, formState: { errors } } = useFormContext()
  const value = watch(name)
  const error = errors[name]?.message as string

  return (
    <FormFieldWrapper name={name} error={error} {...wrapperProps}>
      <RadioGroup
        value={value || ''}
        onValueChange={(newValue) => setValue(name, newValue, { shouldValidate: true })}
        className="space-y-2"
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem 
              value={option.value} 
              id={`${name}-${option.value}`}
              className={cn(error && 'border-red-500')}
            />
            <div className="flex-1">
              <Label 
                htmlFor={`${name}-${option.value}`} 
                className="text-sm font-normal cursor-pointer"
              >
                {option.label}
              </Label>
              {option.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </RadioGroup>
    </FormFieldWrapper>
  )
}

// Phone Field with Brazilian formatting
interface PhoneFieldProps extends BaseFieldProps {
  placeholder?: string
}

export function PhoneField({ 
  name, 
  placeholder = '(11) 99999-9999', 
  ...wrapperProps 
}: PhoneFieldProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext()
  const value = watch(name)
  const error = errors[name]?.message as string

  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Apply Brazilian phone formatting
    if (digits.length <= 2) {
      return `(${digits}`
    } else if (digits.length <= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    } else if (digits.length <= 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    } else {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setValue(name, formatted, { shouldValidate: true })
  }

  return (
    <FormFieldWrapper name={name} error={error} {...wrapperProps}>
      <Input
        id={name}
        type="tel"
        placeholder={placeholder}
        value={value || ''}
        onChange={handleChange}
        className={cn(error && 'border-red-500 focus:border-red-500')}
        maxLength={15}
      />
    </FormFieldWrapper>
  )
}

// Date Field
interface DateFieldProps extends BaseFieldProps {
  min?: string
  max?: string
}

export function DateField({ 
  name, 
  min, 
  max, 
  ...wrapperProps 
}: DateFieldProps) {
  const { register, formState: { errors } } = useFormContext()
  const error = errors[name]?.message as string

  return (
    <FormFieldWrapper name={name} error={error} {...wrapperProps}>
      <Input
        id={name}
        type="date"
        min={min}
        max={max}
        className={cn(error && 'border-red-500 focus:border-red-500')}
        {...register(name)}
      />
    </FormFieldWrapper>
  )
}