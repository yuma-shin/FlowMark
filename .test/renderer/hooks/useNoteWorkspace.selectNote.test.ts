/**
 * ノート作成直後にエディタへ遷移するまでの体感速度改善の回帰テスト。
 *
 * 既存のonSelectNoteは「ノート切替時のフェードアウト演出」として
 * 常に150ms待機してから選択を反映していたが、直前に選択中のノートが
 * 存在しない場合（＝フェードアウトすべき対象がない場合）は
 * この待機が不要なオーバーヘッドになっていた。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { renderHookWithProviders } from '../../helpers/test-app-provider'
import { useNoteWorkspace } from '@/renderer/hooks/useNoteWorkspace'
import type { MarkdownNoteMeta } from '@/shared/types'

const mockGetNoteContent = vi.fn()

vi.mock('@/renderer/lib/tauriApi', () => ({
  tauriApi: {
    markdown: {
      checkRootExists: vi.fn().mockResolvedValue(true),
      scanNotesAndBuildFolderTree: vi.fn().mockResolvedValue({
        notes: [],
        tree: { name: '', relativePath: '', children: [], notes: [] },
      }),
      getNoteContent: (...args: unknown[]) => mockGetNoteContent(...args),
      saveNote: vi.fn(),
      watchFile: vi.fn().mockResolvedValue(true),
      unwatchFile: vi.fn().mockResolvedValue(true),
      onFileChanged: vi.fn(() => () => {}),
      createNote: vi.fn(),
      createFolder: vi.fn(),
      deleteNote: vi.fn(),
      deleteFolder: vi.fn(),
      moveNote: vi.fn(),
    },
    image: {
      cleanupAll: vi
        .fn()
        .mockResolvedValue({ success: true, deletedFiles: [], errors: [] }),
      deleteNoteImages: vi
        .fn()
        .mockResolvedValue({ success: true, deletedFiles: [], errors: [] }),
    },
    window: {},
    platform: 'unknown',
  },
}))

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    onCloseRequested: vi.fn().mockResolvedValue(() => {}),
    destroy: vi.fn(),
  })),
}))

const NOTE_A: MarkdownNoteMeta = {
  id: 'a',
  title: 'A',
  filePath: '/a.md',
  relativePath: 'a.md',
}
const NOTE_B: MarkdownNoteMeta = {
  id: 'b',
  title: 'B',
  filePath: '/b.md',
  relativePath: 'b.md',
}

describe('useNoteWorkspace.onSelectNote のフェード待機', () => {
  beforeEach(() => {
    mockGetNoteContent.mockReset()
    mockGetNoteContent.mockResolvedValue({
      meta: NOTE_A,
      content: 'body',
      rawContent: 'body',
    })
  })

  it('前回選択中のノートが無い場合（初回選択）は150msのフェード用setTimeoutを発行しない', async () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout')
    const { result } = renderHookWithProviders(() =>
      useNoteWorkspace({
        rootDir: undefined,
        rootMeta: {},
        onMetaChange: vi.fn(),
      })
    )

    await act(async () => {
      await result.current.onSelectNote(NOTE_A)
    })

    const delays = setTimeoutSpy.mock.calls.map(call => call[1])
    expect(delays).not.toContain(150)
    expect(result.current.selectedNote?.id).toBe('a')
    setTimeoutSpy.mockRestore()
  })

  it('既に選択中のノートがある場合（切替時）は従来通り150msのフェード用setTimeoutを発行する', async () => {
    const { result } = renderHookWithProviders(() =>
      useNoteWorkspace({
        rootDir: undefined,
        rootMeta: {},
        onMetaChange: vi.fn(),
      })
    )

    await act(async () => {
      await result.current.onSelectNote(NOTE_A)
    })

    mockGetNoteContent.mockResolvedValue({
      meta: NOTE_B,
      content: 'body b',
      rawContent: 'body b',
    })

    const setTimeoutSpy = vi.spyOn(window, 'setTimeout')
    await act(async () => {
      await result.current.onSelectNote(NOTE_B)
    })

    const delays = setTimeoutSpy.mock.calls.map(call => call[1])
    expect(delays).toContain(150)
    expect(result.current.selectedNote?.id).toBe('b')
    setTimeoutSpy.mockRestore()
  })
})
