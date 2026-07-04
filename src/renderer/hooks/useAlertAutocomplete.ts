import { useState, useRef, useMemo, useEffect } from 'react'
import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import type { RefObject } from 'react'
import { ALERT_OPTIONS } from '@/renderer/lib/alertOptions'
import type { AlertType, AlertOption } from '@/renderer/lib/alertOptions'

export type { AlertType, AlertOption }

export interface AlertCompletionState {
  show: boolean
  coords: { top: number; left: number }
  partialInput: string
  selectedIndex: number
  triggerFrom: number
}

interface UseAlertAutocompleteReturn {
  completionState: AlertCompletionState
  filteredOptions: readonly AlertOption[]
  alertExtension: Extension
  handleSelect: (type: AlertType) => void
}

const INITIAL_STATE: AlertCompletionState = {
  show: false,
  coords: { top: 0, left: 0 },
  partialInput: '',
  selectedIndex: 0,
  triggerFrom: 0,
}

// ネストされたブロッククォートを検出する
// "> >[!" のように末尾の > にスペースがない場合も対応
// group 1 = prefix (例: "> ", ">> ", "> > ", "> >")
// group 2 = partialInput (例: "", "TI", "NO")
const TRIGGER_PATTERN = /^((?:>+\s+)+(?:>+\s*)?)\[!(\w*)$/

export function detectTrigger(lineText: string): {
  matched: boolean
  partialInput: string
  prefix: string
} {
  const m = TRIGGER_PATTERN.exec(lineText)
  if (!m) return { matched: false, partialInput: '', prefix: '' }
  return { matched: true, partialInput: m[2], prefix: m[1] }
}

export function filterOptions(partialInput: string): readonly AlertOption[] {
  const upper = partialInput.toUpperCase()
  return ALERT_OPTIONS.filter(o => o.type.startsWith(upper))
}

export function useAlertAutocomplete(
  editorViewRef: RefObject<EditorView | null>
): UseAlertAutocompleteReturn {
  const [completionState, setCompletionState] =
    useState<AlertCompletionState>(INITIAL_STATE)

  const completionStateRef = useRef<AlertCompletionState>(INITIAL_STATE)

  // stale closure 防止: 常に最新の state を ref で同期
  useEffect(() => {
    completionStateRef.current = completionState
  }, [completionState])

  const handleSelect = (type: AlertType) => {
    const view = editorViewRef.current
    if (!view) return

    const cursorPos = view.state.selection.main.head
    const line = view.state.doc.lineAt(cursorPos)
    const lineTextToCursor = line.text.slice(0, cursorPos - line.from)

    // prefix を抽出（"> >[!" のような末尾スペースなしも対応）
    const prefixMatch = /^((?:>+\s+)+(?:>+\s*)?)/.exec(lineTextToCursor)
    const rawPrefix = prefixMatch ? prefixMatch[1] : '> '
    // 末尾にスペースがない場合は正規化（"> >" → "> > "）
    const prefix = rawPrefix.endsWith(' ') ? rawPrefix : `${rawPrefix} `
    const insert = `${prefix}[!${type}]\n${prefix}`

    // bracket-matching が自動挿入した ] もまとめて置換する (Bug 2)
    const charAfterCursor = line.text[cursorPos - line.from]
    const replaceTo = charAfterCursor === ']' ? cursorPos + 1 : cursorPos

    try {
      view.dispatch({
        changes: { from: line.from, to: replaceTo, insert },
        selection: { anchor: line.from + insert.length },
      })
    } catch {
      // CM6 exception: close menu as fallback
    }

    setCompletionState(prev => {
      const next = { ...prev, show: false }
      completionStateRef.current = next
      return next
    })
  }

  // handleSelect への最新参照（キーボードハンドラから呼ぶため）
  const handleSelectRef = useRef(handleSelect)
  useEffect(() => {
    handleSelectRef.current = handleSelect
  })

  const alertExtension = useMemo((): Extension => {
    return EditorView.updateListener.of(update => {
      if (!update.docChanged && !update.selectionSet) return

      const view = update.view
      const cursorPos = view.state.selection.main.head
      const line = view.state.doc.lineAt(cursorPos)
      const lineTextToCursor = line.text.slice(0, cursorPos - line.from)

      const { matched, partialInput } = detectTrigger(lineTextToCursor)

      if (matched) {
        const filtered = filterOptions(partialInput)
        if (filtered.length === 0) {
          if (completionStateRef.current.show) {
            const next = { ...INITIAL_STATE }
            completionStateRef.current = next
            setCompletionState(next)
          }
          return
        }

        const coordsResult = view.coordsAtPos(cursorPos)
        if (!coordsResult) {
          if (completionStateRef.current.show) {
            const next = { ...INITIAL_STATE }
            completionStateRef.current = next
            setCompletionState(next)
          }
          return
        }

        const prev = completionStateRef.current
        const newState: AlertCompletionState = {
          show: true,
          coords: { top: coordsResult.bottom, left: coordsResult.left },
          partialInput,
          selectedIndex:
            prev.show && prev.partialInput === partialInput
              ? prev.selectedIndex
              : 0,
          triggerFrom: line.from,
        }

        if (
          prev.show === newState.show &&
          prev.partialInput === newState.partialInput &&
          prev.selectedIndex === newState.selectedIndex &&
          prev.coords.top === newState.coords.top &&
          prev.coords.left === newState.coords.left
        ) {
          return
        }

        completionStateRef.current = newState
        setCompletionState(newState)
      } else {
        if (completionStateRef.current.show) {
          const next = { ...INITIAL_STATE }
          completionStateRef.current = next
          setCompletionState(next)
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Bug 3: document の capture フェーズでキーを捕捉し、CM6 より先にメニュー操作を処理する
  useEffect(() => {
    if (!completionState.show) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const state = completionStateRef.current
      if (!state.show) return

      const filtered = filterOptions(state.partialInput)
      const count = filtered.length

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          event.stopPropagation()
          const next = {
            ...state,
            selectedIndex: (state.selectedIndex + 1) % count,
          }
          completionStateRef.current = next
          setCompletionState(next)
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          event.stopPropagation()
          const next = {
            ...state,
            selectedIndex: (state.selectedIndex - 1 + count) % count,
          }
          completionStateRef.current = next
          setCompletionState(next)
          break
        }
        case 'Enter':
        case 'Tab': {
          event.preventDefault()
          event.stopPropagation()
          const selected = filtered[state.selectedIndex]
          if (selected) handleSelectRef.current(selected.type)
          break
        }
        case 'Escape': {
          event.preventDefault()
          event.stopPropagation()
          const next = { ...INITIAL_STATE }
          completionStateRef.current = next
          setCompletionState(next)
          break
        }
      }
    }

    // capture: true で CM6 の内部キーハンドラより先に実行
    document.addEventListener('keydown', handleKeyDown, { capture: true })
    return () =>
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [completionState.show])

  // エディタ外クリックでメニューを閉じる（メニュー内クリックは除外）
  useEffect(() => {
    if (!completionState.show) return

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element | null
      if (target?.closest('[data-alert-menu]')) return
      const next = { ...INITIAL_STATE }
      completionStateRef.current = next
      setCompletionState(next)
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [completionState.show])

  const filteredOptions = useMemo(
    () => filterOptions(completionState.partialInput),
    [completionState.partialInput]
  )

  return { completionState, filteredOptions, alertExtension, handleSelect }
}
