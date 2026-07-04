import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
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

let capturedProps: Record<string, unknown> = {}

vi.mock('@/renderer/components/EditorView', () => ({
  EditorView: (props: Record<string, unknown>) => {
    capturedProps = props
    return (
      <div data-testid="editor-view">
        <button
          onClick={() =>
            (
              props.onCursorChange as (p: { line: number; column: number }) => void
            )?.({ line: 2, column: 3 })
          }
          type="button"
        >
          move-cursor
        </button>
        <button
          onClick={() =>
            (
              props.onSelectionStatsChange as (
                s: { charCount: number; wordCount: number } | null
              ) => void
            )?.({ charCount: 5, wordCount: 1 })
          }
          type="button"
        >
          select-text
        </button>
      </div>
    )
  },
}))

const NOTE_A: MarkdownNoteMeta = {
  id: '1',
  title: 'Note1',
  filePath: '/notes/note1.md',
  relativePath: 'note1.md',
}

const NOTE_B: MarkdownNoteMeta = {
  id: '2',
  title: 'Note2',
  filePath: '/notes/note2.md',
  relativePath: 'note2.md',
}

const FOLDER_TREE: FolderNode = {
  name: '',
  relativePath: '',
  children: [],
  notes: [],
}

const SETTINGS: AppSettings = {
  editorLayoutMode: 'split',
  theme: 'system',
  colorTheme: 'gray',
  language: 'en',
  rootDir: '/notes',
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
    selectedNote: null,
    noteContent: '',
    isSaving: false,
    saveError: null,
    showSidebar: true,
    showNoteList: true,
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

function renderAppShell(overrides: Partial<UseNoteWorkspaceResult> = {}) {
  const workspace = createWorkspace(overrides)
  const utils = render(
    <AppShell
      onChangeRootFolder={vi.fn()}
      onCreateFolder={vi.fn()}
      onCreateNote={vi.fn()}
      onDeleteFolder={vi.fn()}
      onDeleteNote={vi.fn()}
      onNoteListWidthCommit={vi.fn()}
      onSidebarWidthCommit={vi.fn()}
      settings={SETTINGS}
      workspace={workspace}
    />
  )
  return { workspace, ...utils }
}

describe('AppShell StatusBar統合', () => {
  afterEach(() => {
    cleanup()
    capturedProps = {}
    mockGetVersion.mockReset()
  })

  it('ノート未選択時はカーソル・集計値がプレースホルダーになる', () => {
    mockGetVersion.mockResolvedValue('2.1.0')
    renderAppShell({ selectedNote: null })
    expect(screen.getByTestId('status-cursor')).toHaveTextContent('—')
    expect(screen.getByTestId('status-chars')).toHaveTextContent('—')
  })

  it('EditorViewからのカーソル通知がStatusBarへ反映される', () => {
    mockGetVersion.mockResolvedValue('2.1.0')
    renderAppShell({ selectedNote: NOTE_A, noteContent: 'Hello world' })

    fireEvent.click(screen.getByRole('button', { name: 'move-cursor' }))

    expect(screen.getByTestId('status-cursor')).toHaveTextContent('2')
    expect(screen.getByTestId('status-cursor')).toHaveTextContent('3')
  })

  it('EditorViewからの選択統計通知で文字数・語数が選択範囲の値に切り替わる', () => {
    mockGetVersion.mockResolvedValue('2.1.0')
    renderAppShell({ selectedNote: NOTE_A, noteContent: 'Hello world' })

    fireEvent.click(screen.getByRole('button', { name: 'select-text' }))

    expect(screen.getByTestId('status-chars')).toHaveTextContent('5')
    expect(screen.getByTestId('status-words')).toHaveTextContent('1')
  })

  it('ノート切り替え時に前ノートのカーソル/選択状態をリセットする', () => {
    mockGetVersion.mockResolvedValue('2.1.0')
    const { rerender, workspace } = renderAppShell({
      selectedNote: NOTE_A,
      noteContent: 'Hello world',
    })

    fireEvent.click(screen.getByRole('button', { name: 'move-cursor' }))
    expect(screen.getByTestId('status-cursor')).toHaveTextContent('2')

    rerender(
      <AppShell
        onChangeRootFolder={vi.fn()}
        onCreateFolder={vi.fn()}
        onCreateNote={vi.fn()}
        onDeleteFolder={vi.fn()}
        onDeleteNote={vi.fn()}
        onNoteListWidthCommit={vi.fn()}
        onSidebarWidthCommit={vi.fn()}
        settings={SETTINGS}
        workspace={{ ...workspace, selectedNote: NOTE_B, noteContent: 'other' }}
      />
    )

    expect(screen.getByTestId('status-cursor')).toHaveTextContent('—')
  })

  it('ノート本文の文字数・語数・行数がStatusBarに表示される', () => {
    mockGetVersion.mockResolvedValue('2.1.0')
    renderAppShell({
      selectedNote: NOTE_A,
      noteContent: 'Hello world\nfoo bar baz',
    })

    expect(screen.getByTestId('status-chars')).toHaveTextContent('23')
    expect(screen.getByTestId('status-words')).toHaveTextContent('5')
    expect(screen.getByTestId('status-lines')).toHaveTextContent('2')
  })

  it('EditorViewへ渡すonCursorChange/onSelectionStatsChangeは再レンダーしても同一参照を維持する', () => {
    mockGetVersion.mockResolvedValue('2.1.0')
    const { rerender, workspace } = renderAppShell({
      selectedNote: NOTE_A,
      noteContent: 'Hello',
    })
    const firstCursorHandler = capturedProps.onCursorChange
    const firstSelectionHandler = capturedProps.onSelectionStatsChange

    rerender(
      <AppShell
        onChangeRootFolder={vi.fn()}
        onCreateFolder={vi.fn()}
        onCreateNote={vi.fn()}
        onDeleteFolder={vi.fn()}
        onDeleteNote={vi.fn()}
        onNoteListWidthCommit={vi.fn()}
        onSidebarWidthCommit={vi.fn()}
        settings={SETTINGS}
        workspace={{ ...workspace, noteContent: 'Hello!' }}
      />
    )

    expect(capturedProps.onCursorChange).toBe(firstCursorHandler)
    expect(capturedProps.onSelectionStatsChange).toBe(firstSelectionHandler)
  })
})
