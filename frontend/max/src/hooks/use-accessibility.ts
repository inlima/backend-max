// Accessibility hook for WCAG 2.1 AA compliance

import { useEffect, useRef, useState, useCallback } from 'react'
import { generateId, announceToScreenReader, FocusManager } from '@/lib/aria-utils'
import { KeyboardNavigationManager, FocusTrap } from '@/lib/keyboard-navigation'
import { runAccessibilityTests, AccessibilityTestResult } from '@/lib/accessibility-testing'

export interface UseAccessibilityOptions {
  // Focus management
  autoFocus?: boolean
  restoreFocus?: boolean
  trapFocus?: boolean
  
  // Keyboard navigation
  enableKeyboardNavigation?: boolean
  keyboardNavigationConfig?: {
    enableArrowKeys?: boolean
    enableHomeEnd?: boolean
    enableTypeAhead?: boolean
    orientation?: 'horizontal' | 'vertical' | 'both'
  }
  
  // ARIA attributes
  role?: string
  ariaLabel?: string
  ariaLabelledBy?: string
  ariaDescribedBy?: string
  ariaExpanded?: boolean
  ariaSelected?: boolean
  ariaChecked?: boolean
  
  // Live regions
  liveRegion?: 'polite' | 'assertive' | 'off'
  
  // Testing
  enableTesting?: boolean
  testLevel?: 'A' | 'AA' | 'AAA'
}

export interface AccessibilityState {
  // IDs for ARIA relationships
  id: string
  labelId: string
  descriptionId: string
  errorId: string
  
  // Focus state
  isFocused: boolean
  hasFocusWithin: boolean
  
  // Testing results
  testResults?: AccessibilityTestResult
  
  // Keyboard navigation
  currentNavigationIndex: number
}

export interface AccessibilityActions {
  // Focus management
  focus: () => void
  blur: () => void
  
  // Announcements
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  
  // Testing
  runTests: () => Promise<AccessibilityTestResult>
  
  // Keyboard navigation
  updateNavigationItems: () => void
  focusNavigationIndex: (index: number) => void
}

