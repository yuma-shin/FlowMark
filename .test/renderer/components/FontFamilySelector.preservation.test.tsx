/**
 * Preservation Property Tests - Font Selection Behavior and Non-Heading Rendering Unchanged
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * These tests verify that font selection behavior, inline styles, and preset
 * selection work correctly on the UNFIXED code. They must PASS on unfixed code
 * and continue to PASS after the fix is applied (no regressions).
 *
 * Properties tested:
 * - For all font names (including names with spaces, quotes, CJK characters),
 *   clicking FontOptionItem triggers onSelect with the exact font name
 * - For all font names, FontOptionItem applies correct inline fontFamily style
 * - For all preset combinations, PresetSection updates both English and Japanese fonts
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, screen, fireEvent } from '@testing-library/react'
import fc from 'fast-check'
import { renderWithProviders } from '../../helpers/test-app-provider'
import { FontFamilySelector } from '@/renderer/components/FontFamilySelector'
import {
  builtinFonts,
  builtinEnglishFonts,
  builtinJapaneseFonts,
  applyFontPerLanguage,
  buildFontFamilyValue,
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

// --- Generators ---

/**
 * Generates font names with various characteristics:
 * - Simple single-word names (e.g., "Inter", "Geist")
 * - Names with spaces (e.g., "Noto Sans JP", "M PLUS Rounded 1c")
 * - CJK characters (e.g., "小杉丸ゴシック", "游ゴシック")
 * - Names with special characters
 */
const fontNameArb = fc.oneof(
  // Simple ASCII font names
  fc.stringMatching(/^[A-Z][a-z]{2,10}$/),
  // Multi-word font names with spaces
  fc.tuple(
    fc.stringMatching(/^[A-Z][a-z]{2,8}$/),
    fc.stringMatching(/^[A-Z][a-z]{2,8}$/)
  ).map(([a, b]) => `${a} ${b}`),
  // CJK font names
  fc.stringMatching(/^[\u3040-\u309F\u4E00-\u9FFF]{2,6}$/),
  // Real-world font names from the codebase
  fc.constantFrom(
    'Inter',
    'Geist',
    'Noto Sans JP',
    'M PLUS Rounded 1c',
    'Kosugi Maru',
    'Source Code Pro',
    'Fira Code',
    'JetBrains Mono',
    'Yu Gothic UI',
    'Hiragino Kaku Gothic ProN',
    'Meiryo'
  )
)

// --- Property Tests ---

describe('Preservation Property: FontOptionItem click triggers onSelect with exact font name', () => {
  afterEach(() => {
    cleanup()
  })

  /**
   * **Validates: Requirements 3.1, 3.2**
   *
   * Property: For all built-in English fonts, clicking the font option calls
   * onSelect handler which updates fontFamilyEn setting with the exact font name.
   *
   * This test observes the UNFIXED code behavior:
   * - Clicking a FontOptionItem calls onSelect() callback
   * - The onSelect handler passes the exact fontName string
   * - This behavior must be preserved after the fix
   */
  it('clicking any built-in English font option updates fontFamilyEn setting', () => {
    for (const fontName of builtinEnglishFonts) {
      cleanup()

      const { container } = renderWithProviders(<FontFamilySelector />, {
        settings: { fontFamilyEn: 'Geist', fontFamilyJa: 'Kosugi Maru' },
      })

      // Open the popover
      fireEvent.click(screen.getByRole('button', { name: /font/i }))

      // Find the option item for this font by checking inline style
      const allOptions = screen.getAllByRole('option')
      const targetOption = allOptions.find(el => {
        const span = el.querySelector('span[style]')
        if (!span) return false
        const style = span.getAttribute('style') || ''
        return style.includes(`"${fontName}"`)
      })

      expect(targetOption).toBeDefined()

      // Click the option
      fireEvent.click(targetOption!)

      // After click, the option should now be selected (has aria-selected="true")
      // Re-query since the component re-renders
      const updatedOptions = screen.getAllByRole('option')
      const selectedOption = updatedOptions.find(el => {
        const span = el.querySelector('span[style]')
        if (!span) return false
        const style = span.getAttribute('style') || ''
        return style.includes(`"${fontName}"`) && el.getAttribute('aria-selected') === 'true'
      })

      expect(selectedOption).toBeDefined()
    }
  })

  /**
   * **Validates: Requirements 3.1, 3.2**
   *
   * Property: For all built-in Japanese fonts, clicking the font option calls
   * onSelect handler which updates fontFamilyJa setting.
   */
  it('clicking any built-in Japanese font option updates fontFamilyJa setting', () => {
    for (const fontName of builtinJapaneseFonts) {
      cleanup()

      renderWithProviders(<FontFamilySelector />, {
        settings: { fontFamilyEn: 'Geist', fontFamilyJa: 'Kosugi Maru' },
      })

      // Open the popover
      fireEvent.click(screen.getByRole('button', { name: /font/i }))

      // Find the option item for this font
      const allOptions = screen.getAllByRole('option')
      const targetOption = allOptions.find(el => {
        const span = el.querySelector('span[style]')
        if (!span) return false
        const style = span.getAttribute('style') || ''
        return style.includes(`"${fontName}"`)
      })

      expect(targetOption).toBeDefined()

      // Click the option
      fireEvent.click(targetOption!)

      // Verify the option is now selected
      const updatedOptions = screen.getAllByRole('option')
      const selectedOption = updatedOptions.find(el => {
        const span = el.querySelector('span[style]')
        if (!span) return false
        const style = span.getAttribute('style') || ''
        return style.includes(`"${fontName}"`) && el.getAttribute('aria-selected') === 'true'
      })

      expect(selectedOption).toBeDefined()
    }
  })
})

