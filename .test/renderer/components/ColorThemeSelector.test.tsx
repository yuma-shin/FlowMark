import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { fireEvent, screen, cleanup } from '@testing-library/react'
import { renderWithProviders } from '../../helpers/test-app-provider'
import { ColorThemeSelector } from '@/renderer/components/ColorThemeSelector'

describe('ColorThemeSelector', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('初期状態ではテーマ一覧を表示しない', () => {
    renderWithProviders(<ColorThemeSelector />, {
      settings: { colorTheme: 'gray' },
    })
    expect(screen.queryByText('Purple')).not.toBeInTheDocument()
  })

  it('トリガーをクリックするとテーマ一覧を表示する', () => {
    renderWithProviders(<ColorThemeSelector />, {
      settings: { colorTheme: 'gray' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Color Theme/i }))

    expect(screen.getByText('Gray')).toBeInTheDocument()
    expect(screen.getByText('Purple')).toBeInTheDocument()
  })

  it('現在選択中のテーマに aria-selected が付与される', () => {
    renderWithProviders(<ColorThemeSelector />, {
      settings: { colorTheme: 'purple' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Color Theme/i }))

    expect(screen.getByText('Purple').closest('[role="option"]')).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByText('Gray').closest('[role="option"]')).toHaveAttribute(
      'aria-selected',
      'false'
    )
  })

  it('テーマを選択すると colorTheme が更新され一覧を閉じる', () => {
    renderWithProviders(<ColorThemeSelector />, {
      settings: { colorTheme: 'gray' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Color Theme/i }))
    fireEvent.click(screen.getByText('Purple'))

    const stored = JSON.parse(localStorage.getItem('appSettings')!)
    expect(stored.colorTheme).toBe('purple')
    expect(screen.queryByText('Gray')).not.toBeInTheDocument()
  })

  it('カスタムテーマ（localStorage保存分）も一覧に表示され選択できる', () => {
    localStorage.setItem(
      'notyra-custom-themes',
      JSON.stringify([
        {
          id: 'ocean',
          name: 'Ocean',
          nameJa: 'オーシャン',
          swatches: ['#0ea5e9', '#f0f9ff', '#e0f2fe'],
          swatchesDark: ['#38bdf8', '#0c1e2e', '#123045'],
          light: { '--background': 'oklch(0.98 0 0)' },
          dark: { '--background': 'oklch(0.12 0 0)' },
        },
      ])
    )

    renderWithProviders(<ColorThemeSelector />, {
      settings: { colorTheme: 'gray' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Color Theme/i }))

    expect(screen.getByText('Ocean')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Ocean'))
    const stored = JSON.parse(localStorage.getItem('appSettings')!)
    expect(stored.colorTheme).toBe('ocean')
  })
})
