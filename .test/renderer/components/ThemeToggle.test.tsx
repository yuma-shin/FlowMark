import { describe, it, expect, afterEach } from 'vitest'
import { fireEvent, screen, cleanup } from '@testing-library/react'
import { renderWithProviders } from '../../helpers/test-app-provider'
import { ThemeToggle } from '@/renderer/components/ThemeToggle'

describe('ThemeToggle', () => {
  afterEach(() => {
    cleanup()
  })

  it('クリックするたびにテーマが light → dark → system → light と循環する', () => {
    renderWithProviders(<ThemeToggle />, { settings: { theme: 'light' } })
    const button = screen.getByRole('button')
    expect(button).toHaveAccessibleName(/Light Mode/i)

    fireEvent.click(button)
    expect(button).toHaveAccessibleName(/Dark Mode/i)

    fireEvent.click(button)
    expect(button).toHaveAccessibleName(/System Setting/i)

    fireEvent.click(button)
    expect(button).toHaveAccessibleName(/Light Mode/i)
  })
})
