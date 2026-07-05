import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import * as fc from 'fast-check'
import { renderWithProviders } from '../../../helpers/test-app-provider'
import { AppearanceSection } from '@/renderer/components/settings/AppearanceSection'
import type { ColorTheme } from '@/renderer/lib/themeManager'
import { builtinThemes, getThemeName } from '@/renderer/lib/themeManager'

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue([]),
}))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn().mockResolvedValue(false),
    startDragging: vi.fn(),
    onResized: vi.fn().mockResolvedValue(() => {}),
    onMoved: vi.fn().mockResolvedValue(() => {}),
  })),
}))
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }))

const CUSTOM_THEMES_KEY = 'notyra-custom-themes'

// Helper to convert hex color to rgb format as jsdom renders it
function hexToRgb(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  return `rgb(${r}, ${g}, ${b})`
}

// Generator for a hex color string like '#a3f2c1'
const hexColorArb = fc
  .integer({ min: 0, max: 0xffffff })
  .map(n => `#${n.toString(16).padStart(6, '0')}`)

// Generator for unique theme names that won't collide with builtins or each other
// Uses a prefix + index pattern to guarantee uniqueness
const builtinNames = new Set(builtinThemes.flatMap(t => [t.name, t.nameJa]))

function makeThemeArb(index: number): fc.Arbitrary<ColorTheme> {
  return fc.record({
    id: fc.constant(`custom-theme-${index}`),
    name: fc.constant(`TestTheme${index}`),
    nameJa: fc.constant(`テストテーマ${index}`),
    swatches: fc.array(hexColorArb, { minLength: 1, maxLength: 4 }),
    swatchesDark: fc.array(hexColorArb, { minLength: 1, maxLength: 4 }),
    light: fc.constant({ '--bg': '#ffffff' }),
    dark: fc.constant({ '--bg': '#000000' }),
  })
}

// Generator for a list of 1-3 custom themes with unique ids and names
const customThemeListArb: fc.Arbitrary<ColorTheme[]> = fc
  .integer({ min: 1, max: 3 })
  .chain(count =>
    fc.tuple(...Array.from({ length: count }, (_, i) => makeThemeArb(i)))
  )
  .map(tuple => [...tuple])

// Generator for a single custom theme with randomized swatches
const singleCustomThemeArb: fc.Arbitrary<ColorTheme> = fc.record({
  id: fc
    .string({ minLength: 3, maxLength: 12 })
    .filter(s => /^[a-z][a-z0-9-]+$/.test(s))
    .filter(s => !builtinThemes.some(b => b.id === s))
    .map(s => `ct-${s}`),
  name: fc
    .stringMatching(/^[A-Z][a-z]{2,10}$/)
    .filter(s => !builtinNames.has(s)),
  nameJa: fc.stringMatching(/^[ア-ン]{2,6}$/),
  swatches: fc.array(hexColorArb, { minLength: 1, maxLength: 4 }),
  swatchesDark: fc.array(hexColorArb, { minLength: 1, maxLength: 4 }),
  light: fc.constant({ '--bg': '#ffffff' }),
  dark: fc.constant({ '--bg': '#000000' }),
})

/**
 * Property 2: Theme rendering completeness
 *
 * **Validates: Requirements 3.4**
 *
 * For any ColorTheme object in the themes list (builtin or custom), the rendered
 * theme option SHALL display the theme's swatch colors (from swatches in light mode
 * or swatchesDark in dark mode) and the localized theme name (determined by current
 * language), with the currently active theme indicated via aria-selected="true".
 */
