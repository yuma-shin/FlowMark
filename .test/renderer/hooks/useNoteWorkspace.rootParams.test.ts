/**
 * useNoteWorkspace が settings.rootDir を直接参照せず、rootDir/rootMeta/onMetaChange を
 * 外部から受け取る形にパラメータ化された後の挙動を検証する。
 * root-folder-tabs タスク 3.1, 3.2, 3.3 の回帰確認テスト。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { renderHookWithProviders } from '../../helpers/test-app-provider'
import { useNoteWorkspace } from '@/renderer/hooks/useNoteWorkspace'
import type { MarkdownNoteMeta } from '@/shared/types'

const mockCheckRootExists = vi.fn().mockResolvedValue(true)
const mockScanNotes = vi.fn()
const mockGetNoteContent = vi.fn()
const mockSaveNote = vi.fn().mockResolvedValue(true)

const NOTE_A: MarkdownNoteMeta = {
  id: 'a',
  title: 'A',
  filePath: '/root-a/a.md',
  relativePath: 'a.md',
}
const NOTE_B: MarkdownNoteMeta = {
  id: 'b',
  title: 'B',
  filePath: '/root-a/sub/b.md',
  relativePath: 'sub/b.md',
}

vi.mock('@/renderer/lib/tauriApi', () => ({
  tauriApi: {
    markdown: {
      checkRootExists: (...args: unknown[]) => mockCheckRootExists(...args),
      scanNotesAndBuildFolderTree: (...args: unknown[]) =>
        mockScanNotes(...args),
      getNoteContent: (...args: unknown[]) => mockGetNoteContent(...args),
      saveNote: (...args: unknown[]) => mockSaveNote(...args),
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

describe('useNoteWorkspace のパラメータ化', () => {
  beforeEach(() => {
    mockCheckRootExists.mockClear()
    mockScanNotes.mockReset()
    mockScanNotes.mockResolvedValue({
      notes: [NOTE_A, NOTE_B],
      tree: { name: '', relativePath: '', children: [], notes: [NOTE_A, NOTE_B] },
    })
    mockGetNoteContent.mockReset()
    mockGetNoteContent.mockResolvedValue({
      meta: NOTE_A,
      content: 'body',
      rawContent: 'body',
    })
    mockSaveNote.mockClear()
  })

  it('rootDirがundefinedの場合はフォルダ未選択状態になる', async () => {
    const { result } = renderHookWithProviders(() =>
      useNoteWorkspace({
        rootDir: undefined,
        rootMeta: {},
        onMetaChange: vi.fn(),
      })
    )

    expect(result.current.showRootDialog).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('rootMeta.lastSelectedFolderに基づいて選択中フォルダを復元する', async () => {
    const { result } = renderHookWithProviders(() =>
      useNoteWorkspace({
        rootDir: '/root-a',
        rootMeta: { lastSelectedFolder: 'sub' },
        onMetaChange: vi.fn(),
      })
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(result.current.selectedFolder).toBe('sub')
  })

  it('onSelectFolderはupdateSettingsではなくonMetaChangeを呼ぶ', async () => {
    const onMetaChange = vi.fn()
    const { result } = renderHookWithProviders(() =>
      useNoteWorkspace({
        rootDir: '/root-a',
        rootMeta: {},
        onMetaChange,
      })
    )

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      result.current.onSelectFolder('sub')
    })

    expect(onMetaChange).toHaveBeenCalledWith({ lastSelectedFolder: 'sub' })
  })

  it('onSelectNoteはonMetaChangeでlastOpenedNotePathを通知する', async () => {
    const onMetaChange = vi.fn()
    const { result } = renderHookWithProviders(() =>
      useNoteWorkspace({
        rootDir: '/root-a',
        rootMeta: {},
        onMetaChange,
      })
    )

    await act(async () => {
      await result.current.onSelectNote(NOTE_A)
    })

    expect(onMetaChange).toHaveBeenCalledWith({
      lastOpenedNotePath: NOTE_A.filePath,
    })
  })

  it('flushPendingSaveは保留中の変更がない場合、何もせず即座に完了する', async () => {
    const { result } = renderHookWithProviders(() =>
      useNoteWorkspace({
        rootDir: '/root-a',
        rootMeta: {},
        onMetaChange: vi.fn(),
      })
    )

    await act(async () => {
      await result.current.flushPendingSave()
    })

    expect(mockSaveNote).not.toHaveBeenCalled()
  })

  it('flushPendingSaveは保留中のデバウンス保存を即座に確定させる', async () => {
    vi.useFakeTimers()
    try {
      const { result } = renderHookWithProviders(() =>
        useNoteWorkspace({
          rootDir: '/root-a',
          rootMeta: {},
          onMetaChange: vi.fn(),
        })
      )

      await act(async () => {
        await result.current.onSelectNote(NOTE_A)
      })

      act(() => {
        result.current.onContentChange('changed body')
      })

      expect(mockSaveNote).not.toHaveBeenCalled()

      await act(async () => {
        await result.current.flushPendingSave()
      })

      expect(mockSaveNote).toHaveBeenCalledTimes(1)
      expect(mockSaveNote).toHaveBeenCalledWith(NOTE_A.filePath, 'changed body')

      // 1000ms経過してもデバウンスタイマーは既に確定済みなので再度保存されない
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockSaveNote).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('rootDirが切り替わった際、スキャン完了を待つ間isLoadingがtrueになり旧ルートの表示状態がリセットされる（タブ切替時の読み込み中表示）', async () => {
    let currentRootDir = '/root-a'
    const { result, rerender } = renderHookWithProviders(() =>
      useNoteWorkspace({
        rootDir: currentRootDir,
        rootMeta: {},
        onMetaChange: vi.fn(),
      })
    )

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.isLoading).toBe(false)
    await act(async () => {
      await result.current.onSelectNote(NOTE_A)
    })
    expect(result.current.selectedNote?.id).toBe('a')

    // scanNotesAndBuildFolderTree を保留させ、切替直後の中間状態を観測できるようにする
    let resolveScan: (value: {
      notes: MarkdownNoteMeta[]
      tree: { name: string; relativePath: string; children: never[]; notes: MarkdownNoteMeta[] }
    }) => void = () => {}
    mockScanNotes.mockReset()
    mockScanNotes.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveScan = resolve
        })
    )

    currentRootDir = '/root-b'
    act(() => {
      rerender()
    })

    // 新しいルートのスキャンが完了するまでisLoadingはtrueのまま
    expect(result.current.isLoading).toBe(true)
    // 旧ルートで選択していたノート等の表示状態は即座にリセットされる
    expect(result.current.selectedNote).toBeNull()
    expect(result.current.folderTree).toBeNull()

    // checkRootExists の解決を待ってから scanNotesAndBuildFolderTree が
    // 実際に呼ばれる（＝resolveScanが実体を持つ）のを待つ
    await waitFor(() => {
      expect(mockScanNotes).toHaveBeenCalledWith('/root-b')
    })

    act(() => {
      resolveScan({
        notes: [NOTE_B],
        tree: { name: '', relativePath: '', children: [], notes: [NOTE_B] },
      })
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })
})
