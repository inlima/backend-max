import { useEffect, useCallback, useRef, useState } from 'react'

// Keyboard navigation hook for lists and grids
export function useKeyboardNavigation<T extends HTMLElement = HTMLElement>(
  items: T[],
  options: {
    loop?: boolean
    orientation?: 'horizontal' | 'vertical' | 'both'
    onSelect?: (index: number, element: T) => void
    onEscape?: () => void
    disabled?: boolean
  } = {}
) {
  const {
    loop = true,
    orientation = 'vertical',
    onSelect,
    onEscape,
    disabled = false
  } = options

  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLElement>(null)

  const focusItem = useCallback((index: number) => {
    if (disabled || index < 0 || index >= items.length) return

    const item = items[index]
    if (item) {
      item.focus()
      setFocusedIndex(index)
    }
  }, [items, disabled])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled || items.length === 0) return

    const { key } = event
    let newIndex = focusedIndex

    switch (key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault()
          newIndex = focusedIndex + 1
          if (newIndex >= items.length) {
            newIndex = loop ? 0 : items.length - 1
          }
        }
        break

      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault()
          newIndex = focusedIndex - 1
          if (newIndex < 0) {
            newIndex = loop ? items.length - 1 : 0
          }
        }
        break

      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault()
          newIndex = focusedIndex + 1
          if (newIndex >= items.length) {
            newIndex = loop ? 0 : items.length - 1
          }
        }
        break

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault()
          newIndex = focusedIndex - 1
          if (newIndex < 0) {
            newIndex = loop ? items.length - 1 : 0
          }
        }
        break

      case 'Home':
        event.preventDefault()
        newIndex = 0
        break

      case 'End':
        event.preventDefault()
        newIndex = items.length - 1
        break

      case 'Enter':
      case ' ':
        if (focusedIndex >= 0) {
          event.preventDefault()
          onSelect?.(focusedIndex, items[focusedIndex])
        }
        break

      case 'Escape':
        event.preventDefault()
        onEscape?.()
        break

      default:
        return
    }

    if (newIndex !== focusedIndex) {
      focusItem(newIndex)
    }
  }, [focusedIndex, items, orientation, loop, onSelect, onEscape, disabled, focusItem])

  useEffect(() => {
    const container = containerRef.current
    if (!container || disabled) return

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, disabled])

  return {
    containerRef,
    focusedIndex,
    focusItem,
    setFocusedIndex
  }
}

// Hook for managing focus trap in modals/dialogs
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isActive) return

    const container = containerRef.current
    if (!container) return

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element on mount
    firstElement?.focus()

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTab)
    return () => container.removeEventListener('keydown', handleTab)
  }, [isActive])

  return containerRef
}

// Hook for managing roving tabindex
export function useRovingTabIndex<T extends HTMLElement = HTMLElement>(
  items: T[],
  defaultIndex: number = 0
) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex)

  useEffect(() => {
    items.forEach((item, index) => {
      if (item) {
        item.tabIndex = index === activeIndex ? 0 : -1
      }
    })
  }, [items, activeIndex])

  const setActiveItem = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setActiveIndex(index)
      items[index]?.focus()
    }
  }, [items])

  return {
    activeIndex,
    setActiveItem
  }
}

// Hook for keyboard shortcuts
export function useKeyboardShortcuts(
  shortcuts: Record<string, () => void>,
  options: {
    enabled?: boolean
    preventDefault?: boolean
    stopPropagation?: boolean
  } = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false
  } = options

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const modifiers = []

      if (event.ctrlKey) modifiers.push('ctrl')
      if (event.altKey) modifiers.push('alt')
      if (event.shiftKey) modifiers.push('shift')
      if (event.metaKey) modifiers.push('meta')

      const shortcutKey = modifiers.length > 0 
        ? `${modifiers.join('+')}+${key}`
        : key

      const handler = shortcuts[shortcutKey]
      if (handler) {
        if (preventDefault) event.preventDefault()
        if (stopPropagation) event.stopPropagation()
        handler()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled, preventDefault, stopPropagation])
}

