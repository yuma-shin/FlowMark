import { EditorView } from '@codemirror/view'
import type { Text } from '@codemirror/state'
import type { Extension } from '@codemirror/state'

export interface EditorCursorPosition {
  /** 1始まりの行番号 */
  line: number
  /** 1始まりの列番号 */
  column: number
}

export interface SelectionStats {
  charCount: number
  wordCount: number
}

function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export function computeCursorPosition(
  doc: Text,
  headOffset: number
): EditorCursorPosition {
  const line = doc.lineAt(headOffset)
  return {
    line: line.number,
    column: headOffset - line.from + 1,
  }
}

export function computeSelectionStats(
  doc: Text,
  from: number,
  to: number
): SelectionStats | null {
  if (from === to) return null

  const text = doc.sliceString(from, to)
  return {
    charCount: text.length,
    wordCount: countWords(text),
  }
}

export function createEditorStatusListener(
  onUpdate: (
    cursor: EditorCursorPosition,
    selection: SelectionStats | null
  ) => void
): Extension {
  return EditorView.updateListener.of(update => {
    if (!update.docChanged && !update.selectionSet) return

    const { doc, selection } = update.state
    const { from, to, head } = selection.main

    onUpdate(
      computeCursorPosition(doc, head),
      computeSelectionStats(doc, from, to)
    )
  })
}
