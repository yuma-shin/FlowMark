import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, screen, cleanup, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../helpers/test-app-provider'
import { CustomTitleBar } from '@/renderer/components/CustomTitleBar'

const mockOpenSettingsWindow = vi.fn().mockResolvedValue(true)

vi.mock('@/renderer/lib/tauriApi', () => ({
  tauriApi: {
    window: {
      minimize: vi.fn().mockResolvedValue(undefined),
      maximize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      isMaximized: vi.fn().mockResolvedValue(false),
      openSettingsWindow: (...args: unknown[]) => mockOpenSettingsWindow(...args),
    },
    platform: 'Win32',
  },
}))

vi.mock('@/renderer/hooks/useSystemFonts', () => ({
  useSystemFonts: () => ({
    fonts: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

describe('CustomTitleBar - Settings Button', () => {
  afterEach(() => {
    cleanup()
  })

  it('Settings button exists with correct aria-label', () => {
    renderWithProviders(<CustomTitleBar />)

    const settingsButton = screen.getByRole('button', { name: 'Settings' })
    expect(settingsButton).toBeInTheDocument()
  })

  it('old controls (FontFamilySelector, ColorThemeSelector, ThemeToggle, LanguageToggle) are NOT in DOM', () => {
    renderWithProviders(
      <CustomTitleBar
        onToggleNoteList={vi.fn()}
        onToggleSidebar={vi.fn()}
        showNoteList
        showSidebar
      />
    )

    // Old FontFamilySelector had a tooltip/label with font-related text
    expect(screen.queryByTestId('font-family-selector')).not.toBeInTheDocument()
    // Old ColorThemeSelector had a tooltip/label
    expect(screen.queryByTestId('color-theme-selector')).not.toBeInTheDocument()
    // Old ThemeToggle had buttons for light/dark/system
    expect(screen.queryByTestId('theme-toggle')).not.toBeInTheDocument()
    // Old LanguageToggle had a button for switching language
    expect(screen.queryByTestId('language-toggle')).not.toBeInTheDocument()
  })

  it('existing buttons (sidebar toggle, note list toggle) are still present', () => {
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

    expect(
      screen.getByRole('button', { name: 'Toggle Sidebar' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Toggle Note List' })
    ).toBeInTheDocument()
  })

  it('window controls (minimize, maximize, close) are still present', () => {
    renderWithProviders(<CustomTitleBar />)

    expect(
      screen.getByRole('button', { name: 'Minimize' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Maximize' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Close' })
    ).toBeInTheDocument()
    expect(screen.getByTestId('titlebar-window-controls')).toBeInTheDocument()
  })

  it('clicking Settings button calls openSettingsWindow IPC', async () => {
    renderWithProviders(<CustomTitleBar />)

    const settingsButton = screen.getByRole('button', { name: 'Settings' })
    fireEvent.click(settingsButton)

    expect(mockOpenSettingsWindow).toHaveBeenCalledTimes(1)
  })
})
