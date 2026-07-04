import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiDroplet } from 'react-icons/fi'
import {
  GoBold,
  GoItalic,
  GoCodeSquare,
  GoLink,
  GoListUnordered,
  GoListOrdered,
  GoStrikethrough,
  GoQuote,
  GoTasklist,
  GoInfo,
} from 'react-icons/go'
import { SimpleTooltip } from '../ui/tooltip'
import { Button } from '../ui/button'
import { ALERT_OPTIONS } from '@/renderer/lib/alertOptions'

interface SelectionToolbarProps {
  position: { top: number; left: number }
  onApplyFormat: (prefix: string, suffix?: string) => void
  onApplyList: (type: 'bullet' | 'ordered') => void
  onApplyQuote: () => void
  onApplyCheckbox: () => void
  onApplyColor: (color: string) => void
  onApplyAlert: (
    type: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION'
  ) => void
}

/**
 * テキスト選択時に表示されるフローティングツールバー。
 * パレットの表示状態はコンポーネント内部で管理する。
 */
export function SelectionToolbar({
  position,
  onApplyFormat,
  onApplyList,
  onApplyQuote,
  onApplyCheckbox,
  onApplyColor,
  onApplyAlert,
}: SelectionToolbarProps) {
  const { t } = useTranslation()
  const [showColorPalette, setShowColorPalette] = useState(false)
  const [showAlertPalette, setShowAlertPalette] = useState(false)

  const sep = <div className="w-px h-6 bg-border self-center" />

  const handleColorApply = (color: string) => {
    setShowColorPalette(false)
    onApplyColor(color)
  }

  const handleAlertApply = (
    type: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION'
  ) => {
    setShowAlertPalette(false)
    onApplyAlert(type)
  }

  const toggleColor = () => {
    setShowAlertPalette(false)
    setShowColorPalette(v => !v)
  }

  const toggleAlert = () => {
    setShowColorPalette(false)
    setShowAlertPalette(v => !v)
  }

  return (
    <div
      aria-label="Selection formatting toolbar"
      className="fixed z-50 bg-popover text-popover-foreground rounded-lg border border-border p-1 flex gap-1 items-center shadow-[var(--elevation-md)]"
      onMouseDown={e => e.preventDefault()}
      role="toolbar"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <SimpleTooltip content={t('editor.toolbar.bold')}>
        <Button
          aria-label={t('editor.toolbar.bold')}
          onClick={() => onApplyFormat('**')}
          size="icon"
          variant="ghost"
        >
          <GoBold size={16} />
        </Button>
      </SimpleTooltip>
      <SimpleTooltip content={t('editor.toolbar.italic')}>
        <Button
          aria-label={t('editor.toolbar.italic')}
          onClick={() => onApplyFormat('*')}
          size="icon"
          variant="ghost"
        >
          <GoItalic size={16} />
        </Button>
      </SimpleTooltip>
      <SimpleTooltip content={t('editor.toolbar.code')}>
        <Button
          aria-label={t('editor.toolbar.code')}
          onClick={() => onApplyFormat('`')}
          size="icon"
          variant="ghost"
        >
          <GoCodeSquare size={16} />
        </Button>
      </SimpleTooltip>
      <SimpleTooltip content={t('editor.toolbar.strikethrough')}>
        <Button
          aria-label={t('editor.toolbar.strikethrough')}
          onClick={() => onApplyFormat('~~')}
          size="icon"
          variant="ghost"
        >
          <GoStrikethrough size={16} />
        </Button>
      </SimpleTooltip>
      <SimpleTooltip content={t('editor.toolbar.link')}>
        <Button
          aria-label={t('editor.toolbar.link')}
          onClick={() => onApplyFormat('[', '](url)')}
          size="icon"
          variant="ghost"
        >
          <GoLink size={16} />
        </Button>
      </SimpleTooltip>
      {sep}
      <SimpleTooltip content={t('editor.toolbar.quote')}>
        <Button
          aria-label={t('editor.toolbar.quote')}
          onClick={onApplyQuote}
          size="icon"
          variant="ghost"
        >
          <GoQuote size={16} />
        </Button>
      </SimpleTooltip>
      <SimpleTooltip content={t('editor.toolbar.checkbox')}>
        <Button
          aria-label={t('editor.toolbar.checkbox')}
          onClick={onApplyCheckbox}
          size="icon"
          variant="ghost"
        >
          <GoTasklist size={16} />
        </Button>
      </SimpleTooltip>
      <SimpleTooltip content={t('editor.toolbar.bulletList')}>
        <Button
          aria-label={t('editor.toolbar.bulletList')}
          onClick={() => onApplyList('bullet')}
          size="icon"
          variant="ghost"
        >
          <GoListUnordered size={16} />
        </Button>
      </SimpleTooltip>
      <SimpleTooltip content={t('editor.toolbar.orderedList')}>
        <Button
          aria-label={t('editor.toolbar.orderedList')}
          onClick={() => onApplyList('ordered')}
          size="icon"
          variant="ghost"
        >
          <GoListOrdered size={16} />
        </Button>
      </SimpleTooltip>
      {sep}
      <div className="relative self-center">
        <SimpleTooltip content={t('editor.toolbar.color')}>
          <Button
            aria-label={t('editor.toolbar.color')}
            onClick={toggleColor}
            size="icon"
            variant="ghost"
          >
            <FiDroplet size={15} />
          </Button>
        </SimpleTooltip>
        {showColorPalette && <ColorPalette onApplyColor={handleColorApply} />}
      </div>
      <div className="relative self-center">
        <SimpleTooltip content={t('editor.toolbar.alert')}>
          <Button
            aria-label={t('editor.toolbar.alert')}
            onClick={toggleAlert}
            size="icon"
            variant="ghost"
          >
            <GoInfo size={15} />
          </Button>
        </SimpleTooltip>
        {showAlertPalette && <AlertPalette onApplyAlert={handleAlertApply} />}
      </div>
    </div>
  )
}