// Hook for accessible dropdown/combobox
export function useCombobox<T>(
  items: T[],
  options: {
    getItemText: (item: T) => string
    onSelect: (item: T) => void
    filter?: (items: T[], query: string) => T[]
    disabled?: boolean
  }
) {
  const {
    getItemText,
    onSelect,
    filter,
    disabled = false
  } = options

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const filteredItems = filter ? filter(items, query) : items.filter(item =>
    getItemText(item).toLowerCase().includes(query.toLowerCase())
  )

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const handleInputKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex(prev => 
            prev < filteredItems.length - 1 ? prev + 1 : 0
          )
        }
        break

      case 'ArrowUp':
        event.preventDefault()
        if (isOpen) {
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : filteredItems.length - 1
          )
        }
        break

      case 'Enter':
        event.preventDefault()
        if (isOpen && highlightedIndex >= 0) {
          onSelect(filteredItems[highlightedIndex])
          setIsOpen(false)
          setQuery('')
          setHighlightedIndex(-1)
        }
        break

      case 'Escape':
        event.preventDefault()
        setIsOpen(false)
        setHighlightedIndex(-1)
        break

      case 'Tab':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }, [disabled, isOpen, highlightedIndex, filteredItems, onSelect])

  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    input.addEventListener('keydown', handleInputKeyDown)
    return () => input.removeEventListener('keydown', handleInputKeyDown)
  }, [handleInputKeyDown])

  // Reset highlighted index when filtered items change
  useEffect(() => {
    setHighlightedIndex(-1)
  }, [filteredItems])

  return {
    inputRef,
    listRef,
    isOpen,
    setIsOpen,
    query,
    setQuery,
    highlightedIndex,
    setHighlightedIndex,
    filteredItems,
    inputProps: {
      role: 'combobox',
      'aria-expanded': isOpen,
      'aria-haspopup': 'listbox',
      'aria-autocomplete': 'list' as const,
      'aria-activedescendant': highlightedIndex >= 0 
        ? `option-${highlightedIndex}` 
        : undefined
    },
    listProps: {
      role: 'listbox',
      'aria-label': 'Opções disponíveis'
    }
  }
}

// Hook for accessible tabs
export function useTabs(
  tabs: Array<{ id: string; label: string; disabled?: boolean }>,
  defaultTab?: string
) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const handleKeyDown = useCallback((event: KeyboardEvent, tabId: string) => {
    const currentIndex = tabs.findIndex(tab => tab.id === tabId)
    let newIndex = currentIndex

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        newIndex = (currentIndex + 1) % tabs.length
        break

      case 'ArrowLeft':
        event.preventDefault()
        newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1
        break

      case 'Home':
        event.preventDefault()
        newIndex = 0
        break

      case 'End':
        event.preventDefault()
        newIndex = tabs.length - 1
        break

      default:
        return
    }

    const newTab = tabs[newIndex]
    if (newTab && !newTab.disabled) {
      setActiveTab(newTab.id)
      tabRefs.current[newTab.id]?.focus()
    }
  }, [tabs])

  const getTabProps = useCallback((tab: { id: string; label: string; disabled?: boolean }) => ({
    ref: (el: HTMLButtonElement | null) => {
      tabRefs.current[tab.id] = el
    },
    role: 'tab',
    'aria-selected': activeTab === tab.id,
    'aria-controls': `panel-${tab.id}`,
    id: `tab-${tab.id}`,
    tabIndex: activeTab === tab.id ? 0 : -1,
    disabled: tab.disabled,
    onKeyDown: (event: React.KeyboardEvent) => handleKeyDown(event.nativeEvent, tab.id),
    onClick: () => !tab.disabled && setActiveTab(tab.id)
  }), [activeTab, handleKeyDown])

  const getPanelProps = useCallback((tabId: string) => ({
    role: 'tabpanel',
    'aria-labelledby': `tab-${tabId}`,
    id: `panel-${tabId}`,
    tabIndex: 0
  }), [])

  return {
    activeTab,
    setActiveTab,
    getTabProps,
    getPanelProps,
    tabListProps: {
      role: 'tablist',
      'aria-orientation': 'horizontal' as const
    }
  }
}

// Hook for accessible disclosure/accordion
export function useDisclosure(defaultOpen: boolean = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const triggerId = useRef(`disclosure-trigger-${Math.random().toString(36).substr(2, 9)}`)
  const contentId = useRef(`disclosure-content-${Math.random().toString(36).substr(2, 9)}`)

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const triggerProps = {
    'aria-expanded': isOpen,
    'aria-controls': contentId.current,
    id: triggerId.current,
    onClick: toggle
  }

  const contentProps = {
    'aria-labelledby': triggerId.current,
    id: contentId.current,
    hidden: !isOpen
  }

  return {
    isOpen,
    setIsOpen,
    toggle,
    triggerProps,
    contentProps
  }
}