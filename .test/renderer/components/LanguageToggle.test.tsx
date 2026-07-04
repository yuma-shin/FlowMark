import { describe, it, expect, afterEach } from 'vitest'
import { fireEvent, screen, cleanup } from '@testing-library/react'
import { renderWithProviders } from '../../helpers/test-app-provider'
import { LanguageToggle } from '@/renderer/components/LanguageToggle'

describe('LanguageToggle', () => {
  afterEach(() => {
    cleanup()
  })

  it('トリガーをクリックすると言語の選択肢を表示する', () => {
    renderWithProviders(<LanguageToggle />, { settings: { language: 'en' } })
    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('日本語')).toBeInTheDocument()
  })

  it('言語を選択すると changeLanguage が反映され localStorage に保存される', () => {
    renderWithProviders(<LanguageToggle />, { settings: { language: 'en' } })
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('日本語'))

    expect(localStorage.getItem('appLanguage')).toBe('ja')
  })
})
