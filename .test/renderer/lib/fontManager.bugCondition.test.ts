import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import {
  applyFontPerLanguage,
  buildFontSansValue,
  builtinEnglishFonts,
  builtinJapaneseFonts,
  DEFAULT_FONT_EN,
  DEFAULT_FONT_JA,
} from '@/renderer/lib/fontManager'

/**
 * Bug Condition Test: 日本語フォントが適用されない
 *
 * **Root Cause**: The previous @font-face + src: local() approach silently failed
 * because local() only resolves OS-installed fonts, not web fonts loaded via
 * Google Fonts <link> tag. This caused Japanese text to fall back to generic sans-serif.
 *
 * **Fix**: Direct font-family stacking — set --font-sans to "EnFont", "JaFont", sans-serif.
 * The browser's font matching naturally handles the separation:
 * - Characters present in the English font render with it
 * - Characters NOT in the English font (CJK/Kana) fall through to the Japanese font
 *
 * **Validates**: Requirements 2.1, 2.3, 2.4, 2.5
 */
describe('Bug Condition: 日本語フォントが--font-sansに直接含まれ正しく適用される', () => {
  const japaneseFonts = ['Kosugi Maru', 'Noto Sans JP', 'M PLUS Rounded 1c']
  const englishFonts = ['Geist', 'Inter']

  beforeEach(() => {
    document.documentElement.style.removeProperty('--font-sans')
    const existing = document.getElementById('notyra-font-faces')
    if (existing) existing.remove()
  })

  afterEach(() => {
    document.documentElement.style.removeProperty('--font-sans')
    const existing = document.getElementById('notyra-font-faces')
    if (existing) existing.remove()
  })

  describe('buildFontSansValue - produces correct font-family stacking', () => {
    it('buildFontSansValue("Geist", "Kosugi Maru") includes both fonts and sans-serif fallback', () => {
      const result = buildFontSansValue('Geist', 'Kosugi Maru')
      expect(result).toBe('Geist, "Kosugi Maru", sans-serif')
    })

    it('buildFontSansValue("Inter", "Noto Sans JP") quotes font names with spaces', () => {
      const result = buildFontSansValue('Inter', 'Noto Sans JP')
      expect(result).toBe('Inter, "Noto Sans JP", sans-serif')
    })

    it('buildFontSansValue("Geist", "M PLUS Rounded 1c") handles long font names', () => {
      const result = buildFontSansValue('Geist', 'M PLUS Rounded 1c')
      expect(result).toBe('Geist, "M PLUS Rounded 1c", sans-serif')
    })
  })

  describe('applyFontPerLanguage - Japanese font is directly in --font-sans (not behind local())', () => {
    it('applyFontPerLanguage("Geist", "Kosugi Maru") sets --font-sans with Japanese font name directly', () => {
      applyFontPerLanguage('Geist', 'Kosugi Maru')

      const fontSans = document.documentElement.style.getPropertyValue('--font-sans')
      // Japanese font name must be directly in the CSS value, accessible by the browser
      expect(fontSans).toContain('Kosugi Maru')
      expect(fontSans).toContain('Geist')
      expect(fontSans).toContain('sans-serif')
    })

    it('applyFontPerLanguage does NOT inject @font-face with local() (which fails for web fonts)', () => {
      applyFontPerLanguage('Geist', 'Kosugi Maru')

      // The legacy <style id="notyra-font-faces"> element should not exist
      const styleEl = document.getElementById('notyra-font-faces')
      expect(styleEl).toBeNull()
    })

    it('applyFontPerLanguage removes legacy @font-face style element if present', () => {
      // Simulate legacy style element existing from a previous version
      const legacyStyle = document.createElement('style')
      legacyStyle.id = 'notyra-font-faces'
      legacyStyle.textContent = '@font-face { font-family: "NotyraSans"; src: local("Geist"); }'
      document.head.appendChild(legacyStyle)

      applyFontPerLanguage('Geist', 'Kosugi Maru')

      // Legacy element should be removed
      expect(document.getElementById('notyra-font-faces')).toBeNull()
    })
  })

  describe('Property: for all builtin preset font pairs, --font-sans contains both font names', () => {
    it('property: Japanese font name is always present in --font-sans', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...englishFonts),
          fc.constantFrom(...japaneseFonts),
          (enFont, jaFont) => {
            document.documentElement.style.removeProperty('--font-sans')

            applyFontPerLanguage(enFont, jaFont)

            const fontSans = document.documentElement.style.getPropertyValue('--font-sans')
            // Japanese font must be directly referenced (not behind local())
            expect(fontSans).toContain(jaFont)
            expect(fontSans).toContain(enFont)
            expect(fontSans).toContain('sans-serif')
          }
        ),
        { numRuns: 20 }
      )
    })

    it('property: --font-sans always has format "enFont, jaFont, sans-serif"', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...englishFonts),
          fc.constantFrom(...japaneseFonts),
          (enFont, jaFont) => {
            const result = buildFontSansValue(enFont, jaFont)
            // Must end with sans-serif
            expect(result).toMatch(/,\s*sans-serif$/)
            // English font should come first
            const enIndex = result.indexOf(enFont)
            const jaIndex = result.indexOf(jaFont)
            expect(enIndex).toBeLessThan(jaIndex)
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('Default fonts are correctly applied when Japanese font is specified', () => {
    it('default values produce a working --font-sans with both Geist and Kosugi Maru', () => {
      applyFontPerLanguage(undefined, undefined)

      const fontSans = document.documentElement.style.getPropertyValue('--font-sans')
      expect(fontSans).toContain(DEFAULT_FONT_EN)
      expect(fontSans).toContain(DEFAULT_FONT_JA)
    })

    it('all builtin Japanese fonts are present in --font-sans when selected', () => {
      for (const jaFont of japaneseFonts) {
        document.documentElement.style.removeProperty('--font-sans')
        applyFontPerLanguage('Geist', jaFont)

        const fontSans = document.documentElement.style.getPropertyValue('--font-sans')
        expect(fontSans).toContain(jaFont)
      }
    })
  })
})