describe('Feature: settings-window, Property 2: Theme rendering completeness', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  describe('Each theme displays localized name and swatch colors', () => {
    it('property: all custom themes show their localized name (English) in the rendered output', () => {
      fc.assert(
        fc.property(customThemeListArb, (customThemes) => {
          localStorage.clear()
          localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes))

          const { unmount } = renderWithProviders(<AppearanceSection />, {
            settings: { colorTheme: 'gray' },
          })

          // Each custom theme's English name should be visible
          for (const theme of customThemes) {
            const expectedName = getThemeName(theme, 'en')
            expect(screen.getByText(expectedName)).toBeInTheDocument()
          }

          // Builtin themes should also be visible
          for (const theme of builtinThemes) {
            const expectedName = getThemeName(theme, 'en')
            expect(screen.getByText(expectedName)).toBeInTheDocument()
          }

          unmount()
          cleanup()
        }),
        { numRuns: 20 }
      )
    })

    it('property: each theme option displays swatch colors as background styles (light mode)', () => {
      fc.assert(
        fc.property(customThemeListArb, (customThemes) => {
          localStorage.clear()
          document.documentElement.classList.remove('dark')
          localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes))

          const { unmount } = renderWithProviders(<AppearanceSection />, {
            settings: { colorTheme: 'gray' },
          })

          // For each custom theme, find its option and verify swatch colors
          for (const theme of customThemes) {
            const expectedName = getThemeName(theme, 'en')
            const nameEl = screen.getByText(expectedName)
            const optionEl = nameEl.closest('[role="option"]') as HTMLElement
            expect(optionEl).not.toBeNull()

            // In light mode, swatches should be rendered as background colors
            const spans = optionEl.querySelectorAll('span[style]')
            const renderedColors = Array.from(spans).map(
              span => (span as HTMLElement).style.background
            )

            for (const color of theme.swatches) {
              const expected = hexToRgb(color)
              expect(renderedColors).toContain(expected)
            }
          }

          unmount()
          cleanup()
        }),
        { numRuns: 20 }
      )
    })

    it('property: in dark mode, swatchesDark colors are rendered instead of swatches', () => {
      fc.assert(
        fc.property(customThemeListArb, (customThemes) => {
          localStorage.clear()
          document.documentElement.classList.add('dark')
          localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes))

          const { unmount } = renderWithProviders(<AppearanceSection />, {
            settings: { colorTheme: 'gray', theme: 'dark' },
          })

          for (const theme of customThemes) {
            const expectedName = getThemeName(theme, 'en')
            const nameEl = screen.getByText(expectedName)
            const optionEl = nameEl.closest('[role="option"]') as HTMLElement
            expect(optionEl).not.toBeNull()

            // In dark mode, swatchesDark should be rendered
            const spans = optionEl.querySelectorAll('span[style]')
            const renderedColors = Array.from(spans).map(
              span => (span as HTMLElement).style.background
            )

            for (const color of theme.swatchesDark) {
              const expected = hexToRgb(color)
              expect(renderedColors).toContain(expected)
            }
          }

          unmount()
          cleanup()
          document.documentElement.classList.remove('dark')
        }),
        { numRuns: 20 }
      )
    })
  })

  describe('Active theme has aria-selected="true", non-active have "false"', () => {
    it('property: the active custom theme has aria-selected="true" and others have "false"', () => {
      fc.assert(
        fc.property(
          customThemeListArb.chain(themes => {
            const indexArb = fc.integer({ min: 0, max: themes.length - 1 })
            return indexArb.map(i => ({ themes, activeIndex: i }))
          }),
          ({ themes, activeIndex }) => {
            localStorage.clear()
            localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes))
            const activeThemeId = themes[activeIndex].id

            const { unmount } = renderWithProviders(<AppearanceSection />, {
              settings: { colorTheme: activeThemeId },
            })

            // The active theme option should have aria-selected="true"
            const activeThemeName = getThemeName(themes[activeIndex], 'en')
            const activeNameEl = screen.getByText(activeThemeName)
            const activeOption = activeNameEl.closest('[role="option"]')
            expect(activeOption).toHaveAttribute('aria-selected', 'true')

            // All other options should have aria-selected="false"
            const allOptions = screen.getAllByRole('option')
            for (const option of allOptions) {
              if (option !== activeOption) {
                expect(option).toHaveAttribute('aria-selected', 'false')
              }
            }

            unmount()
            cleanup()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('property: builtin themes also respect aria-selected based on colorTheme setting', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...builtinThemes.map(t => t.id)),
          (activeId) => {
            localStorage.clear()

            const { unmount } = renderWithProviders(<AppearanceSection />, {
              settings: { colorTheme: activeId },
            })

            const activeTheme = builtinThemes.find(t => t.id === activeId)!
            const activeThemeName = getThemeName(activeTheme, 'en')
            const activeNameEl = screen.getByText(activeThemeName)
            const activeOption = activeNameEl.closest('[role="option"]')
            expect(activeOption).toHaveAttribute('aria-selected', 'true')

            // Non-active builtins should have aria-selected="false"
            for (const theme of builtinThemes) {
              if (theme.id !== activeId) {
                const nameEl = screen.getByText(getThemeName(theme, 'en'))
                const option = nameEl.closest('[role="option"]')
                expect(option).toHaveAttribute('aria-selected', 'false')
              }
            }

            unmount()
            cleanup()
          }
        ),
        { numRuns: 20 }
      )
    })
  })
})
