import { useTranslation } from 'react-i18next'
import { LuTrash2 } from 'react-icons/lu'
import { SimpleTooltip } from './ui/tooltip'
import type { MarkdownNoteMeta } from '@/shared/types'
import type { AnimationPhase } from '@/renderer/lib/noteListAnimation'
import { ANIMATION_DURATION_MS } from '@/renderer/lib/noteListAnimation'

interface NoteItemProps {
  note: MarkdownNoteMeta
  isSelected: boolean
  onSelect: () => void
  onDoubleClick: () => void
  onDelete?: () => void
  animationPhase?: AnimationPhase
}

export function NoteItem({
  note,
  isSelected,
  onSelect,
  onDoubleClick,
  onDelete,
  animationPhase,
}: NoteItemProps) {
  const { t } = useTranslation()
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return ''
    }
  }

  const animationStyle = (() => {
    if (animationPhase === 'entering') {
      return {
        animation: `note-enter ${ANIMATION_DURATION_MS}ms ease forwards`,
      }
    }
    if (animationPhase === 'exiting') {
      return { animation: `note-exit ${ANIMATION_DURATION_MS}ms ease forwards` }
    }
    return undefined
  })()

  return (
    <div
      aria-hidden={animationPhase === 'exiting' ? 'true' : undefined}
      className="sidebar-item group relative mx-1 my-0.5 overflow-hidden"
      data-active={isSelected}
      data-animation-phase={animationPhase ?? 'idle'}
      style={animationStyle}
    >
      <button
        className="w-full cursor-pointer text-left px-2.5 py-2"
        onClick={onSelect}
        onDoubleClick={onDoubleClick}
        type="button"
      >
        <div className="flex items-center gap-2">
          <h3 className="flex-1 line-clamp-1 text-sm font-semibold text-foreground">
            {note.title}
          </h3>
          {note.updatedAt && (
            <span className="flex-shrink-0 text-xs text-muted-foreground">
              {formatDate(note.updatedAt)}
            </span>
          )}
        </div>
        {note.excerpt && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {note.excerpt}
          </p>
        )}
        {note.tags && note.tags.length > 0 && (
          <div className="mt-1 flex gap-1">
            {note.tags.slice(0, 3).map(tag => (
              <span
                className="rounded px-1.5 py-0.5 text-xs"
                key={tag}
                style={{
                  background: 'var(--theme-accent-subtle)',
                  color: 'var(--theme-accent)',
                }}
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </button>
      {onDelete && (
        <div className="absolute inset-y-0 right-0 flex w-10 items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <div className="absolute inset-0 bg-destructive/10" />
          <SimpleTooltip content={t('noteItem.delete')} placement="top">
            <button
              aria-label={t('noteItem.delete')}
              className="absolute inset-0 flex items-center justify-center text-destructive transition-colors duration-150 hover:bg-destructive hover:text-white"
              disabled={animationPhase === 'exiting'}
              onClick={onDelete}
              type="button"
            >
              <LuTrash2 size={16} />
            </button>
          </SimpleTooltip>
        </div>
      )}
    </div>
  )
}
