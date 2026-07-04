import { useState } from 'react'
import type {
  AlertCompletionState,
  AlertType,
  AlertOption,
} from '@/renderer/hooks/useAlertAutocomplete'

const MENU_HEIGHT = 220

interface AlertAutocompleteMenuProps {
  completionState: AlertCompletionState
  filteredOptions: readonly AlertOption[]
  onSelect: (type: AlertType) => void
}

export function AlertAutocompleteMenu({
  completionState,
  filteredOptions,
  onSelect,
}: AlertAutocompleteMenuProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!completionState.show) return null

  const { coords, selectedIndex } = completionState
  const activeIndex = hoveredIndex ?? selectedIndex

  const flipUp = window.innerHeight - coords.top < MENU_HEIGHT
  const top = flipUp ? coords.top - MENU_HEIGHT - 4 : coords.top + 4

  return (
    <div
      className="fixed z-50 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[200px]"
      data-alert-menu="true"
      onMouseLeave={() => setHoveredIndex(null)}
      role="menu"
      style={{ top, left: coords.left }}
    >
      {filteredOptions.map((option, index) => (
        <button
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground transition-colors text-left ${
            index === activeIndex ? 'bg-accent' : ''
          }`}
          key={option.type}
          onClick={() => onSelect(option.type)}
          onMouseDown={e => e.preventDefault()}
          onMouseEnter={() => setHoveredIndex(index)}
          type="button"
        >
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${option.color}`}
          />
          <span className="font-mono text-xs text-muted-foreground shrink-0">
            {option.previewText}
          </span>
          <span className="text-xs">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
