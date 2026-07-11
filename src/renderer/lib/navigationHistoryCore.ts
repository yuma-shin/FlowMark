export const MAX_HISTORY_SIZE = 100

export interface HistoryState {
  entries: string[] // filePath の配列
  cursor: number // -1 = エントリなし
}

/** 初期状態を生成 */
export function createInitialState(): HistoryState {
  return { entries: [], cursor: -1 }
}

/** 新しいエントリをpush。カーソル以降を切り捨て、最大サイズを維持 */
export function pushEntry(state: HistoryState, filePath: string): HistoryState {
  // 重複抑制: 現在のカーソルが指すエントリと同一filePathの場合は状態を変化させない
  if (state.cursor >= 0 && state.entries[state.cursor] === filePath) {
    return state
  }

  // カーソル以降を切り捨て
  const truncated = state.entries.slice(0, state.cursor + 1)

  // 新エントリを追加
  truncated.push(filePath)

  // MAX_HISTORY_SIZE 超過時は最古を除去
  if (truncated.length > MAX_HISTORY_SIZE) {
    truncated.shift()
    return { entries: truncated, cursor: truncated.length - 1 }
  }

  return { entries: truncated, cursor: truncated.length - 1 }
}

/** カーソルを1つ前に移動 */
export function goBack(state: HistoryState): HistoryState {
  if (!canGoBack(state)) {
    return state
  }
  return { entries: state.entries, cursor: state.cursor - 1 }
}

/** カーソルを1つ後に移動 */
export function goForward(state: HistoryState): HistoryState {
  if (!canGoForward(state)) {
    return state
  }
  return { entries: state.entries, cursor: state.cursor + 1 }
}

/** 指定インデックスのエントリを除去し、カーソルを調整 */
export function removeEntry(state: HistoryState, index: number): HistoryState {
  if (index < 0 || index >= state.entries.length) {
    return state
  }

  const newEntries = [...state.entries.slice(0, index), ...state.entries.slice(index + 1)]

  let newCursor = state.cursor
  if (newEntries.length === 0) {
    newCursor = -1
  } else if (index < state.cursor) {
    // 削除されたエントリがカーソルより前 → カーソルを1つ前にずらす
    newCursor = state.cursor - 1
  } else if (index === state.cursor) {
    // カーソル位置のエントリが削除された場合
    // カーソルがエントリ数を超えないように調整
    if (newCursor >= newEntries.length) {
      newCursor = newEntries.length - 1
    }
  }
  // index > state.cursor の場合はカーソル位置に変更なし

  return { entries: newEntries, cursor: newCursor }
}

/** canGoBack を算出 */
export function canGoBack(state: HistoryState): boolean {
  return state.cursor > 0
}

/** canGoForward を算出 */
export function canGoForward(state: HistoryState): boolean {
  return state.cursor < state.entries.length - 1
}
