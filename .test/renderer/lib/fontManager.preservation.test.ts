import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import {
  applyFontPerLanguage,
  buildFontFamilyValue,
  buildFontSansValue,
  builtinFonts,
  resolvePreset,
  DEFAULT_FONT_EN,
  DEFAULT_FONT_JA,
} from '@/renderer/lib/fontManager'

/**
 * Preservation Property Tests
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 *
 * These tests validate that:
 * 1. --font-sans is set correctly with font-family stacking (EnFont, JaFont, sans-serif)
 * 2. English font comes first in the font-family stack (ensures Latin text uses it)
 * 3. buildFontFamilyValue output format is unchanged
 * 4. No duplicate or orphaned style elements remain
 * 5. Default values are used when args are undefined
 * 6. All builtin presets resolve and apply correctly
 */
describe('Preservation: Existing Font Application Behavior Unchanged', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty('--font-sans')
    const existingStyle = document.getElementById('notyra-font-faces')
    if (existingStyle) existingStyle.remove()
  })

  afterEach(() => {
    document.documentElement.style.removeProperty('--font-sans')
    const existingStyle = document.getElementById('notyra-font-faces')
    if (existingStyle) existingStyle.remove()
  })

  describe('Property: --font-sans is set with correct font-family stacking (Req 3.2)', () => {
    it('property: for all font pairs, --font-sans contains both fonts and sans-serif', () => {
      const enFonts = ['Geist', 'Inter', 'Arial', 'Verdana']
      const jaFonts = ['Kosugi Maru', 'Noto Sans JP', 'M PLUS Rounded 1c']

      fc.assert(
        fc.property(
          fc.constantFrom(...enFonts),
          fc.constantFrom(...jaFonts),
          (enFont, jaFont) => {
            document.documentElement.style.removeProperty('--font-sans')

            applyFontPerLanguage(enFont, jaFont)

            const fontSans =
              document.documentElement.style.getPropertyValue('--font-sans')

            // --font-sans must contain both font names and sans-serif
            expect(fontSans).toContain(enFont)
            expect(fontSans).toContain(jaFont)
            expect(fontSans).toContain('sans-serif')
          }
        ),
        { numRuns: 20 }
      )
    })

    it('property: for all builtin presets, --font-sans is correctly set', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...builtinFonts),
          (preset) => {
            document.documentElement.style.removeProperty('--font-sans')

            const resolved = resolvePreset(preset.id)
            expect(resolved).not.toBeNull()

            applyFontPerLanguage(resolved!.fontEn, resolved!.fontJa)

            const fontSans =
              document.documentElement.style.getPropertyValue('--font-sans')
            expect(fontSans).toContain('sans-serif')
            expect(fontSans).toContain(resolved!.fontJa)
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('Property: English font comes first in font-family stack for Latin priority (Req 3.1, 3.3)', () => {
    it('property: for all font pairs, English font appears before Japanese font', () => {
      const enFonts = ['Geist', 'Inter']
      const jaFonts = ['Kosugi Maru', 'Noto Sans JP', 'M PLUS Rounded 1c']

      fc.assert(
        fc.property(
          fc.constantFrom(...enFonts),
          fc.constantFrom(...jaFonts),
          (enFont, jaFont) => {
            const result = buildFontSansValue(enFont, jaFont)

            const enIndex = result.indexOf(enFont)
            const jaIndex = result.indexOf(jaFont)
            // English font must appear before Japanese font
            expect(enIndex).toBeLessThan(jaIndex)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('property: English font with unicode-range ordering is preserved via stacking order', () => {
      const enFonts = ['Geist', 'Inter']
      const jaFonts = ['Kosugi Maru', 'Noto Sans JP', 'M PLUS Rounded 1c']

      fc.assert(
        fc.property(
          fc.constantFrom(...enFonts),
          fc.constantFrom(...jaFonts),
          (enFont, jaFont) => {
            document.documentElement.style.removeProperty('--font-sans')

            applyFontPerLanguage(enFont, jaFont)

            const fontSans =
              document.documentElement.style.getPropertyValue('--font-sans')

            // Verify English font is first in the stack
            const enIndex = fontSans.indexOf(enFont)
            const jaIndex = fontSans.indexOf(jaFont)
            expect(enIndex).toBeGreaterThanOrEqual(0)
            expect(jaIndex).toBeGreaterThan(enIndex)
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  describe('Property: No orphaned style elements after migration (Req 3.4)', () => {
    it('property: calling applyFontPerLanguage removes any legacy @font-face style element', () => {
      const enFonts = ['Geist', 'Inter']
      const jaFonts = ['Kosugi Maru', 'Noto Sans JP', 'M PLUS Rounded 1c']

      fc.assert(
        fc.property(
          fc.constantFrom(...enFonts),
          fc.constantFrom(...jaFonts),
          (enFont, jaFont) => {
            // Simulate legacy style element
            const legacy = document.createElement('style')
            legacy.id = 'notyra-font-faces'
            legacy.textContent = 'legacy content'
            document.head.appendChild(legacy)

            applyFontPerLanguage(enFont, jaFont)

            // Legacy element should be removed
            const remaining = document.getElementById('notyra-font-faces')
            expect(remaining).toBeNull()
          }
        ),
        { numRuns: 10 }
      )
    })

    it('property: calling applyFontPerLanguage multiple times does not accumulate elements', () => {
      const enFonts = ['Geist', 'Inter']
      const jaFonts = ['Kosugi Maru', 'Noto Sans JP', 'M PLUS Rounded 1c']

      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(fc.constantFrom(...enFonts), fc.constantFrom(...jaFonts)),
            { minLength: 2, maxLength: 5 }
          ),
          (fontPairs) => {
            for (const [en, ja] of fontPairs) {
              applyFontPerLanguage(en, ja)
            }

            // No style elements with the legacy ID should exist
            const allStyles = document.querySelectorAll('#notyra-font-faces')
            expect(allStyles.length).toBe(0)
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  describe('Property: buildFontFamilyValue output format unchanged (Req 3.5)', () => {
    it('property: buildFontFamilyValue produces correct "en, ja, sans-serif" format', () => {
      const fontNames = [
        'Geist',
        'Inter',
        'Kosugi Maru',
        'Noto Sans JP',
        'M PLUS Rounded 1c',
        'Arial',
      ]

      fc.assert(
        fc.property(
          fc.constantFrom(...fontNames),
          fc.constantFrom(...fontNames),
          (en, ja) => {
            const result = buildFontFamilyValue(en, ja)

            // Must end with ", sans-serif"
            expect(result).toMatch(/,\s*sans-serif$/)

            // Must contain both font references
            if (en.includes(' ')) {
              expect(result).toContain(`"${en}"`)
            } else {
              expect(result).toContain(en)
            }

            if (ja.includes(' ')) {
              expect(result).toContain(`"${ja}"`)
            } else {
              expect(result).toContain(ja)
            }
          }
        ),
        { numRuns: 30 }
      )
    })

    it('property: font names with spaces are correctly quoted', () => {
      const fontsWithSpaces = [
        'Kosugi Maru',
        'Noto Sans JP',
        'M PLUS Rounded 1c',
        'Segoe UI',
        'Yu Gothic UI',
      ]

      fc.assert(
        fc.property(fc.constantFrom(...fontsWithSpaces), (font) => {
          const resultAsEn = buildFontFamilyValue(font, 'Geist')
          expect(resultAsEn).toContain(`"${font}"`)

          const resultAsJa = buildFontFamilyValue('Geist', font)
          expect(resultAsJa).toContain(`"${font}"`)
        }),
        { numRuns: 20 }
      )
    })

    it('property: font names without spaces are NOT double-quoted', () => {
      const fontsWithoutSpaces = ['Geist', 'Inter', 'Arial', 'Verdana']

      fc.assert(
        fc.property(fc.constantFrom(...fontsWithoutSpaces), (font) => {
          const result = buildFontFamilyValue(font, font)
          expect(result).not.toContain(`"${font}"`)
          expect(result).toContain(font)
        }),
        { numRuns: 20 }
      )
    })

    it('property: randomly generated font names with spaces are always quoted', () => {
      const fontWithSpace = fc
        .tuple(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Za-z]+$/.test(s)),
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[A-Za-z]+$/.test(s))
        )
        .map(([a, b]) => `${a} ${b}`)

      fc.assert(
        fc.property(fontWithSpace, fontWithSpace, (en, ja) => {
          const result = buildFontFamilyValue(en, ja)
          expect(result).toContain(`"${en}"`)
          expect(result).toContain(`"${ja}"`)
          expect(result).toMatch(/,\s*sans-serif$/)
        }),
        { numRuns: 50 }
      )
    })
  })

  describe('Property: default values used when arguments are undefined (Req 3.6)', () => {
    it('applyFontPerLanguage(undefined, undefined) uses DEFAULT_FONT_EN and DEFAULT_FONT_JA', () => {
      applyFontPerLanguage(undefined, undefined)

      const fontSans =
        document.documentElement.style.getPropertyValue('--font-sans')

      expect(fontSans).toContain(DEFAULT_FONT_EN)
      expect(fontSans).toContain(DEFAULT_FONT_JA)
      expect(fontSans).toContain('sans-serif')
    })

    it('property: for any undefined fontEn, DEFAULT_FONT_EN is used', () => {
      const jaFonts = ['Kosugi Maru', 'Noto Sans JP', 'M PLUS Rounded 1c']

      fc.assert(
        fc.property(fc.constantFrom(...jaFonts), (jaFont) => {
          document.documentElement.style.removeProperty('--font-sans')

          applyFontPerLanguage(undefined, jaFont)

          const fontSans =
            document.documentElement.style.getPropertyValue('--font-sans')
          expect(fontSans).toContain(DEFAULT_FONT_EN)
          expect(fontSans).toContain(jaFont)
        }),
        { numRuns: 10 }
      )
    })

    it('property: for any undefined fontJa, DEFAULT_FONT_JA is used', () => {
      const enFonts = ['Geist', 'Inter']

      fc.assert(
        fc.property(fc.constantFrom(...enFonts), (enFont) => {
          document.documentElement.style.removeProperty('--font-sans')

          applyFontPerLanguage(enFont, undefined)

          const fontSans =
            document.documentElement.style.getPropertyValue('--font-sans')
          expect(fontSans).toContain(DEFAULT_FONT_JA)
          expect(fontSans).toContain(enFont)
        }),
        { numRuns: 10 }
      )
    })
  })

  describe('All builtin presets resolve and apply correctly (Req 3.5)', () => {
    it('property: all non-system presets apply fonts with both En and Ja in --font-sans', () => {
      const nonSystemPresets = builtinFonts.filter(p => p.id !== 'system')

      fc.assert(
        fc.property(
          fc.constantFrom(...nonSystemPresets),
          (preset) => {
            document.documentElement.style.removeProperty('--font-sans')

            const resolved = resolvePreset(preset.id)
            expect(resolved).not.toBeNull()

            applyFontPerLanguage(resolved!.fontEn, resolved!.fontJa)

            const fontSans =
              document.documentElement.style.getPropertyValue('--font-sans')
            expect(fontSans).toContain(resolved!.fontEn)
            expect(fontSans).toContain(resolved!.fontJa)
          }
        ),
        { numRuns: 20 }
      )
    })

    it('system preset applies correctly via applyFontPerLanguage', () => {
      const systemPreset = resolvePreset('system')
      expect(systemPreset).not.toBeNull()

      applyFontPerLanguage(systemPreset!.fontEn, systemPreset!.fontJa)

      const fontSans =
        document.documentElement.style.getPropertyValue('--font-sans')
      expect(fontSans).toContain('sans-serif')
      // System preset fonts should be present
      expect(fontSans).toContain(systemPreset!.fontJa)
    })
  })
})
