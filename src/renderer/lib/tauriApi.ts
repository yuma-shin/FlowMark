/**
 * Tauri API アダプター
 *
 * window.App と同一インターフェースを invoke() ベースで提供する。
 * 既存の Renderer コードはこのモジュールを import するだけで動作する。
 */
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { openUrl } from '@tauri-apps/plugin-opener'

import type {
  MarkdownNoteMeta,
  FolderNode,
  NoteContent,
  ImageSaveResult,
  CleanupResult,
} from '@/shared/types'

// ---------------------------------------------------------------------------
// Markdown API
// ---------------------------------------------------------------------------

const markdown = {
  selectRootFolder: (): Promise<string | null> =>
    invoke<string | null>('select_root_folder'),

  checkRootExists: (rootDir: string): Promise<boolean> =>
    invoke<boolean>('check_root_exists', { rootDir }),

  scanNotes: (rootDir: string): Promise<MarkdownNoteMeta[]> =>
    invoke<{ notes: MarkdownNoteMeta[]; tree: FolderNode }>(
      'scan_notes_and_build_folder_tree',
      { rootDir }
    ).then(r => r.notes),

  buildFolderTree: (
    rootDir: string,
    _notes: MarkdownNoteMeta[]
  ): Promise<FolderNode> =>
    invoke<{ notes: MarkdownNoteMeta[]; tree: FolderNode }>(
      'scan_notes_and_build_folder_tree',
      { rootDir }
    ).then(r => r.tree),

  scanNotesAndBuildFolderTree: (
    rootDir: string
  ): Promise<{ notes: MarkdownNoteMeta[]; tree: FolderNode }> =>
    invoke<{ notes: MarkdownNoteMeta[]; tree: FolderNode }>(
      'scan_notes_and_build_folder_tree',
      { rootDir }
    ),

  getNoteContent: (filePath: string): Promise<NoteContent | null> =>
    invoke<NoteContent | null>('get_note_content', { filePath }),

  saveNote: (
    filePath: string,
    content: string,
    frontMatter?: Record<string, unknown>
  ): Promise<boolean> =>
    invoke<boolean>('save_note', { filePath, content, frontMatter }),

  createNote: (
    rootDir: string,
    folderPath: string,
    title: string
  ): Promise<string | null> =>
    invoke<string | null>('create_note', { rootDir, folderPath, title }),

  createFolder: (rootDir: string, folderPath: string): Promise<boolean> =>
    invoke<boolean>('create_folder', { rootDir, folderPath }),

  renameNote: (oldPath: string, newTitle: string): Promise<string | null> =>
    invoke<string | null>('rename_note', { oldPath, newTitle }),

  deleteNote: (filePath: string): Promise<boolean> =>
    invoke<boolean>('delete_note', { filePath }),

  moveNote: (
    rootDir: string,
    currentFilePath: string,
    targetFolder: string
  ): Promise<string | null> =>
    invoke<string | null>('move_note', {
      rootDir,
      currentFilePath,
      targetFolder,
    }),

  deleteFolder: (rootDir: string, folderPath: string): Promise<boolean> =>
    invoke<boolean>('delete_folder', { rootDir, folderPath }),

  watchFile: (filePath: string): Promise<boolean> =>
    invoke<boolean>('watch_file', { filePath }),

  unwatchFile: (filePath: string): Promise<boolean> =>
    invoke<boolean>('unwatch_file', { filePath }),

  /**
   * ファイル変更イベントを購読する。
   * Electron の ipcRenderer.on('markdown:fileChanged') に相当する。
   * 非同期で listen を登録し、同期的にアンサブスクライブ関数を返す。
   */
  onFileChanged: (callback: (filePath: string) => void): (() => void) => {
    let unlisten: (() => void) | null = null

    listen<string>('file-changed', event => {
      callback(event.payload)
    }).then(fn => {
      unlisten = fn
    })

    return () => {
      if (unlisten) {
        unlisten()
      }
    }
  },
}

// ---------------------------------------------------------------------------
// 画像 API
// ---------------------------------------------------------------------------

