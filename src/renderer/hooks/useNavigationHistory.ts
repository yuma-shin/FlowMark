import { useState, useRef, useCallback, useEffect } from 'react'
import { tauriApi as App } from '@/renderer/lib/tauriApi'
import {
  createInitialState,
  pushEntry,
  removeEntry,
  canGoBack as coreCanGoBack,
  canGoForward as coreCanGoForward,
  MAX_HISTORY_SIZE,
  type HistoryState,
} from '@/renderer/lib/navigationHistoryCore'

export interface UseNavigationHistoryParams {
  activeRootFolder: string | undefined
  /** ノートの存在確認関数（テスト時にモック可能） */
  checkNoteExists?: (filePath: string) => Promise<boolean>
}

export interface UseNavigationHistoryResult {
  /** 現在のカーソルが指すfilePath（なければnull） */
  currentFilePath: string | null
  /** 戻る操作が可能か */
  canGoBack: boolean
  /** 進む操作が可能か */
  canGoForward: boolean
  /** 新しいノートを履歴に追加 */
  push: (filePath: string) => void
  /** 1つ前に戻る（削除済みエントリはスキップ） */
  goBack: () => Promise<string | null>
  /** 1つ先に進む（削除済みエントリはスキップ） */
  goForward: () => Promise<string | null>
  /** 指定ルートフォルダの履歴を削除 */
  removeRootHistory: (rootPath: string) => void
}

const STORAGE_KEY = 'navigationHistory'

interface PersistedNavigationHistory {
  version: 1
  histories: Record<string, { entries: string[]; cursor: number }>
}

/**
 * localStorageから永続化された履歴を読み込み、バリデーションして返す。
 * バリデーション失敗時は空オブジェクトを返し、console.errorに記録する。
 */
function loadPersistedHistories(): Record<string, HistoryState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return {}

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      console.error('[navigationHistory] Invalid data: root is not an object')
      return {}
    }

    const data = parsed as Record<string, unknown>

    // Rule 1: version must be exactly 1
    if (data.version !== 1) {
      console.error('[navigationHistory] Invalid data: version is not 1')
      return {}
    }

    // Rule 2: histories must be a non-null object
    if (typeof data.histories !== 'object' || data.histories === null) {
      console.error(
        '[navigationHistory] Invalid data: histories is not an object'
      )
      return {}
    }

    const histories = data.histories as Record<string, unknown>
    const result: Record<string, HistoryState> = {}

    for (const [rootPath, value] of Object.entries(histories)) {
      if (typeof value !== 'object' || value === null) {
        console.error(
          `[navigationHistory] Invalid data for root "${rootPath}": not an object`
        )
        result[rootPath] = createInitialState()
        continue
      }

      const entry = value as Record<string, unknown>

      // Rule 3: entries must be an array of strings
      if (
        !Array.isArray(entry.entries) ||
        !entry.entries.every((e: unknown) => typeof e === 'string')
      ) {
        console.error(
          `[navigationHistory] Invalid data for root "${rootPath}": entries is not a string array`
        )
        result[rootPath] = createInitialState()
        continue
      }

      // Rule 5: entries.length must be <= MAX_HISTORY_SIZE
      if (entry.entries.length > MAX_HISTORY_SIZE) {
        console.error(
          `[navigationHistory] Invalid data for root "${rootPath}": entries exceeds MAX_HISTORY_SIZE`
        )
        result[rootPath] = createInitialState()
        continue
      }

      // Rule 4: cursor must be integer >= -1 and <= entries.length - 1
      if (
        typeof entry.cursor !== 'number' ||
        !Number.isInteger(entry.cursor) ||
        entry.cursor < -1 ||
        entry.cursor > entry.entries.length - 1
      ) {
        console.error(
          `[navigationHistory] Invalid data for root "${rootPath}": cursor out of range`
        )
        result[rootPath] = createInitialState()
        continue
      }

      result[rootPath] = {
        entries: entry.entries as string[],
        cursor: entry.cursor,
      }
    }

    return result
  } catch (e) {
    console.error('[navigationHistory] Failed to load persisted data:', e)
    return {}
  }
}

/**
 * 現在の履歴状態をlocalStorageに保存する。
 * QuotaExceededError時はconsole.errorに記録し、メモリ上の状態は維持する。
 */
