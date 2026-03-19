import { load } from '@tauri-apps/plugin-store'
import {
  getCurrentWindow,
  PhysicalSize,
  PhysicalPosition,
} from '@tauri-apps/api/window'

const STORE_FILE = 'window-state.json'
const DEBOUNCE_MS = 500

interface WindowState {
  width: number
  height: number
  x: number
  y: number
  maximized: boolean
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * 保存されたウィンドウ状態を復元する。
 * アプリ起動時に一度呼び出す。
 */
export async function restoreWindowState(): Promise<void> {
  try {
    const store = await load(STORE_FILE)
    const saved = await store.get<WindowState>('windowState')
    if (!saved) return

    const win = getCurrentWindow()
    if (saved.maximized) {
      await win.maximize()
    } else {
      await win.setSize(new PhysicalSize(saved.width, saved.height))
      await win.setPosition(new PhysicalPosition(saved.x, saved.y))
    }
  } catch {
    // ウィンドウ状態の復元に失敗しても続行する
  }
}

/**
 * 現在のウィンドウ状態を保存する（デバウンス付き）。
 * resize / move イベントで呼び出す。
 */
export function scheduleWindowStateSave(): void {
  if (saveTimeout !== null) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(async () => {
    saveTimeout = null
    await saveWindowState()
  }, DEBOUNCE_MS)
}

async function saveWindowState(): Promise<void> {
  try {
    const win = getCurrentWindow()
    const [isMaximized, position, size] = await Promise.all([
      win.isMaximized(),
      win.outerPosition(),
      win.outerSize(),
    ])

    const state: WindowState = {
      width: size.width,
      height: size.height,
      x: position.x,
      y: position.y,
      maximized: isMaximized,
    }

    const store = await load(STORE_FILE)
    await store.set('windowState', state)
    await store.save()
  } catch {
    // 保存失敗は無視
  }
}

/**
 * ウィンドウの resize / move イベントを購読して状態を自動保存する。
 * アプリ起動時に一度呼び出す。
 */
export async function setupWindowStateTracking(): Promise<() => void> {
  try {
    const win = getCurrentWindow()
    const unlistenResize = await win.onResized(() => scheduleWindowStateSave())
    const unlistenMove = await win.onMoved(() => scheduleWindowStateSave())
    return () => {
      unlistenResize()
      unlistenMove()
    }
  } catch {
    return () => {}
  }
}
