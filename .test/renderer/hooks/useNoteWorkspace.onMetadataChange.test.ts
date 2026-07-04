/**
 * onMetadataChange内のFront Matter除去処理をstripFrontMatterへ置換した後も
 * 入出力（保存されるコンテンツ）が変わらないことを固定する回帰テスト。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { renderHookWithProviders } from '../../helpers/test-app-provider'
import { useNoteWorkspace } from '@/renderer/hooks/useNoteWorkspace'
import type { MarkdownNoteMeta } from '@/shared/types'

const mockGetNoteContent = vi.fn()
const mockSaveNote = vi.fn()
const mockScanNotesAndBuildFolderTree = vi.fn()

vi.mock('@/renderer/lib/tauriApi', () => ({
  tauriApi: {
    markdown: {
      checkRootExists: vi.fn().mockResolvedValue(true),
      scanNotesAndBuildFolderTree: (...args: unknown[]) =>
        mockScanNotesAndBuildFolderTree(...args),
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

const NOTE: MarkdownNoteMeta = {
  id: 'a',
  title: 'Old Title',
  filePath: '/a.md',
  relativePath: 'a.md',
  tags: ['old'],
}

describe('useNoteWorkspace.onMetadataChange', () => {
  beforeEach(() => {
    mockGetNoteContent.mockReset()
    mockSaveNote.mockReset()
    mockScanNotesAndBuildFolderTree.mockReset()
    mockScanNotesAndBuildFolderTree.mockResolvedValue({
      notes: [NOTE],
      tree: { name: '', relativePath: '', children: [], notes: [NOTE] },
    })
  })

  it('Front Matter付きノートのメタデータ変更時、本文部分は変更せずに保存する', async () => {
    const rawContent =
      '---\ntitle: Old Title\ntags:\n  - old\n---\nBody line1\nBody line2\n'
    mockGetNoteContent.mockResolvedValue({
      meta: NOTE,
      content: rawContent,
      rawContent,
    })

    const { result } = renderHookWithProviders(() => useNoteWorkspace())

    await act(async () => {
      await result.current.onSelectNote(NOTE)
    })

    await act(async () => {
      await result.current.onMetadataChange('New Title', ['a', 'b'])
    })

    expect(mockSaveNote).toHaveBeenCalledTimes(1)
    const [savedPath, savedContent] = mockSaveNote.mock.calls[0]
    expect(savedPath).toBe('/a.md')
    expect(savedContent).toContain('Body line1\nBody line2\n')
    expect(savedContent).toContain('title: New Title')
    expect(savedContent).toContain('  - a')
    expect(savedContent).toContain('  - b')
    expect(savedContent.startsWith('---\n')).toBe(true)
  })

  it('Front Matterが無いノートのメタデータ変更時、本文全体をそのまま保持して保存する', async () => {
    const rawContent = 'Body without front matter\nsecond line\n'
    mockGetNoteContent.mockResolvedValue({
      meta: NOTE,
      content: rawContent,
      rawContent,
    })

    const { result } = renderHookWithProviders(() => useNoteWorkspace())

    await act(async () => {
      await result.current.onSelectNote(NOTE)
    })

    await act(async () => {
      await result.current.onMetadataChange('New Title', [])
    })

    expect(mockSaveNote).toHaveBeenCalledTimes(1)
    const [, savedContent] = mockSaveNote.mock.calls[0]
    expect(savedContent).toContain(
      'Body without front matter\nsecond line\n'
    )
    expect(savedContent).toContain('title: New Title')
  })
})