export function useAccessibility(
  options: UseAccessibilityOptions = {}
): [React.RefObject<HTMLElement>, AccessibilityState, AccessibilityActions] {
  const elementRef = useRef<HTMLElement>(null)
  const focusTrapRef = useRef<FocusTrap | null>(null)
  const keyboardNavRef = useRef<KeyboardNavigationManager | null>(null)
  const liveRegionRef = useRef<HTMLElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Generate stable IDs
  const [ids] = useState(() => ({
    id: generateId('accessible-element'),
    labelId: generateId('label'),
    descriptionId: generateId('description'),
    errorId: generateId('error')
  }))

  // State
  const [isFocused, setIsFocused] = useState(false)
  const [hasFocusWithin, setHasFocusWithin] = useState(false)
  const [currentNavigationIndex, setCurrentNavigationIndex] = useState(-1)
  const [testResults, setTestResults] = useState<AccessibilityTestResult>()

  // Setup element attributes
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Set basic attributes
    if (!element.id) element.id = ids.id
    if (options.role) element.setAttribute('role', options.role)
    if (options.ariaLabel) element.setAttribute('aria-label', options.ariaLabel)
    if (options.ariaLabelledBy) element.setAttribute('aria-labelledby', options.ariaLabelledBy)
    if (options.ariaDescribedBy) element.setAttribute('aria-describedby', options.ariaDescribedBy)
    if (options.ariaExpanded !== undefined) element.setAttribute('aria-expanded', String(options.ariaExpanded))
    if (options.ariaSelected !== undefined) element.setAttribute('aria-selected', String(options.ariaSelected))
    if (options.ariaChecked !== undefined) element.setAttribute('aria-checked', String(options.ariaChecked))

    // Set up live region
    if (options.liveRegion && options.liveRegion !== 'off') {
      element.setAttribute('aria-live', options.liveRegion)
      element.setAttribute('aria-atomic', 'true')
    }
  }, [
    ids.id,
    options.role,
    options.ariaLabel,
    options.ariaLabelledBy,
    options.ariaDescribedBy,
    options.ariaExpanded,
    options.ariaSelected,
    options.ariaChecked,
    options.liveRegion
  ])

  // Setup focus management
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleFocus = () => setIsFocused(true)
    const handleBlur = () => setIsFocused(false)
    const handleFocusIn = () => setHasFocusWithin(true)
    const handleFocusOut = (e: FocusEvent) => {
      // Check if focus is moving outside the element
      if (!element.contains(e.relatedTarget as Node)) {
        setHasFocusWithin(false)
      }
    }

    element.addEventListener('focus', handleFocus)
    element.addEventListener('blur', handleBlur)
    element.addEventListener('focusin', handleFocusIn)
    element.addEventListener('focusout', handleFocusOut)

    // Auto focus if requested
    if (options.autoFocus) {
      // Save current focus for restoration
      if (options.restoreFocus) {
        previousFocusRef.current = document.activeElement as HTMLElement
      }
      element.focus()
    }

    return () => {
      element.removeEventListener('focus', handleFocus)
      element.removeEventListener('blur', handleBlur)
      element.removeEventListener('focusin', handleFocusIn)
      element.removeEventListener('focusout', handleFocusOut)
    }
  }, [options.autoFocus, options.restoreFocus])

  // Setup focus trap
  useEffect(() => {
    const element = elementRef.current
    if (!element || !options.trapFocus) return

    focusTrapRef.current = new FocusTrap(element)
    focusTrapRef.current.activate()

    return () => {
      if (focusTrapRef.current) {
        focusTrapRef.current.deactivate()
        focusTrapRef.current = null
      }
    }
  }, [options.trapFocus])

  // Setup keyboard navigation
  useEffect(() => {
    const element = elementRef.current
    if (!element || !options.enableKeyboardNavigation) return

    keyboardNavRef.current = new KeyboardNavigationManager(element, {
      ...options.keyboardNavigationConfig,
      skipDisabled: true
    })

    // Listen for navigation changes
    const updateIndex = () => {
      if (keyboardNavRef.current) {
        setCurrentNavigationIndex(keyboardNavRef.current.getCurrentIndex())
      }
    }

    // Update index when items change
    const observer = new MutationObserver(updateIndex)
    observer.observe(element, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      if (keyboardNavRef.current) {
        keyboardNavRef.current.destroy()
        keyboardNavRef.current = null
      }
    }
  }, [options.enableKeyboardNavigation, options.keyboardNavigationConfig])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Restore focus if needed
      if (options.restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus()
      }

      // Clean up live region
      if (liveRegionRef.current) {
        document.body.removeChild(liveRegionRef.current)
        liveRegionRef.current = null
      }
    }
  }, [options.restoreFocus])

  // Actions
  const focus = useCallback(() => {
    elementRef.current?.focus()
  }, [])

  const blur = useCallback(() => {
    elementRef.current?.blur()
  }, [])

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader(message, priority)
  }, [])

  const runTests = useCallback(async (): Promise<AccessibilityTestResult> => {
    if (!elementRef.current || !options.enableTesting) {
      return {
        passed: true,
        level: 'AA',
        issues: [],
        score: 100
      }
    }

    const results = await runAccessibilityTests(elementRef.current, options.testLevel)
    setTestResults(results)
    return results
  }, [options.enableTesting, options.testLevel])

  const updateNavigationItems = useCallback(() => {
    if (keyboardNavRef.current) {
      keyboardNavRef.current.updateItems()
      setCurrentNavigationIndex(keyboardNavRef.current.getCurrentIndex())
    }
  }, [])

  const focusNavigationIndex = useCallback((index: number) => {
    if (keyboardNavRef.current) {
      keyboardNavRef.current.focusIndex(index)
      setCurrentNavigationIndex(index)
    }
  }, [])

  // State object
  const state: AccessibilityState = {
    id: ids.id,
    labelId: ids.labelId,
    descriptionId: ids.descriptionId,
    errorId: ids.errorId,
    isFocused,
    hasFocusWithin,
    testResults,
    currentNavigationIndex
  }

  // Actions object
  const actions: AccessibilityActions = {
    focus,
    blur,
    announce,
    runTests,
    updateNavigationItems,
    focusNavigationIndex
  }

  return [elementRef, state, actions]
}

