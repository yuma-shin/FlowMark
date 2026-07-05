import { describe, it, expect, afterEach } from 'vitest'
import { fireEvent, screen, cleanup } from '@testing-library/react'
import { renderWithProviders } from '../../../helpers/test-app-provider'
import { LanguageSection } from '@/renderer/components/settings/LanguageSection'

describe('LanguageSection', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders both language options', () => {
    renderWithProviders(<LanguageSection />, { settings: { language: 'en' } })

    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('日本語')).toBeInTheDocument()
  })

  it('marks the active language with aria-selected', () => {
    renderWithProviders(<LanguageSection />, { settings: { language: 'en' } })

    const options = screen.getAllByRole('option')
    const englishOption = options.find(o => o.textContent?.includes('English'))
    const japaneseOption = options.find(o => o.textContent?.includes('日本語'))

    expect(englishOption).toHaveAttribute('aria-selected', 'true')
    expect(japaneseOption).toHaveAttribute('aria-selected', 'false')
  })

  it('shows check mark icon for the active language', () => {
    renderWithProviders(<LanguageSection />, { settings: { language: 'ja' } })

    const options = screen.getAllByRole('option')
    const japaneseOption = options.find(o => o.textContent?.includes('日本語'))
    const englishOption = options.find(o => o.textContent?.includes('English'))

    // Japanese option should have the check mark (svg icon)
    expect(japaneseOption?.querySelector('svg')).toBeInTheDocument()
    // English option should not have the check mark
    expect(englishOption?.querySelector('svg')).not.toBeInTheDocument()
  })

  it('calls changeLanguage when a language option is clicked', () => {
    renderWithProviders(<LanguageSection />, { settings: { language: 'en' } })

    fireEvent.click(screen.getByText('日本語'))

    // changeLanguage persists to localStorage
    expect(localStorage.getItem('appLanguage')).toBe('ja')
  })

  it('renders a listbox container', () => {
    renderWithProviders(<LanguageSection />, { settings: { language: 'en' } })

    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('supports keyboard activation with Enter key', () => {
    renderWithProviders(<LanguageSection />, { settings: { language: 'en' } })

    const japaneseOption = screen.getAllByRole('option').find(o => o.textContent?.includes('日本語'))
    fireEvent.keyDown(japaneseOption!, { key: 'Enter' })

    expect(localStorage.getItem('appLanguage')).toBe('ja')
  })

  it('supports keyboard activation with Space key', () => {
    renderWithProviders(<LanguageSection />, { settings: { language: 'en' } })

    const japaneseOption = screen.getAllByRole('option').find(o => o.textContent?.includes('日本語'))
    fireEvent.keyDown(japaneseOption!, { key: ' ' })

    expect(localStorage.getItem('appLanguage')).toBe('ja')
  })
})