function persist(histories: Record<string, HistoryState>): void {
  const data: PersistedNavigationHistory = {
    version: 1,
    histories: {},
  }

  for (const [rootPath, state] of Object.entries(histories)) {
    data.histories[rootPath] = {
      entries: state.entries,
      cursor: state.cursor,
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('[navigationHistory] Failed to persist data:', e)
  }
}

const defaultCheckNoteExists = async (filePath: string): Promise<boolean> => {
  try {
    const content = await App.markdown.getNoteContent(filePath)
    return content !== null
  } catch {
    return false
  }
}

export function useNavigationHistory({
  activeRootFolder,
  checkNoteExists = defaultCheckNoteExists,
}: UseNavigationHistoryParams): UseNavigationHistoryResult {
  // ルートフォルダごとの全履歴を保持するRef（起動時にlocalStorageから復元）
  const historiesRef = useRef<Record<string, HistoryState>>(
    loadPersistedHistories()
  )

  // 現在のアクティブルートフォルダの履歴状態（UIの再レンダリング用）
  const [currentState, setCurrentState] = useState<HistoryState>(() => {
    if (!activeRootFolder) return createInitialState()
    const existing = historiesRef.current[activeRootFolder]
    if (existing) return existing
    const initial = createInitialState()
    historiesRef.current[activeRootFolder] = initial
    return initial
  })

  // activeRootFolder が変わったとき、対応する履歴状態を復元する
  useEffect(() => {
    if (!activeRootFolder) {
      setCurrentState(createInitialState())
      return
    }

    const existing = historiesRef.current[activeRootFolder]
    if (existing) {
      setCurrentState(existing)
    } else {
      const initial = createInitialState()
      historiesRef.current[activeRootFolder] = initial
      setCurrentState(initial)
    }
  }, [activeRootFolder])

  // push: 新しいノートを履歴に追加
  const push = useCallback(
    (filePath: string) => {
      if (!activeRootFolder) return

      const current =
        historiesRef.current[activeRootFolder] ?? createInitialState()
      const newState = pushEntry(current, filePath)
      historiesRef.current[activeRootFolder] = newState
      setCurrentState(newState)
      persist(historiesRef.current)
    },
    [activeRootFolder]
  )

  // goBack: 存在確認を行いながらカーソルを前方に移動
  const goBack = useCallback(async (): Promise<string | null> => {
    if (!activeRootFolder) return null

    let state = historiesRef.current[activeRootFolder] ?? createInitialState()

    // カーソルより前方向（先頭方向）に有効なエントリを探す
    // 検索対象は cursor - 1 から 0 まで
    while (state.cursor > 0) {
      // カーソルの1つ前のインデックスをチェック
      const targetIndex = state.cursor - 1
      const targetFilePath = state.entries[targetIndex]

      const exists = await checkNoteExists(targetFilePath)
      if (exists) {
        // 有効なエントリが見つかった → カーソルをそこに移動
        state = { ...state, cursor: targetIndex }
        historiesRef.current[activeRootFolder] = state
        setCurrentState(state)
        persist(historiesRef.current)
        return targetFilePath
      }

      // エントリが存在しない → 除去して続行
      // targetIndex はカーソルより前なので、removeEntry後にカーソルが1減る
      state = removeEntry(state, targetIndex)
      // removeEntry(state, targetIndex) で targetIndex < cursor の場合、
      // cursor は 1 減少する。結果として新しい cursor - 1 が次の検索対象になる
    }

    // 有効なエントリが見つからなかった
    historiesRef.current[activeRootFolder] = state
    setCurrentState(state)
    persist(historiesRef.current)
    return null
  }, [activeRootFolder, checkNoteExists])

  // goForward: 存在確認を行いながらカーソルを後方に移動
  const goForward = useCallback(async (): Promise<string | null> => {
    if (!activeRootFolder) return null

    let state = historiesRef.current[activeRootFolder] ?? createInitialState()

    // カーソルより後方向（末尾方向）に有効なエントリを探す
    // 検索対象は cursor + 1 から entries.length - 1 まで
    while (state.cursor < state.entries.length - 1) {
      // カーソルの1つ後のインデックスをチェック
      const targetIndex = state.cursor + 1
      const targetFilePath = state.entries[targetIndex]

      const exists = await checkNoteExists(targetFilePath)
      if (exists) {
        // 有効なエントリが見つかった → カーソルをそこに移動
        state = { ...state, cursor: targetIndex }
        historiesRef.current[activeRootFolder] = state
        setCurrentState(state)
        persist(historiesRef.current)
        return targetFilePath
      }

      // エントリが存在しない → 除去して続行
      // targetIndex はカーソルより後なので、removeEntry後にカーソルは変わらない
      state = removeEntry(state, targetIndex)
      // removeEntry(state, targetIndex) で targetIndex > cursor の場合、
      // cursor は変わらない。entries.length が1減り、
      // 次の cursor + 1 が（元のtargetIndex+1にあった）エントリを指す
    }

    // 有効なエントリが見つからなかった
    historiesRef.current[activeRootFolder] = state
    setCurrentState(state)
    persist(historiesRef.current)
    return null
  }, [activeRootFolder, checkNoteExists])

  // removeRootHistory: 指定ルートフォルダの履歴を削除
  const removeRootHistory = useCallback(
    (rootPath: string) => {
      delete historiesRef.current[rootPath]
      // 現在アクティブなルートが削除対象の場合、状態をリセット
      if (activeRootFolder === rootPath) {
        setCurrentState(createInitialState())
      }
      persist(historiesRef.current)
    },
    [activeRootFolder]
  )

  // キーボードショートカット: macOS Cmd+[/], Windows Alt+←/→
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac =
        App.platform === 'darwin' ||
        App.platform.toLowerCase().startsWith('mac')

      if (isMac) {
        if (e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
          if (e.key === '[') {
            e.preventDefault()
            goBack()
          } else if (e.key === ']') {
            e.preventDefault()
            goForward()
          }
        }
      } else {
        if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            goBack()
          } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            goForward()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goBack, goForward])

  // 導出値
  const currentFilePath =
    currentState.cursor >= 0 &&
    currentState.cursor < currentState.entries.length
      ? currentState.entries[currentState.cursor]
      : null

  const canGoBackValue = coreCanGoBack(currentState)
  const canGoForwardValue = coreCanGoForward(currentState)

  return {
    currentFilePath,
    canGoBack: canGoBackValue,
    canGoForward: canGoForwardValue,
    push,
    goBack,
    goForward,
    removeRootHistory,
  }
}