// Specialized hooks for common patterns

// Hook for form fields
export function useAccessibleForm(options: {
  label?: string
  description?: string
  error?: string
  required?: boolean
} = {}) {
  const [ref, state, actions] = useAccessibility({
    ariaDescribedBy: [
      options.description ? state.descriptionId : '',
      options.error ? state.errorId : ''
    ].filter(Boolean).join(' ') || undefined
  })

  return {
    ref,
    state,
    actions,
    fieldProps: {
      id: state.id,
      'aria-labelledby': options.label ? state.labelId : undefined,
      'aria-describedby': state.ariaDescribedBy,
      'aria-required': options.required,
      'aria-invalid': !!options.error
    },
    labelProps: {
      id: state.labelId,
      htmlFor: state.id
    },
    descriptionProps: options.description ? {
      id: state.descriptionId
    } : undefined,
    errorProps: options.error ? {
      id: state.errorId,
      role: 'alert'
    } : undefined
  }
}

// Hook for buttons
export function useAccessibleButton(options: {
  pressed?: boolean
  expanded?: boolean
  controls?: string
  describedBy?: string
} = {}) {
  const [ref, state, actions] = useAccessibility({
    role: 'button',
    ariaExpanded: options.expanded,
    ariaDescribedBy: options.describedBy
  })

  return {
    ref,
    state,
    actions,
    buttonProps: {
      id: state.id,
      role: 'button',
      'aria-pressed': options.pressed,
      'aria-expanded': options.expanded,
      'aria-controls': options.controls,
      'aria-describedby': options.describedBy,
      tabIndex: 0
    }
  }
}

// Hook for dialogs/modals
export function useAccessibleDialog(options: {
  title?: string
  description?: string
  isOpen?: boolean
} = {}) {
  const [ref, state, actions] = useAccessibility({
    role: 'dialog',
    ariaLabelledBy: options.title ? state.labelId : undefined,
    ariaDescribedBy: options.description ? state.descriptionId : undefined,
    trapFocus: options.isOpen,
    autoFocus: options.isOpen,
    restoreFocus: true
  })

  return {
    ref,
    state,
    actions,
    dialogProps: {
      id: state.id,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': options.title ? state.labelId : undefined,
      'aria-describedby': options.description ? state.descriptionId : undefined,
      tabIndex: -1
    },
    titleProps: options.title ? {
      id: state.labelId
    } : undefined,
    descriptionProps: options.description ? {
      id: state.descriptionId
    } : undefined
  }
}

// Hook for tables
export function useAccessibleTable(options: {
  caption?: string
  sortable?: boolean
} = {}) {
  const [ref, state, actions] = useAccessibility({
    role: 'table',
    enableKeyboardNavigation: true,
    keyboardNavigationConfig: {
      enableArrowKeys: true,
      enableHomeEnd: true,
      orientation: 'both'
    }
  })

  return {
    ref,
    state,
    actions,
    tableProps: {
      id: state.id,
      role: 'table',
      'aria-label': options.caption
    }
  }
}

// Hook for lists
export function useAccessibleList(options: {
  multiselectable?: boolean
  orientation?: 'horizontal' | 'vertical'
} = {}) {
  const [ref, state, actions] = useAccessibility({
    role: options.multiselectable ? 'listbox' : 'list',
    enableKeyboardNavigation: true,
    keyboardNavigationConfig: {
      enableArrowKeys: true,
      enableHomeEnd: true,
      enableTypeAhead: true,
      orientation: options.orientation || 'vertical'
    }
  })

  return {
    ref,
    state,
    actions,
    listProps: {
      id: state.id,
      role: options.multiselectable ? 'listbox' : 'list',
      'aria-multiselectable': options.multiselectable,
      'aria-orientation': options.orientation
    }
  }
}