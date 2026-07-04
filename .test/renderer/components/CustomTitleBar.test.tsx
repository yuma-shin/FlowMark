import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, screen, cleanup, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../helpers/test-app-provider'
import { CustomTitleBar } from '@/renderer/components/CustomTitleBar'

const mockMinimize = vi.fn()
const mockMaximize = vi.fn()
const mockClose = vi.fn()
const mockIsMaximized = vi.fn().mockResolvedValue(false)

vi.mock('@/renderer/lib/tauriApi', () => ({
  tauriApi: {
    window: {
      minimize: (...args: unknown[]) => mockMinimize(...args),
      maximize: (...args: unknown[]) => mockMaximize(...args),
      close: (...args: unknown[]) => mockClose(...args),
      isMaximized: (...args: unknown[]) => mockIsMaximized(...args),
    },
    platform: 'Win32',
  },
}))

describe('CustomTitleBar', () => {
  afterEach(() => {
    cleanup()
  })

  it('data-tauri-drag-region によるドラッグ領域を維持する', () => {
    renderWithProviders(<CustomTitleBar />)
    expect(
      document.querySelectorAll('[data-tauri-drag-region]').length
    ).toBeGreaterThan(0)
  })

  it('サイドバー・ノートリストのトグルボタンがハンドラーを呼ぶ', () => {
    const onToggleSidebar = vi.fn()
    const onToggleNoteList = vi.fn()
    renderWithProviders(
      <CustomTitleBar
        onToggleNoteList={onToggleNoteList}
        onToggleSidebar={onToggleSidebar}
        showNoteList
        showSidebar
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))
    expect(onToggleSidebar).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Note List' }))
    expect(onToggleNoteList).toHaveBeenCalledTimes(1)
  })

  it('ルートフォルダ選択ボタンが onChangeRootFolder を呼ぶ', () => {
    const onChangeRootFolder = vi.fn()
    renderWithProviders(
      <CustomTitleBar onChangeRootFolder={onChangeRootFolder} />,
      { settings: { rootDir: '/notes' } }
    )

    fireEvent.click(screen.getByRole('button', { name: 'Select Folder' }))
    expect(onChangeRootFolder).toHaveBeenCalledTimes(1)
  })

  it('ウィンドウ操作ボタン（最小化・最大化・閉じる）が機能する', async () => {
    renderWithProviders(<CustomTitleBar />)

    await waitFor(() => expect(mockIsMaximized).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: 'Minimize' }))
    expect(mockMinimize).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Maximize' }))
    expect(mockMaximize).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(mockClose).toHaveBeenCalledTimes(1)
  })
})
