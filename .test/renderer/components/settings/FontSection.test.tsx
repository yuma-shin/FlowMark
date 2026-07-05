import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, screen, cleanup } from '@testing-library/react'
import { renderWithProviders } from '../../../helpers/test-app-provider'
import { FontSection } from '@/renderer/components/settings/FontSection'
import {
  builtinFonts,
  builtinEnglishFonts,
  builtinJapaneseFonts,
  DEFAULT_FONT_EN,
  DEFAULT_FONT_JA,
} from '@/renderer/lib/fontManager'

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

// Mock useSystemFonts to control fonts, isLoading, and error states
const mockUseSystemFonts = vi.fn()
vi.mock('@/renderer/hooks/useSystemFonts', () => ({
  useSystemFonts: () => mockUseSystemFonts(),
}))

describe('FontSection', () => {
  afterEach(() => {
    cleanup()
  })

  describe('Preset selection', () => {
    it('clicking a preset updates both fontFamilyEn and fontFamilyJa', () => {
      mockUseSystemFonts.mockReturnValue({
        fonts: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      })

      renderWithProviders(<FontSection />, {
        settings: { fontFamilyEn: 'Inter', fontFamilyJa: 'Noto Sans JP' },
      })

      // Click the first preset (Geist + Kosugi Maru)
      const preset = builtinFonts[0]
      const presetOption = screen.getByText(preset.name).closest('[role="option"]')
      expect(presetOption).toBeDefined()
      fireEvent.click(presetOption!)

      // Verify localStorage was updated with both values
      const stored = JSON.parse(localStorage.getItem('appSettings') || '{}')
      expect(stored.fontFamilyEn).toBe(preset.fontEn.replace(/"/g, ''))
      expect(stored.fontFamilyJa).toBe(preset.fontJa.replace(/"/g, ''))
    })

    it('selected preset shows aria-selected=true', () => {
      mockUseSystemFonts.mockReturnValue({
        fonts: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      })

      const preset = builtinFonts[0]
      const fontEn = preset.fontEn.replace(/"/g, '')
      const fontJa = preset.fontJa.replace(/"/g, '')

      renderWithProviders(<FontSection />, {
        settings: { fontFamilyEn: fontEn, fontFamilyJa: fontJa },
      })

      const presetOption = screen.getByText(preset.name).closest('[role="option"]')
      expect(presetOption).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('Individual font selection', () => {
    it('clicking an English font updates fontFamilyEn only', () => {
      mockUseSystemFonts.mockReturnValue({
        fonts: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      })

      renderWithProviders(<FontSection />, {
        settings: { fontFamilyEn: 'Geist', fontFamilyJa: 'Kosugi Maru' },
      })

      // Find a different built-in English font
      const targetFont = builtinEnglishFonts.find(f => f !== 'Geist')!
      const allOptions = screen.getAllByRole('option')
      const targetOption = allOptions.find(el => {
        const span = el.querySelector('span[style]')
        if (!span) return false
        const style = span.getAttribute('style') || ''
        return style.includes(`"${targetFont}"`)
      })

      expect(targetOption).toBeDefined()
      fireEvent.click(targetOption!)

      const stored = JSON.parse(localStorage.getItem('appSettings') || '{}')
      expect(stored.fontFamilyEn).toBe(targetFont)
      // fontFamilyJa should remain unchanged
      expect(stored.fontFamilyJa).toBe('Kosugi Maru')
    })

    it('clicking a Japanese font updates fontFamilyJa only', () => {
      mockUseSystemFonts.mockReturnValue({
        fonts: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      })

      renderWithProviders(<FontSection />, {
        settings: { fontFamilyEn: 'Geist', fontFamilyJa: 'Kosugi Maru' },
      })

      // Find a different built-in Japanese font
      const targetFont = builtinJapaneseFonts.find(f => f !== 'Kosugi Maru')!
      const allOptions = screen.getAllByRole('option')
      const targetOption = allOptions.find(el => {
        const span = el.querySelector('span[style]')
        if (!span) return false
        const style = span.getAttribute('style') || ''
        return style.includes(`"${targetFont}"`)
      })

      expect(targetOption).toBeDefined()
      fireEvent.click(targetOption!)

      const stored = JSON.parse(localStorage.getItem('appSettings') || '{}')
      expect(stored.fontFamilyJa).toBe(targetFont)
      // fontFamilyEn should remain unchanged
      expect(stored.fontFamilyEn).toBe('Geist')
    })
  })

  describe('Default font display', () => {
    it('shows Geist as selected English font when fontFamilyEn is undefined', () => {
      mockUseSystemFonts.mockReturnValue({
        fonts: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      })

      renderWithProviders(<FontSection />, {
        settings: {},
      })

      const allOptions = screen.getAllByRole('option')
      const geistOption = allOptions.find(el => {
        const span = el.querySelector('span[style]')
        if (!span) return false
        const style = span.getAttribute('style') || ''
        return style.includes(`"${DEFAULT_FONT_EN}"`) && el.getAttribute('aria-selected') === 'true'
      })

      expect(geistOption).toBeDefined()
    })

    it('shows Kosugi Maru as selected Japanese font when fontFamilyJa is undefined', () => {
      mockUseSystemFonts.mockReturnValue({
        fonts: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      })

      renderWithProviders(<FontSection />, {
        settings: {},
      })

      const allOptions = screen.getAllByRole('option')
      const kosugiOption = allOptions.find(el => {
        const span = el.querySelector('span[style]')
        if (!span) return false
        const style = span.getAttribute('style') || ''
        return style.includes(`"${DEFAULT_FONT_JA}"`) && el.getAttribute('aria-selected') === 'true'
      })

      expect(kosugiOption).toBeDefined()
    })
  })

  describe('Loading state', () => {
    it('shows loading indicator when system fonts are loading', () => {
      mockUseSystemFonts.mockReturnValue({
        fonts: [],
        isLoading: true,
        error: null,
        refresh: vi.fn(),
      })

      renderWithProviders(<FontSection />, {
        settings: { fontFamilyEn: 'Geist', fontFamilyJa: 'Kosugi Maru' },
      })

      // The component renders t('font.loading') text when isLoading is true
      const loadingElements = screen.getAllByText(/loading/i)
      expect(loadingElements.length).toBeGreaterThan(0)
    })
  })

  describe('Error state', () => {
    it('shows error indication when system font loading fails', () => {
      mockUseSystemFonts.mockReturnValue({
        fonts: [],
        isLoading: false,
        error: 'Font enumeration failed',
        refresh: vi.fn(),
      })

      renderWithProviders(<FontSection />, {
        settings: { fontFamilyEn: 'Geist', fontFamilyJa: 'Kosugi Maru' },
      })

      // The component renders "System fonts unavailable" error text with warning icon
      const errorTexts = screen.getAllByText('System fonts unavailable')
      expect(errorTexts.length).toBeGreaterThan(0)
    })

    it('built-in fonts remain selectable when system font loading fails', () => {
      mockUseSystemFonts.mockReturnValue({
        fonts: [],
        isLoading: false,
        error: 'Font enumeration failed',
        refresh: vi.fn(),
      })

      renderWithProviders(<FontSection />, {
        settings: { fontFamilyEn: 'Geist', fontFamilyJa: 'Kosugi Maru' },
      })

      // Built-in English fonts should still be rendered and clickable
      for (const fontName of builtinEnglishFonts) {
        const allOptions = screen.getAllByRole('option')
        const option = allOptions.find(el => {
          const span = el.querySelector('span[style]')
          if (!span) return false
          return (span.getAttribute('style') || '').includes(`"${fontName}"`)
        })
        expect(option).toBeDefined()
      }

      // Built-in Japanese fonts should still be rendered and clickable
      for (const fontName of builtinJapaneseFonts) {
        const allOptions = screen.getAllByRole('option')
        const option = allOptions.find(el => {
          const span = el.querySelector('span[style]')
          if (!span) return false
          return (span.getAttribute('style') || '').includes(`"${fontName}"`)
        })
        expect(option).toBeDefined()
      }
    })
  })

  describe('Virtualization threshold', () => {
    it('uses virtualized scrolling when total fonts exceed 20 items', () => {
      // Generate more than 20 system fonts to exceed VIRTUALIZE_THRESHOLD (20)
      // builtinEnglishFonts has ~2-3 items, so 25 system fonts pushes us over
      const manyFonts = Array.from({ length: 25 }, (_, i) => `SystemFont${i}`)
      mockUseSystemFonts.mockReturnValue({
        fonts: manyFonts,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      })

      const { container } = renderWithProviders(<FontSection />, {
        settings: { fontFamilyEn: 'Geist', fontFamilyJa: 'Kosugi Maru' },
      })

      // When virtualization is active, the VirtualizedFontList renders:
      // - A parent div with overflow-y-auto and maxHeight: 320px
      // - A child div with position: relative and a calculated total height
      const virtualScrollContainer = container.querySelector(
        '[style*="max-height: 320px"]'
      )
      expect(virtualScrollContainer).toBeInTheDocument()

      // The inner container has position: relative with dynamic height
      const innerContainer = virtualScrollContainer?.querySelector(
        '[style*="position: relative"]'
      )
      expect(innerContainer).toBeInTheDocument()
    })

    it('does not use virtualization when fonts are below threshold', () => {
      // Few system fonts - below the threshold
      const fewFonts = ['Arial', 'Verdana']
      mockUseSystemFonts.mockReturnValue({
        fonts: fewFonts,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      })

      const { container } = renderWithProviders(<FontSection />, {
        settings: { fontFamilyEn: 'Geist', fontFamilyJa: 'Kosugi Maru' },
      })

      // Without virtualization, no scroll container with maxHeight: 320px is rendered
      const virtualScrollContainer = container.querySelector(
        '[style*="max-height: 320px"]'
      )
      expect(virtualScrollContainer).not.toBeInTheDocument()
    })
  })
})