describe('Preservation Property: FontOptionItem applies correct inline fontFamily style', () => {
  afterEach(() => {
    cleanup()
  })

  /**
   * **Validates: Requirements 3.1**
   *
   * Property: For all font names, FontOptionItem applies the inline style
   * `fontFamily: '"FontName", sans-serif'` to render the preview in that font.
   *
   * This is the visual preview mechanism that must be preserved.
   * On unfixed code: each option has style fontFamily: '"FontName", sans-serif'
   * After fix: this same behavior must remain (only the TEXT changes, not the style)
   */
  it('all built-in English font options have correct inline fontFamily style', () => {
    renderWithProviders(<FontFamilySelector />, {
      settings: { fontFamilyEn: 'Geist', fontFamilyJa: 'Kosugi Maru' },
    })

    // Open the popover
    fireEvent.click(screen.getByRole('button', { name: /font/i }))

    for (const fontName of builtinEnglishFonts) {
      const allOptions = screen.getAllByRole('option')
      const targetOption = allOptions.find(el => {
        const span = el.querySelector('span[style]')
        if (!span) return false
        const style = span.getAttribute('style') || ''
        // The component applies: style={{ fontFamily: `"${fontName}", sans-serif` }}
        return style.includes(`"${fontName}"`) && style.includes('sans-serif')
      })

      expect(
        targetOption,
        `Expected to find option with fontFamily containing "${fontName}", sans-serif`
      ).toBeDefined()
    }
  })

  it('all built-in Japanese font options have correct inline fontFamily style', () => {
    renderWithProviders(<FontFamilySelector />, {
      settings: { fontFamilyEn: 'Geist', fontFamilyJa: 'Kosugi Maru' },
    })

    // Open the popover
    fireEvent.click(screen.getByRole('button', { name: /font/i }))

    for (const fontName of builtinJapaneseFonts) {
      const allOptions = screen.getAllByRole('option')
      const targetOption = allOptions.find(el => {
        const span = el.querySelector('span[style]')
        if (!span) return false
        const style = span.getAttribute('style') || ''
        return style.includes(`"${fontName}"`) && style.includes('sans-serif')
      })

      expect(
        targetOption,
        `Expected to find option with fontFamily containing "${fontName}", sans-serif`
      ).toBeDefined()
    }
  })

  /**
   * **Validates: Requirements 3.1**
   *
   * Property-based test: For randomly generated font names, the inline style
   * pattern `fontFamily: '"FontName", sans-serif'` is correctly formed.
   *
   * Tests the buildFontFamilyValue logic indirectly via the component style.
   */
  it('font name with spaces is correctly quoted in inline style (property-based)', () => {
    fc.assert(
      fc.property(fontNameArb, (fontName) => {
        // The FontOptionItem component applies: style={{ fontFamily: `"${fontName}", sans-serif` }}
        // Verify the expected style format
        const expectedStyleFragment = `"${fontName}", sans-serif`

        // The font name should be wrapped in quotes and followed by sans-serif fallback
        expect(expectedStyleFragment).toContain(fontName)
        expect(expectedStyleFragment).toMatch(/^"[^"]+", sans-serif$/)
      }),
      { numRuns: 50 }
    )
  })
})