// ─── Color Palette ────────────────────────────────────────────────────────────

interface ColorPaletteProps {
  onApplyColor: (color: string) => void
}

function ColorPalette({ onApplyColor }: ColorPaletteProps) {
  const colors = [
    { color: '#EF4444', title: 'Red' },
    { color: '#F97316', title: 'Orange' },
    { color: '#F59E0B', title: 'Amber' },
    { color: '#EAB308', title: 'Yellow' },
    { color: '#84CC16', title: 'Lime' },
    { color: '#22C55E', title: 'Green' },
    { color: '#10B981', title: 'Emerald' },
    { color: '#14B8A6', title: 'Teal' },
    { color: '#06B6D4', title: 'Cyan' },
    { color: '#0EA5E9', title: 'Sky' },
    { color: '#3B82F6', title: 'Blue' },
    { color: '#6366F1', title: 'Indigo' },
    { color: '#8B5CF6', title: 'Violet' },
    { color: '#A855F7', title: 'Purple' },
    { color: '#D946EF', title: 'Fuchsia' },
    { color: '#EC4899', title: 'Pink' },
  ]

  return (
    <div className="absolute left-0 top-full mt-1 bg-popover shadow-[var(--elevation-lg)] rounded-lg border border-border p-3 grid grid-cols-4 gap-3 z-50">
      {colors.map(({ color, title }) => (
        <button
          className="w-8 h-8 rounded-md hover:scale-110 transition-transform border-2 border-background shadow-sm"
          key={color}
          onClick={() => onApplyColor(color)}
          style={{ backgroundColor: color }}
          title={title}
          type="button"
        />
      ))}
    </div>
  )
}

// ─── Alert Palette ────────────────────────────────────────────────────────────

interface AlertPaletteProps {
  onApplyAlert: (
    type: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION'
  ) => void
}

function AlertPalette({ onApplyAlert }: AlertPaletteProps) {
  return (
    <div className="absolute right-0 top-full mt-1 bg-popover shadow-xl rounded-lg border border-border py-1 z-50 w-max">
      {ALERT_OPTIONS.map(({ type, label, color, previewText }) => (
        <button
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors text-left"
          key={type}
          onClick={() => onApplyAlert(type)}
          type="button"
        >
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
          <span className="font-mono text-xs text-muted-foreground shrink-0">
            {previewText}
          </span>
          <span className="text-xs whitespace-nowrap">{label}</span>
        </button>
      ))}
    </div>
  )
}
