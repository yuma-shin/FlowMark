import { useTranslation } from 'react-i18next'
import type { EditorContentStats } from '@/renderer/hooks/useEditorStatus'
import type {
  EditorCursorPosition,
  SelectionStats,
} from '@/renderer/lib/codemirror/editorStatus'

export interface StatusBarProps {
  /** ノート未選択時、またはpreviewモードでCodeMirrorが存在しない場合はnull */
  cursor: EditorCursorPosition | null
  /** ノート未選択時はnull */
  stats: EditorContentStats | null
  /** 選択範囲が空、またはノート未選択時はnull */
  selectionStats: SelectionStats | null
  /** 取得失敗時はnull */
  version: string | null
}

const PLACEHOLDER = '—'

export function StatusBar({
  cursor,
  stats,
  selectionStats,
  version,
}: StatusBarProps) {
  const { t } = useTranslation()

  const charCount = selectionStats ? selectionStats.charCount : stats?.charCount
  const wordCount = selectionStats ? selectionStats.wordCount : stats?.wordCount
  const lineCount = stats?.lineCount

  return (
    <div className="h-6 flex items-center gap-4 px-3 shrink-0 border-t border-border bg-background text-xs text-muted-foreground">
      <span data-testid="status-version">{version ?? PLACEHOLDER}</span>
      <span className="ml-auto" data-testid="status-cursor">
        {cursor
          ? t('editor.statusBar.cursorPosition', {
              line: cursor.line,
              column: cursor.column,
            })
          : PLACEHOLDER}
      </span>
      <span data-testid="status-words">
        {wordCount !== undefined
          ? t('editor.statusBar.words', { count: wordCount })
          : PLACEHOLDER}
      </span>
      <span data-testid="status-chars">
        {charCount !== undefined
          ? t('editor.statusBar.chars', { count: charCount })
          : PLACEHOLDER}
      </span>
      <span data-testid="status-lines">
        {lineCount !== undefined
          ? t('editor.statusBar.lines', { count: lineCount })
          : PLACEHOLDER}
      </span>
    </div>
  )
}
