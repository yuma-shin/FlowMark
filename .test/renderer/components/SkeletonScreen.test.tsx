import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderWithProviders } from '../../helpers/test-app-provider'
import { SkeletonScreen } from '@/renderer/components/SkeletonScreen'
import type { RootFolderTabBarProps } from '@/renderer/components/RootFolderTabBar'

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    onCloseRequested: vi.fn().mockResolvedValue(() => {}),
    destroy: vi.fn(),
  })),
}))

vi.mock('@/renderer/lib/tauriApi', () => ({
  tauriApi: {
    platform: 'unknown',
    window: {
      isMaximized: vi.fn().mockResolvedValue(false),
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),
    },
  },
}))

const tabBar: RootFolderTabBarProps = {
  tabs: [{ path: '/root-a', name: 'root-a', status: 'ok' }],
  activePath: '/root-a',
  onSelect: vi.fn(),
  onClose: vi.fn(),
  onAdd: vi.fn(),
  onReorder: vi.fn(),
}

describe('SkeletonScreen', () => {
  afterEach(() => {
    cleanup()
  })

  it('タイトルバー・サイドバー・ノートリスト・エディタの各プレースホルダー領域が描画される', () => {
    renderWithProviders(
      <SkeletonScreen
        noteListWidth={320}
        showNoteList={true}
        showSidebar={true}
        sidebarWidth={256}
        tabBar={tabBar}
      />
    )

    expect(screen.getByRole('tab', { name: 'root-a' })).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-notelist')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-editor')).toBeInTheDocument()
  })

  it('showSidebar/showNoteListがfalseの場合、対応するプレースホルダー領域は描画されない', () => {
    renderWithProviders(
      <SkeletonScreen
        noteListWidth={320}
        showNoteList={false}
        showSidebar={false}
        sidebarWidth={256}
        tabBar={tabBar}
      />
    )

    expect(screen.queryByTestId('skeleton-sidebar')).not.toBeInTheDocument()
    expect(screen.queryByTestId('skeleton-notelist')).not.toBeInTheDocument()
    expect(screen.getByTestId('skeleton-editor')).toBeInTheDocument()
  })

  it('プレースホルダー領域にaria-busyとアクセシブルラベルが設定され、タイトルバーはそのスコープ外で操作可能なまま保たれる', () => {
    renderWithProviders(
      <SkeletonScreen
        noteListWidth={320}
        showNoteList={true}
        showSidebar={true}
        sidebarWidth={256}
        tabBar={tabBar}
      />
    )

    const busyRegion = screen.getByLabelText('Loading...')
    expect(busyRegion).toHaveAttribute('aria-busy', 'true')
    expect(busyRegion).toContainElement(screen.getByTestId('skeleton-editor'))

    const tab = screen.getByRole('tab', { name: 'root-a' })
    expect(busyRegion).not.toContainElement(tab)
    expect(tab.closest('[aria-busy]')).toBeNull()
  })
})
