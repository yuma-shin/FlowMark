import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, screen, cleanup, render } from '@testing-library/react'
import { SettingsSidebar } from '@/renderer/components/settings/SettingsSidebar'
import type { SettingsSection } from '@/renderer/components/settings/SettingsSidebar'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.navigation': 'Settings navigation',
        'settings.appearance': 'Appearance',
        'settings.font': 'Font',
        'settings.language': 'Language',
      }
      return translations[key] ?? key
    },
  }),
}))

describe('SettingsSidebar', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders all three section navigation items', () => {
    const onSectionChange = vi.fn()
    render(<SettingsSidebar activeSection="appearance" onSectionChange={onSectionChange} />)

    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Font')).toBeInTheDocument()
    expect(screen.getByText('Language')).toBeInTheDocument()
  })

  it('highlights the active section with aria-current', () => {
    const onSectionChange = vi.fn()
    render(<SettingsSidebar activeSection="font" onSectionChange={onSectionChange} />)

    const fontButton = screen.getByText('Font').closest('button')
    const appearanceButton = screen.getByText('Appearance').closest('button')

    expect(fontButton).toHaveAttribute('aria-current', 'true')
    expect(appearanceButton).not.toHaveAttribute('aria-current')
  })

  it('calls onSectionChange when a section is clicked', () => {
    const onSectionChange = vi.fn()
    render(<SettingsSidebar activeSection="appearance" onSectionChange={onSectionChange} />)

    fireEvent.click(screen.getByText('Language'))

    expect(onSectionChange).toHaveBeenCalledWith('language')
  })

  it('renders a nav element with accessible label', () => {
    const onSectionChange = vi.fn()
    render(<SettingsSidebar activeSection="appearance" onSectionChange={onSectionChange} />)

    const nav = screen.getByRole('navigation', { name: 'Settings navigation' })
    expect(nav).toBeInTheDocument()
  })

  it('updates aria-current when activeSection prop changes', () => {
    const onSectionChange = vi.fn()
    const { rerender } = render(
      <SettingsSidebar activeSection="appearance" onSectionChange={onSectionChange} />
    )

    expect(screen.getByText('Appearance').closest('button')).toHaveAttribute('aria-current', 'true')

    rerender(<SettingsSidebar activeSection="language" onSectionChange={onSectionChange} />)

    expect(screen.getByText('Appearance').closest('button')).not.toHaveAttribute('aria-current')
    expect(screen.getByText('Language').closest('button')).toHaveAttribute('aria-current', 'true')
  })
})