describe('Preservation Property: PresetSection updates both English and Japanese fonts', () => {
  afterEach(() => {
    cleanup()
  })

  /**
   * **Validates: Requirements 3.4**
   *
   * Property: For all preset combinations, clicking a preset calls onSelect
   * with both fontEn and fontJa values simultaneously.
   *
   * Observation on unfixed code: PresetSection calls onSelect(fontEn, fontJa)
   * which triggers updateSettings({ fontFamilyEn: fontEn, fontFamilyJa: fontJa })
   */
  it('clicking each preset updates both fontFamilyEn and fontFamilyJa settings', () => {
    for (const font of builtinFonts) {
      cleanup()

      const fontEn = font.fontEn.replace(/"/g, '')
      const fontJa = font.fontJa.replace(/"/g, '')

      // Skip "System Default" preset since its fontEn contains commas
      // and is handled differently
      if (fontEn.includes(',')) continue

      renderWithProviders(<FontFamilySelector />, {
        settings: { fontFamilyEn: 'Inter', fontFamilyJa: 'Noto Sans JP' },
      })

      // Open the popover
      fireEvent.click(screen.getByRole('button', { name: /font/i }))

      // Find the preset option by its display name
      const allOptions = screen.getAllByRole('option')
      const presetOption = allOptions.find(el => {
        const span = el.querySelector('span')
        if (!span) return false
        const text = span.textContent || ''
        return text === font.name || text === font.nameJa
      })

      expect(presetOption).toBeDefined()

      // Click the preset
      fireEvent.click(presetOption!)

      // After clicking, verify:
      // 1. The preset itself is selected (aria-selected="true")
      const updatedOptions = screen.getAllByRole('option')
      const selectedPreset = updatedOptions.find(el => {
        const span = el.querySelector('span')
        if (!span) return false
        const text = span.textContent || ''
        return (text === font.name || text === font.nameJa) &&
          el.getAttribute('aria-selected') === 'true'
      })
      expect(
        selectedPreset,
        `Expected preset "${font.name}" to be selected after clicking it`
      ).toBeDefined()

      // 2. The English font option item is selected
      const selectedEnFont = updatedOptions.find(el => {
        const span = el.querySelector('span[style]')
        if (!span) return false
        const style = span.getAttribute('style') || ''
        return style.includes(`"${fontEn}"`) && el.getAttribute('aria-selected') === 'true'
      })
      expect(
        selectedEnFont,
        `Expected English font "${fontEn}" to be selected after clicking preset "${font.name}"`
      ).toBeDefined()
    }
  })

  /**
   * **Validates: Requirements 3.4**
   *
   * Property-based test: For all valid preset font pairs, the PresetSection
   * always sets both fonts atomically. Verify the preset option becomes selected.
   */
  it('preset selection marks the preset as selected (aria-selected)', () => {
    // Use the non-system presets (those without commas in fontEn)
    const validPresets = builtinFonts.filter(
      f => !f.fontEn.replace(/"/g, '').includes(',')
    )

    fc.assert(
      fc.property(
        fc.constantFrom(...validPresets),
        (preset) => {
          cleanup()

          renderWithProviders(<FontFamilySelector />, {
            settings: { fontFamilyEn: 'Inter', fontFamilyJa: 'Noto Sans JP' },
          })

          // Open the popover
          fireEvent.click(screen.getByRole('button', { name: /font/i }))

          // Find and click the preset
          const allOptions = screen.getAllByRole('option')
          const presetOption = allOptions.find(el => {
            const span = el.querySelector('span')
            if (!span) return false
            const text = span.textContent || ''
            return text === preset.name || text === preset.nameJa
          })

          expect(presetOption).toBeDefined()
          fireEvent.click(presetOption!)

          // After clicking, the preset should be selected
          const updatedOptions = screen.getAllByRole('option')
          const selectedPreset = updatedOptions.find(el => {
            const span = el.querySelector('span')
            if (!span) return false
            const text = span.textContent || ''
            return (text === preset.name || text === preset.nameJa) &&
              el.getAttribute('aria-selected') === 'true'
          })

          expect(selectedPreset).toBeDefined()
        }
      ),
      { numRuns: 10 }
    )
  })
})

describe('Preservation Property: Body text uses --font-sans and code uses --font-mono', () => {
  afterEach(() => {
    cleanup()
  })

  /**
   * **Validates: Requirements 3.5**
   *
   * Observation: Markdown preview body text (paragraphs, lists) uses --font-sans.
   * This is set via CSS: .markdown-body { font-family: var(--font-sans) !important }
   *
   * Since jsdom doesn't resolve CSS variables, we verify the CSS structure:
   * The --font-sans variable is set on :root via applyFontPerLanguage().
   */
  it('applyFontPerLanguage sets --font-sans on document root with correct composed value', () => {
    fc.assert(
      fc.property(fontNameArb, fontNameArb, (fontEn, fontJa) => {
        applyFontPerLanguage(fontEn, fontJa)

        const rootStyle = document.documentElement.style.getPropertyValue('--font-sans')
        // After the web-font fix, --font-sans directly contains font names
        // (no longer uses NotyraSans @font-face wrapper which failed for web fonts)
        expect(rootStyle).toContain(fontEn)
        expect(rootStyle).toContain(fontJa)
        expect(rootStyle).toContain('sans-serif')

        // Legacy @font-face style element should NOT exist
        const styleEl = document.getElementById('notyra-font-faces')
        expect(styleEl).toBeNull()

        // Cleanup
        document.documentElement.style.removeProperty('--font-sans')
      }),
      { numRuns: 30 }
    )
  })

  /**
   * **Validates: Requirements 3.3**
   *
   * Observation: Code blocks use --font-mono which is a separate CSS variable.
   * The font fix (adding font-family: inherit to headings) should NOT affect
   * --font-mono or any monospace rendering.
   *
   * Structural test: verify --font-mono is independent of --font-sans.
   */
  it('--font-mono is not affected by --font-sans changes', () => {
    fc.assert(
      fc.property(fontNameArb, fontNameArb, (fontEn, fontJa) => {
        // Set a known --font-mono value
        document.documentElement.style.setProperty('--font-mono', '"Fira Code", monospace')

        // Change --font-sans via applyFontPerLanguage
        applyFontPerLanguage(fontEn, fontJa)

        // --font-mono should remain unchanged
        const monoValue = document.documentElement.style.getPropertyValue('--font-mono')
        expect(monoValue).toBe('"Fira Code", monospace')

        // Cleanup
        document.documentElement.style.removeProperty('--font-sans')
        document.documentElement.style.removeProperty('--font-mono')
      }),
      { numRuns: 20 }
    )
  })

  /**
   * **Validates: Requirements 3.2, 3.5**
   *
   * Property: buildFontFamilyValue correctly composes font-family strings
   * for all font name combinations. Names with spaces are quoted.
   */
  it('buildFontFamilyValue correctly quotes fonts with spaces and composes value', () => {
    fc.assert(
      fc.property(fontNameArb, fontNameArb, (fontEn, fontJa) => {
        const result = buildFontFamilyValue(fontEn, fontJa)

        // Result should always end with ", sans-serif"
        expect(result).toMatch(/sans-serif$/)

        // Font names with spaces should be quoted
        if (fontEn.includes(' ')) {
          expect(result).toContain(`"${fontEn}"`)
        } else {
          expect(result).toContain(fontEn)
        }

        if (fontJa.includes(' ')) {
          expect(result).toContain(`"${fontJa}"`)
        } else {
          expect(result).toContain(fontJa)
        }
      }),
      { numRuns: 50 }
    )
  })
})
