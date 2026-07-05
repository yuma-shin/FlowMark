/**
 * スタンドアロン編集ウィンドウ（EditorScreen）が、グローバルな単一設定ではなく
 * open_note_window が付与する `root` クエリパラメータからルートフォルダを
 * 解決することを検証する（root-folder-tabs タスク5の回帰確認）。
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { renderWithProviders } from '../../helpers/test-app-provider'
import { EditorScreen } from '@/renderer/screens/editor'

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [
    new URLSearchParams({
      note: encodeURIComponent('/root-b/note1.md'),
      root: encodeURIComponent('/root-b'),
    }),
  ],
}))

vi.mock('@/renderer/components/CustomTitleBar', () => ({
  CustomTitleBar: () => <div />,
}))

let capturedProps: Record<string, unknown> = {}

vi.mock('@/renderer/components/EditorView', () => ({
  EditorView: (props: Record<string, unknown>) => {
    capturedProps = props
    return <div data-testid="editor-view" />
  },
}))

vi.mock('@/renderer/lib/tauriApi', () => ({
  tauriApi: {
    markdown: {
      getNoteContent: vi.fn().mockResolvedValue({
        meta: {
          id: '1',
          title: 'Note1',
          filePath: '/root-b/note1.md',
          relativePath: 'note1.md',
          tags: [],
        },
        content: 'Hello',
        rawContent: 'Hello',
      }),
      watchFile: vi.fn().mockResolvedValue(true),
      unwatchFile: vi.fn().mockResolvedValue(true),
      onFileChanged: vi.fn(() => () => {}),
      saveNote: vi.fn().mockResolvedValue(true),
    },
  },
}))

describe('EditorScreen のルートフォルダ解決', () => {
  afterEach(() => {
    cleanup()
    capturedProps = {}
  })

  it('rootクエリパラメータをデコードしてEditorViewのrootDirへ渡す（設定のrootDirは参照しない）', async () => {
    renderWithProviders(<EditorScreen />)

    await vi.waitFor(() => {
      expect(capturedProps.rootDir).toBe('/root-b')
    })
  })
})
