/**
 * root-folder-tabs 機能の統合検証（タスク7）。
 * タブの追加・切替・削除、状態復元、異常系（アクセス不能なルート）を
 * MainScreen を通してエンドツーエンドに近い形で確認する。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../helpers/test-app-provider'
import { MainScreen } from '@/renderer/screens/main'

interface Note {
  id: string
  title: string
  filePath: string
  relativePath: string
  tags: string[]
}

const { NOTE_ROOT_A, NOTE_ROOT_B } = vi.hoisted(() => ({
  NOTE_ROOT_A: {
    id: 'a1',
    title: 'Note A1',
    filePath: '/root-a/a1.md',
    relativePath: 'a1.md',
    tags: [],
  },
  NOTE_ROOT_B: {
    id: 'b1',
    title: 'Note B1',
    filePath: '/root-b/b1.md',
    relativePath: 'b1.md',
    tags: [],
  },
}))

const mockSelectRootFolder = vi.fn()
const mockCheckRootExists = vi.fn()
const mockScanNotes = vi.fn()

vi.mock('@/renderer/lib/tauriApi', () => ({
  tauriApi: {
    markdown: {
      selectRootFolder: (...args: unknown[]) => mockSelectRootFolder(...args),
      checkRootExists: (...args: unknown[]) => mockCheckRootExists(...args),
      scanNotesAndBuildFolderTree: (...args: unknown[]) =>
        mockScanNotes(...args),
      getNoteContent: vi.fn().mockResolvedValue({
        meta: NOTE_ROOT_A,
        content: 'body',
        rawContent: 'body',
      }),
      saveNote: vi.fn().mockResolvedValue(true),
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
    window: {
      isMaximized: vi.fn().mockResolvedValue(false),
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),
      openNoteWindow: vi.fn(),
    },
    platform: 'unknown',
  },
}))

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    onCloseRequested: vi.fn().mockResolvedValue(() => {}),
    destroy: vi.fn(),
  })),
}))

vi.mock('@/renderer/components/FolderTree', () => ({
  FolderTree: () => null,
}))

vi.mock('@/renderer/components/NoteList', () => ({
  NoteList: (props: { notes: Note[]; onSelectNote: (note: Note) => void }) => (
    <div>
      {props.notes.map(note => (
        <button
          key={note.id}
          onClick={() => props.onSelectNote(note)}
          type="button"
        >
          note:{note.title}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/renderer/components/EditorView', () => ({
  EditorView: () => <div data-testid="editor-view" />,
}))

function scanResultFor(rootDir: string) {
  const notes = rootDir === '/root-a' ? [NOTE_ROOT_A] : [NOTE_ROOT_B]
  return {
    notes,
    tree: { name: '', relativePath: '', children: [], notes },
  }
}

describe('root-folder-tabs 統合検証', () => {
  beforeEach(() => {
    localStorage.clear()
    mockSelectRootFolder.mockReset()
    mockCheckRootExists.mockReset()
    mockCheckRootExists.mockResolvedValue(true)
    mockScanNotes.mockReset()
    mockScanNotes.mockImplementation(async (rootDir: string) =>
      scanResultFor(rootDir)
    )
  })

  afterEach(() => {
    cleanup()
  })

  it('7.1: フォルダ選択でタブが追加され、クリックで切替、削除で一覧から消える', async () => {
    mockSelectRootFolder.mockResolvedValueOnce('/root-a')
    renderWithProviders(<MainScreen />)

    // 初期状態: 登録済みルートフォルダが無いのでフォルダ選択画面
    const selectButton = await screen.findByRole('button', {
      name: 'Select Folder and Start',
    })
    fireEvent.click(selectButton)

    // root-a が最初のタブとして追加され、アクティブになる
    await screen.findByText('note:Note A1')
    expect(screen.getByRole('tab', { name: /root-a/ })).toHaveAttribute(
      'aria-selected',
      'true'
    )

    // 2つ目のフォルダを追加
    mockSelectRootFolder.mockResolvedValueOnce('/root-b')
    fireEvent.click(screen.getByRole('button', { name: 'Add Root Folder' }))

    await screen.findByText('note:Note B1')
    expect(screen.getByRole('tab', { name: /root-b/ })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByRole('tab', { name: /root-a/ })).toHaveAttribute(
      'aria-selected',
      'false'
    )

    // 既に登録済みのフォルダを再度追加しても重複せず既存タブがアクティブになる
    mockSelectRootFolder.mockResolvedValueOnce('/root-a')
    fireEvent.click(screen.getByRole('button', { name: 'Add Root Folder' }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /root-a/ })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    })
    expect(screen.getAllByRole('tab')).toHaveLength(2)

    // root-b タブを閉じる
    fireEvent.click(screen.getByRole('button', { name: /Close.*root-b/i }))
    await waitFor(() => {
      expect(screen.queryByRole('tab', { name: /root-b/ })).not.toBeInTheDocument()
    })
    expect(screen.getAllByRole('tab')).toHaveLength(1)

    // 最後の1件を削除するとフォルダ選択画面に戻る
    fireEvent.click(screen.getByRole('button', { name: /Close.*root-a/i }))
    await screen.findByRole('button', { name: 'Select Folder and Start' })
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
  })

  it('7.2: タブ切替でフォルダツリー・ノート一覧が新しいルートのものに更新され、選択状態が復元される', async () => {
    mockSelectRootFolder.mockResolvedValueOnce('/root-a')
    renderWithProviders(<MainScreen />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select Folder and Start' })
    )
    await screen.findByText('note:Note A1')

    // root-a でノートを選択
    fireEvent.click(screen.getByText('note:Note A1'))
    await screen.findByTestId('editor-view')

    // root-b を追加(切替)
    mockSelectRootFolder.mockResolvedValueOnce('/root-b')
    fireEvent.click(screen.getByRole('button', { name: 'Add Root Folder' }))
    await screen.findByText('note:Note B1')
    expect(screen.queryByText('note:Note A1')).not.toBeInTheDocument()

    // root-a に戻ると a1 のノート一覧が復元される
    fireEvent.click(screen.getByRole('tab', { name: /root-a/ }))
    await screen.findByText('note:Note A1')
    expect(screen.queryByText('note:Note B1')).not.toBeInTheDocument()
  })

  it('7.3: アクセス不能なルートフォルダのタブは警告状態になり、他のタブの操作に影響しない', async () => {
    mockSelectRootFolder.mockResolvedValueOnce('/root-a')
    renderWithProviders(<MainScreen />)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Select Folder and Start' })
    )
    await screen.findByText('note:Note A1')

    // root-b はアクセス不能
    mockCheckRootExists.mockImplementation(
      async (path: string) => path !== '/root-b'
    )
    mockSelectRootFolder.mockResolvedValueOnce('/root-b')
    fireEvent.click(screen.getByRole('button', { name: 'Add Root Folder' }))

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /root-b/ })).toHaveAttribute(
        'data-status',
        'missing'
      )
    })

    // root-a タブに切り替えると引き続き正常に操作できる
    fireEvent.click(screen.getByRole('tab', { name: /root-a/ }))
    await screen.findByText('note:Note A1')
    expect(screen.getByRole('tab', { name: /root-a/ })).toHaveAttribute(
      'data-status',
      'ok'
    )
  })
})
