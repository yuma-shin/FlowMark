import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../helpers/test-app-provider'
import { EditorScreen } from '@/renderer/screens/editor'

const mockGetVersion = vi.fn()
vi.mock('@tauri-apps/api/app', () => ({
  getVersion: () => mockGetVersion(),
}))

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [
    new URLSearchParams({ note: encodeURIComponent('/notes/note1.md') }),
  ],
}))

vi.mock('@/renderer/components/CustomTitleBar', () => ({
  CustomTitleBar: () => <div />,
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
            )?.({ line: 4, column: 1 })
          }
          type="button"
        >
          move-cursor
        </button>
      </div>
    )
  },
}))

vi.mock('@/renderer/lib/tauriApi', () => ({
  tauriApi: {
    markdown: {
      getNoteContent: vi.fn().mockResolvedValue({
        meta: {
          id: '1',
          title: 'Note1',
          filePath: '/notes/note1.md',
          relativePath: 'note1.md',
          tags: [],
        },
        content: 'Hello world\nfoo bar',
        rawContent: 'Hello world\nfoo bar',
      }),
      watchFile: vi.fn().mockResolvedValue(true),
      unwatchFile: vi.fn().mockResolvedValue(true),
      onFileChanged: vi.fn(() => () => {}),
      saveNote: vi.fn().mockResolvedValue(true),
    },
  },
}))

describe('EditorScreen StatusBar統合', () => {
  afterEach(() => {
    cleanup()
    capturedProps = {}
    mockGetVersion.mockReset()
  })

  it('AppShellと同様にStatusBarを表示し、ノート読込後にstats/versionが反映される', async () => {
    mockGetVersion.mockResolvedValue('2.1.0')
    renderWithProviders(<EditorScreen />, { settings: { theme: 'light' } })

    expect(await screen.findByTestId('status-chars')).toHaveTextContent('19')
    expect(screen.getByTestId('status-words')).toHaveTextContent('4')
    expect(screen.getByTestId('status-lines')).toHaveTextContent('2')
    expect(screen.getByTestId('status-version')).toHaveTextContent('2.1.0')
  })

  it('EditorViewからのカーソル通知がStatusBarへ反映される', async () => {
    mockGetVersion.mockResolvedValue('2.1.0')
    renderWithProviders(<EditorScreen />, { settings: { theme: 'light' } })

    await screen.findByTestId('editor-view')
    await waitFor(() => {
      expect(screen.getByTestId('status-cursor')).toHaveTextContent('—')
    })
    fireEvent.click(screen.getByRole('button', { name: 'move-cursor' }))

    await waitFor(() => {
      expect(screen.getByTestId('status-cursor')).toHaveTextContent('4')
    })
  })
})