const image = {
  saveFromFile: (
    rootDir: string,
    noteBaseName: string,
    sourceFilePath: string
  ): Promise<ImageSaveResult> =>
    invoke<ImageSaveResult>('save_image_from_file', {
      rootDir,
      noteBaseName,
      sourceFilePath,
    }),

  saveFromBuffer: (
    rootDir: string,
    noteBaseName: string,
    buffer: ArrayBuffer,
    extension: string
  ): Promise<ImageSaveResult> =>
    invoke<ImageSaveResult>('save_image_from_buffer', {
      rootDir,
      noteBaseName,
      buffer: Array.from(new Uint8Array(buffer)),
      extension,
    }),

  selectFile: (): Promise<string[]> => invoke<string[]>('select_image_file'),

  getAsBase64: (path: string): Promise<string> =>
    invoke<string>('read_image_as_base64', { path }),

  cleanupUnused: (
    rootDir: string,
    noteBaseName: string,
    markdownContent: string
  ): Promise<CleanupResult> =>
    invoke<CleanupResult>('cleanup_unused_images', {
      rootDir,
      noteBaseName,
      markdownContent,
    }),

  cleanupAll: (rootDir: string): Promise<CleanupResult> =>
    invoke<CleanupResult>('cleanup_all_unused_images', { rootDir }),

  deleteNoteImages: (
    rootDir: string,
    noteBaseName: string
  ): Promise<CleanupResult> =>
    invoke<CleanupResult>('delete_note_images', { rootDir, noteBaseName }),
}

// ---------------------------------------------------------------------------
// エクスポート API
// ---------------------------------------------------------------------------

export interface ExportResult {
  success: boolean
  filePath?: string
  canceled?: boolean
  error?: string
}

const exportApi = {
  html: (html: string, title: string): Promise<ExportResult> =>
    invoke<ExportResult>('export_html', { html, title }),

  /**
   * PDF エクスポート: ヘッドレス Edge で HTML を PDF に変換して保存する。
   * ファイル保存ダイアログを表示し、Edge が PDF を直接生成する（印刷ダイアログなし）。
   */
  pdf: (html: string, title: string): Promise<ExportResult> =>
    invoke<ExportResult>('export_pdf', { html, title }),

  /**
   * PDF エクスポート（フォールバック）: HTML をテンポラリファイルに書き出し、独立した印刷プレビューウィンドウを開く。
   * そのウィンドウがロード後に自動的に OS の印刷ダイアログを開く（メインアプリには影響しない）。
   */
  openPrintWindow: (html: string, title: string): Promise<void> =>
    invoke<void>('open_print_window', { html, title }),
}

// ---------------------------------------------------------------------------
// Shell API
// ---------------------------------------------------------------------------

const shell = {
  openExternal: async (url: string): Promise<boolean> => {
    try {
      await openUrl(url)
      return true
    } catch {
      return false
    }
  },
}

// ---------------------------------------------------------------------------
// ウィンドウ API
// ---------------------------------------------------------------------------

const windowApi = {
  minimize: (): Promise<void> => getCurrentWindow().minimize(),

  maximize: async (): Promise<void> => {
    const win = getCurrentWindow()
    const isMax = await win.isMaximized()
    if (isMax) {
      await win.unmaximize()
    } else {
      await win.maximize()
    }
  },

  close: (): Promise<void> => getCurrentWindow().close(),

  isMaximized: (): Promise<boolean> => getCurrentWindow().isMaximized(),

  openNoteWindow: (notePath: string): Promise<boolean> =>
    invoke<boolean>('open_note_window', { notePath }),
}

// ---------------------------------------------------------------------------
// プラットフォーム検出
// ---------------------------------------------------------------------------

const platform: string =
  // @ts-expect-error — userAgentData は実験的 API
  navigator.userAgentData?.platform ?? navigator.platform ?? 'unknown'

// ---------------------------------------------------------------------------
// エクスポート
// ---------------------------------------------------------------------------

export const tauriApi = {
  markdown,
  image,
  export: exportApi,
  shell,
  window: windowApi,
  platform,
}
