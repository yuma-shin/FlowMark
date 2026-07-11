import { useCallback } from 'react'
import type { EditorView as CodemirrorEditorView } from '@codemirror/view'
import { historyField } from '@codemirror/commands'
import { EditorStateCache } from '@/renderer/lib/editorStateCache'

export interface EditorStateCacheHookResult {
  /**
   * 現在のEditorStateをキャッシュに保存する。
   * ノート切替直前に呼び出す。
   */
  saveCurrentState: (filePath: string, view: CodemirrorEditorView) => void

  /**
   * キャッシュからEditorStateを復元する。
   * コンテンツ不一致時はキャッシュを破棄してundefinedを返す。
   * @returns initialState prop用のオブジェクト or undefined
   */
  restoreState: (
    filePath: string,
    currentContent: string
  ) =>
    | {
        json: unknown
        fields: { history: typeof historyField }
      }
    | undefined

  /**
   * 指定ファイルパスのキャッシュを無効化する。
   */
  invalidate: (filePath: string) => void

  /**
   * 全キャッシュをクリアする。
   */
  clearAll: () => void
}

// Module-level singleton — shared across all consumers
const sharedCache = new EditorStateCache()

/**
 * 指定ファイルパスのキャッシュエントリを無効化する。
 * React外（useNoteWorkspace等）から直接呼び出し可能。
 */
export function invalidateEditorStateCache(filePath: string): void {
  sharedCache.delete(filePath)
}

/**
 * 全キャッシュエントリをクリアする。
 * React外（useNoteWorkspace等）から直接呼び出し可能。
 */
export function clearEditorStateCache(): void {
  sharedCache.clear()
}

export function useEditorStateCache(): EditorStateCacheHookResult {
  const saveCurrentState = useCallback(
    (filePath: string, view: CodemirrorEditorView) => {
      try {
        const stateFields = { history: historyField }
        const json = view.state.toJSON(stateFields)
        const documentContent = view.state.doc.toString()
        sharedCache.set(filePath, { json, documentContent })
      } catch (e) {
        console.warn(
          '[useEditorStateCache] Failed to serialize editor state:',
          e
        )
      }
    },
    []
  )

  const restoreState = useCallback(
    (filePath: string, currentContent: string) => {
      try {
        const entry = sharedCache.get(filePath)
        if (!entry) {
          return undefined
        }

        if (entry.documentContent !== currentContent) {
          sharedCache.delete(filePath)
          return undefined
        }

        const stateFields = { history: historyField }
        return { json: entry.json, fields: stateFields }
      } catch (e) {
        console.warn('[useEditorStateCache] Failed to restore editor state:', e)
        sharedCache.delete(filePath)
        return undefined
      }
    },
    []
  )

  const invalidate = useCallback((filePath: string) => {
    sharedCache.delete(filePath)
  }, [])

  const clearAll = useCallback(() => {
    sharedCache.clear()
  }, [])

  return {
    saveCurrentState,
    restoreState,
    invalidate,
    clearAll,
  }
}
