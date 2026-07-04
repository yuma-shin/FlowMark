import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  applyColorTheme,
  builtinThemes,
  type ColorTheme,
} from '@/renderer/lib/themeManager'

const CUSTOM_THEMES_KEY = 'notyra-custom-themes'

const INCOMPLETE_CUSTOM_THEME: ColorTheme = {
  id: 'incomplete-custom',
  name: 'Incomplete',
  nameJa: '不完全',
  swatches: ['#000000', '#ffffff', '#cccccc'],
  swatchesDark: ['#ffffff', '#000000', '#333333'],
  light: {
    '--background': '#ffffff',
    '--foreground': '#000000',
  },
  dark: {
    '--background': '#000000',
    '--foreground': '#ffffff',
  },
}

describe('applyColorTheme のフォールバック', () => {
  beforeEach(() => {
    localStorage.setItem(
      CUSTOM_THEMES_KEY,
      JSON.stringify([INCOMPLETE_CUSTOM_THEME])
    )
    document.documentElement.removeAttribute('style')
  })

  afterEach(() => {
    localStorage.removeItem(CUSTOM_THEMES_KEY)
    document.documentElement.removeAttribute('style')
  })

  it('カスタムテーマに--destructiveが無い場合はデフォルトテーマの値にフォールバックする（ライト）', () => {
    applyColorTheme('incomplete-custom', false)
    const root = document.documentElement
    expect(root.style.getPropertyValue('--destructive')).toBe(
      builtinThemes[0].light['--destructive']
    )
    expect(root.style.getPropertyValue('--destructive-foreground')).toBe(
      builtinThemes[0].light['--destructive-foreground']
    )
  })

  it('カスタムテーマに--destructiveが無い場合はデフォルトテーマの値にフォールバックする（ダーク）', () => {
    applyColorTheme('incomplete-custom', true)
    const root = document.documentElement
    expect(root.style.getPropertyValue('--destructive')).toBe(
      builtinThemes[0].dark['--destructive']
    )
    expect(root.style.getPropertyValue('--destructive-foreground')).toBe(
      builtinThemes[0].dark['--destructive-foreground']
    )
  })

  it('カスタムテーマが指定した値はデフォルトより優先して適用される', () => {
    applyColorTheme('incomplete-custom', false)
    const root = document.documentElement
    expect(root.style.getPropertyValue('--background')).toBe('#ffffff')
    expect(root.style.getPropertyValue('--foreground')).toBe('#000000')
  })
})
