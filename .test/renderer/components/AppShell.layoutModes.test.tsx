import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { AppShell } from '@/renderer/components/AppShell'
import type { UseNoteWorkspaceResult } from '@/renderer/hooks/useNoteWorkspace'
import type { AppSettings, FolderNode, MarkdownNoteMeta } from '@/shared/types'

const mockGetVersion = vi.fn()
vi.mock('@tauri-apps/api/app', () => ({
  getVersion: () => mockGetVersion(),
}))

vi.mock('@/renderer/components/CustomTitleBar', () => ({
  CustomTitleBar: () => <div />,
}))

vi.mock('@/renderer/components/FolderTree', () => ({
  FolderTree: () => <div data-testid="folder-tree" />,
}))

vi.mock('@/renderer/components/NoteList', () => ({
  NoteList: () => <div data-testid="note-list" />,
}))

const NOTE_A: MarkdownNoteMeta = {
  id: '1',
  title: 'Note1',
  filePath: '/notes/note1.md',
  relativePath: 'note1.md',
}

const FOLDER_TREE: FolderNode = {
  name: '',
  relativePath: '',
  children: [],
  notes: [],
}

function createWorkspace(
  overrides: Partial<UseNoteWorkspaceResult> = {}
): UseNoteWorkspaceResult {
  return {
    isLoading: false,
    showRootDialog: false,
    folderTree: FOLDER_TREE,
    allNotes: [],
    filteredNotes: [],
    folderFilteredNotes: [],
    selectedFolder: '',
    selectedTag: null,
    selectedNote: NOTE_A,
    noteContent: 'Hello world',
    isSaving: false,
    saveError: null,
    showSidebar: false,
    showNoteList: false,
    isNoteTransitioning: false,
    showAllNotes: false,
    onRootFolderSelect: vi.fn(),
    onChangeRootFolder: vi.fn(),
    onShowAllNotes: vi.fn(),
    onSelectFolder: vi.fn(),
    onSelectTag: vi.fn(),
    onSelectNote: vi.fn(),
    onContentChange: vi.fn(),
    onCreateNote: vi.fn(),
    onCreateFolder: vi.fn(),
    onDeleteNote: vi.fn(),
    onDeleteFolder: vi.fn(),
    onMetadataChange: vi.fn(),
    onNoteMove: vi.fn(),
    onToggleSidebar: vi.fn(),
    onToggleNoteList: vi.fn(),
    onSaveErrorDismiss: vi.fn(),
    onLayoutModeChange: vi.fn(),
    ...overrides,
  }
}

function renderShell(editorLayoutMode: AppSettings['editorLayoutMode']) {
  const settings: AppSettings = {
    editorLayoutMode,
    theme: 'system',
    colorTheme: 'gray',
    language: 'en',
    rootDir: '/notes',
  }
  return render(
    <AppShell
      onChangeRootFolder={vi.fn()}
      onCreateFolder={vi.fn()}
      onCreateNote={vi.fn()}
      onDeleteFolder={vi.fn()}
      onDeleteNote={vi.fn()}
      onNoteListWidthCommit={vi.fn()}
      onSidebarWidthCommit={vi.fn()}
      settings={settings}
      workspace={createWorkspace()}
    />
  )
}

describe('AppShell 3表示モードでのStatusBar一貫性', () => {
  afterEach(() => {
    cleanup()
    mockGetVersion.mockReset()
  })

  it.each(['editor', 'split', 'preview'] as const)(
    '%sモードでStatusBarが常にレイアウト末尾に同一配置で表示される',
    mode => {
      mockGetVersion.mockResolvedValue('2.1.0')
      renderShell(mode)

      const statusBar = screen.getByTestId('status-chars').closest('div')
      expect(statusBar).toBeInTheDocument()
      // StatusBarはエディタ/プレビュー領域(flex-1 flex overflow-hidden)の
      // 兄弟要素として配置され、レイアウト領域の内部には含まれない
      const editorPane = document.querySelector('.flex-1.flex.overflow-hidden')
      expect(editorPane?.contains(statusBar as Node)).toBe(false)
    }
  )

  it('previewモードではカーソル欄がプレースホルダー表示になる', async () => {
    mockGetVersion.mockResolvedValue('2.1.0')
    renderShell('preview')

    await waitFor(() => {
      expect(screen.getByTestId('status-cursor')).toHaveTextContent('—')
    })
  })

  it('文字数・語数・行数はpreviewモードでもプレースホルダーにならず文書全体の値を維持する', () => {
    mockGetVersion.mockResolvedValue('2.1.0')
    renderShell('preview')

    expect(screen.getByTestId('status-chars')).toHaveTextContent('11')
    expect(screen.getByTestId('status-words')).toHaveTextContent('2')
    expect(screen.getByTestId('status-lines')).toHaveTextContent('1')
  })
})
