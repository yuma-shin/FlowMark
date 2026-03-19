/**
 * tauriApi アダプターのユニットテスト
 *
 * @tauri-apps/api/core の invoke をモックして、tauriApi が正しい
 * コマンド名・引数で invoke を呼び出すことを検証する。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Tauri API モック
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}))
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn().mockResolvedValue(false),
    startDragging: vi.fn(),
  })),
}))
vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { tauriApi } from '../tauriApi'

const mockInvoke = vi.mocked(invoke)
const mockListen = vi.mocked(listen)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('tauriApi.markdown', () => {
  it('selectRootFolder が select_root_folder を invoke する', async () => {
    mockInvoke.mockResolvedValue('/path/to/folder')
    const result = await tauriApi.markdown.selectRootFolder()
    expect(mockInvoke).toHaveBeenCalledWith('select_root_folder')
    expect(result).toBe('/path/to/folder')
  })

  it('checkRootExists が check_root_exists を invoke する', async () => {
    mockInvoke.mockResolvedValue(true)
    const result = await tauriApi.markdown.checkRootExists('/path')
    expect(mockInvoke).toHaveBeenCalledWith('check_root_exists', {
      rootDir: '/path',
    })
    expect(result).toBe(true)
  })

  it('scanNotesAndBuildFolderTree が scan_notes_and_build_folder_tree を invoke する', async () => {
    const mockResult = {
      notes: [],
      tree: { name: 'root', relativePath: '', children: [], notes: [] },
    }
    mockInvoke.mockResolvedValue(mockResult)
    const result = await tauriApi.markdown.scanNotesAndBuildFolderTree('/root')
    expect(mockInvoke).toHaveBeenCalledWith(
      'scan_notes_and_build_folder_tree',
      { rootDir: '/root' }
    )
    expect(result).toEqual(mockResult)
  })

  it('saveNote が save_note を invoke する', async () => {
    mockInvoke.mockResolvedValue(true)
    const result = await tauriApi.markdown.saveNote(
      '/path/note.md',
      'content',
      { title: 'Test' }
    )
    expect(mockInvoke).toHaveBeenCalledWith('save_note', {
      filePath: '/path/note.md',
      content: 'content',
      frontMatter: { title: 'Test' },
    })
    expect(result).toBe(true)
  })

  it('deleteNote が delete_note を invoke する', async () => {
    mockInvoke.mockResolvedValue(true)
    await tauriApi.markdown.deleteNote('/path/note.md')
    expect(mockInvoke).toHaveBeenCalledWith('delete_note', {
      filePath: '/path/note.md',
    })
  })
})

describe('tauriApi.markdown.onFileChanged', () => {
  it('listen("file-changed") を呼び出してアンサブスクライブ関数を返す', async () => {
    const unlistenFn = vi.fn()
    mockListen.mockResolvedValue(unlistenFn)

    const unsub = tauriApi.markdown.onFileChanged(() => {})
    // onFileChanged は同期的にアンサブスクライブ関数を返し、
    // 内部で非同期に listen を呼び出す
    expect(typeof unsub).toBe('function')
  })
})

describe('tauriApi.image', () => {
  it('saveFromFile が save_image_from_file を invoke する', async () => {
    const mockResult = { success: true, relativePath: 'images/foo.png' }
    mockInvoke.mockResolvedValue(mockResult)
    const result = await tauriApi.image.saveFromFile(
      '/root',
      'note',
      '/src/img.png'
    )
    expect(mockInvoke).toHaveBeenCalledWith('save_image_from_file', {
      rootDir: '/root',
      noteBaseName: 'note',
      sourceFilePath: '/src/img.png',
    })
    expect(result).toEqual(mockResult)
  })

  it('cleanupAll が cleanup_all_unused_images を invoke する', async () => {
    const mockResult = {
      success: true,
      deletedFiles: ['orphan_img.png'],
      errors: [],
    }
    mockInvoke.mockResolvedValue(mockResult)
    const result = await tauriApi.image.cleanupAll('/root')
    expect(mockInvoke).toHaveBeenCalledWith('cleanup_all_unused_images', {
      rootDir: '/root',
    })
    expect(result).toEqual(mockResult)
  })
})

describe('tauriApi.platform', () => {
  it('文字列を返す', () => {
    expect(typeof tauriApi.platform).toBe('string')
  })
})
