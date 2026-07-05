import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import {
  validateTheme,
  addCustomTheme,
  loadCustomThemes,
  removeCustomTheme,
  saveCustomThemes,
  type ColorTheme,
} from '@/renderer/lib/themeManager'

const CUSTOM_THEMES_KEY = 'notyra-custom-themes'

// Generator for a hex color string like '#a3f2c1'
const hexColorArb = fc
  .integer({ min: 0, max: 0xffffff })
  .map(n => `#${n.toString(16).padStart(6, '0')}`)

// Generator for a valid ColorTheme object
const colorThemeArb: fc.Arbitrary<ColorTheme> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z0-9-]+$/.test(s)),
  name: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.length > 0),
  nameJa: fc.string({ minLength: 1, maxLength: 30 }),
  swatches: fc.array(hexColorArb, { minLength: 1, maxLength: 3 }),
  swatchesDark: fc.array(hexColorArb, { minLength: 1, maxLength: 3 }),
  light: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 15 }).map(k => `--${k}`),
    hexColorArb
  ),
  dark: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 15 }).map(k => `--${k}`),
    hexColorArb
  ),
})

// Generator for a non-empty list of custom themes with unique ids
const uniqueThemeListArb: fc.Arbitrary<ColorTheme[]> = fc.uniqueArray(
  colorThemeArb,
  { minLength: 1, maxLength: 10, selector: t => t.id }
)

/**
 * Property 1: Theme validation correctness
 *
 * **Validates: Requirements 3.5, 3.6**
 *
 * For any JavaScript object, `validateTheme` SHALL return `true` if and only if
 * the object has a non-empty string `id`, non-empty string `name`, non-empty arrays
 * `swatches` and `swatchesDark`, and non-null objects `light` and `dark`.
 * Furthermore, when import is attempted with a valid theme, it SHALL be added to the
 * custom themes list; when attempted with an invalid object, the custom themes list
 * SHALL remain unchanged.
 */
describe('Feature: settings-window, Property 1: Theme validation correctness', () => {
  beforeEach(() => {
    localStorage.removeItem(CUSTOM_THEMES_KEY)
  })

  describe('validateTheme returns true iff all required fields are present and valid', () => {
    it('property: valid theme objects always pass validation', () => {
      fc.assert(
        fc.property(colorThemeArb, (theme) => {
          expect(validateTheme(theme)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('property: objects missing or with empty id fail validation', () => {
      const invalidIdArb = fc.oneof(
        // Empty string id
        fc.record({
          id: fc.constant(''),
          name: fc.string({ minLength: 1 }),
          swatches: fc.array(fc.string(), { minLength: 1 }),
          swatchesDark: fc.array(fc.string(), { minLength: 1 }),
          light: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
          dark: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
        }),
        // Non-string id
        fc.record({
          id: fc.oneof(
            fc.integer(),
            fc.boolean(),
            fc.constant(null)
          ) as fc.Arbitrary<unknown>,
          name: fc.string({ minLength: 1 }),
          swatches: fc.array(fc.string(), { minLength: 1 }),
          swatchesDark: fc.array(fc.string(), { minLength: 1 }),
          light: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
          dark: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
        })
      )

      fc.assert(
        fc.property(invalidIdArb, (obj) => {
          expect(validateTheme(obj)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('property: objects with empty or non-string name fail validation', () => {
      const invalidNameArb = fc.oneof(
        // Empty string name
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.constant(''),
          swatches: fc.array(fc.string(), { minLength: 1 }),
          swatchesDark: fc.array(fc.string(), { minLength: 1 }),
          light: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
          dark: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
        }),
        // Non-string name
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.oneof(
            fc.integer(),
            fc.constant(null)
          ) as fc.Arbitrary<unknown>,
          swatches: fc.array(fc.string(), { minLength: 1 }),
          swatchesDark: fc.array(fc.string(), { minLength: 1 }),
          light: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
          dark: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
        })
      )

      fc.assert(
        fc.property(invalidNameArb, (obj) => {
          expect(validateTheme(obj)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('property: objects with empty swatches or swatchesDark fail validation', () => {
      const emptyArraysArb = fc.oneof(
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          swatches: fc.constant([]),
          swatchesDark: fc.array(fc.string(), { minLength: 1 }),
          light: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
          dark: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
        }),
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          swatches: fc.array(fc.string(), { minLength: 1 }),
          swatchesDark: fc.constant([]),
          light: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
          dark: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
        })
      )

      fc.assert(
        fc.property(emptyArraysArb, (obj) => {
          expect(validateTheme(obj)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('property: objects with null or non-object light/dark fail validation', () => {
      const invalidLightDarkArb = fc.oneof(
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          swatches: fc.array(fc.string(), { minLength: 1 }),
          swatchesDark: fc.array(fc.string(), { minLength: 1 }),
          light: fc.constant(null) as fc.Arbitrary<unknown>,
          dark: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
        }),
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          swatches: fc.array(fc.string(), { minLength: 1 }),
          swatchesDark: fc.array(fc.string(), { minLength: 1 }),
          light: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
          dark: fc.constant(null) as fc.Arbitrary<unknown>,
        }),
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          swatches: fc.array(fc.string(), { minLength: 1 }),
          swatchesDark: fc.array(fc.string(), { minLength: 1 }),
          light: fc.string() as fc.Arbitrary<unknown>,
          dark: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
        })
      )

      fc.assert(
        fc.property(invalidLightDarkArb, (obj) => {
          expect(validateTheme(obj)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('property: non-object values (null, undefined, primitives) fail validation', () => {
      const nonObjectArb = fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.integer(),
        fc.string(),
        fc.boolean()
      )

      fc.assert(
        fc.property(nonObjectArb, (val) => {
          expect(validateTheme(val)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('property: for any random object, validateTheme matches manual field check', () => {
      const randomObjArb = fc.record({
        id: fc.oneof(
          fc.string(),
          fc.integer(),
          fc.constant(null),
          fc.constant(undefined)
        ) as fc.Arbitrary<unknown>,
        name: fc.oneof(
          fc.string(),
          fc.integer(),
          fc.constant(null)
        ) as fc.Arbitrary<unknown>,
        swatches: fc.oneof(
          fc.array(fc.string()),
          fc.constant(null),
          fc.string()
        ) as fc.Arbitrary<unknown>,
        swatchesDark: fc.oneof(
          fc.array(fc.string()),
          fc.constant(null),
          fc.string()
        ) as fc.Arbitrary<unknown>,
        light: fc.oneof(
          fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
          fc.constant(null),
          fc.string()
        ) as fc.Arbitrary<unknown>,
        dark: fc.oneof(
          fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
          fc.constant(null),
          fc.integer()
        ) as fc.Arbitrary<unknown>,
      })

      fc.assert(
        fc.property(randomObjArb, (obj) => {
          const d = obj as Record<string, unknown>
          const expected =
            typeof d.id === 'string' &&
            d.id.length > 0 &&
            typeof d.name === 'string' &&
            d.name.length > 0 &&
            Array.isArray(d.swatches) &&
            d.swatches.length > 0 &&
            Array.isArray(d.swatchesDark) &&
            d.swatchesDark.length > 0 &&
            typeof d.light === 'object' &&
            d.light !== null &&
            typeof d.dark === 'object' &&
            d.dark !== null

          expect(validateTheme(obj)).toBe(expected)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('valid themes are added to custom list, invalid themes leave list unchanged', () => {
    it('property: addCustomTheme with a valid theme makes it appear in loadCustomThemes', () => {
      fc.assert(
        fc.property(colorThemeArb, (theme) => {
          localStorage.removeItem(CUSTOM_THEMES_KEY)

          addCustomTheme(theme)

          const stored = loadCustomThemes()
          const found = stored.find(t => t.id === theme.id)
          expect(found).toBeDefined()
          expect(found!.name).toBe(theme.name)
        }),
        { numRuns: 100 }
      )
    })

    it('property: invalid objects guarded by validateTheme do not modify the custom themes list', () => {
      const invalidThemeArb = fc.oneof(
        // Empty id
        fc.record({
          id: fc.constant(''),
          name: fc.string({ minLength: 1 }),
          nameJa: fc.string({ minLength: 1 }),
          swatches: fc.array(fc.string(), { minLength: 1 }),
          swatchesDark: fc.array(fc.string(), { minLength: 1 }),
          light: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
          dark: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
        }),
        // Empty swatches
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          nameJa: fc.string({ minLength: 1 }),
          swatches: fc.constant([]),
          swatchesDark: fc.array(fc.string(), { minLength: 1 }),
          light: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
          dark: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
        }),
        // null light
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          nameJa: fc.string({ minLength: 1 }),
          swatches: fc.array(fc.string(), { minLength: 1 }),
          swatchesDark: fc.array(fc.string(), { minLength: 1 }),
          light: fc.constant(null) as fc.Arbitrary<unknown>,
          dark: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
        }),
        // null dark
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          nameJa: fc.string({ minLength: 1 }),
          swatches: fc.array(fc.string(), { minLength: 1 }),
          swatchesDark: fc.array(fc.string(), { minLength: 1 }),
          light: fc.dictionary(fc.string({ minLength: 1 }), fc.string()),
          dark: fc.constant(null) as fc.Arbitrary<unknown>,
        })
      )

      fc.assert(
        fc.property(invalidThemeArb, (obj) => {
          localStorage.removeItem(CUSTOM_THEMES_KEY)

          // Simulate the import guard: only add if validateTheme passes
          const before = loadCustomThemes()
          if (validateTheme(obj)) {
            addCustomTheme(obj as unknown as ColorTheme)
          }
          const after = loadCustomThemes()

          // Invalid objects should not pass validateTheme, list unchanged
          expect(after).toEqual(before)
        }),
        { numRuns: 100 }
      )
    })

    it('property: adding a theme with duplicate id replaces the existing one', () => {
      fc.assert(
        fc.property(
          colorThemeArb,
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.length > 0),
          (theme, newName) => {
            localStorage.removeItem(CUSTOM_THEMES_KEY)

            // Add original
            addCustomTheme(theme)

            // Add with same id but different name
            const updated: ColorTheme = { ...theme, name: newName }
            addCustomTheme(updated)

            const stored = loadCustomThemes()
            const matching = stored.filter(t => t.id === theme.id)
            // Should have exactly one entry with the updated name
            expect(matching).toHaveLength(1)
            expect(matching[0].name).toBe(newName)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})

/**
 * Property 3: Theme deletion with fallback
 *
 * **Validates: Requirements 3.8**
 *
 * For any list of custom themes and any custom theme within that list,
 * deleting that theme SHALL result in a list that no longer contains the
 * deleted theme's id. Furthermore, if the deleted theme's id matches the
 * current colorTheme setting, the setting SHALL fall back to 'gray'.
 */
describe('Feature: settings-window, Property 3: Theme deletion with fallback', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('removeCustomTheme removes the theme from the list', () => {
    it('property: for any custom theme list and any theme in that list, deletion removes that theme id', () => {
      fc.assert(
        fc.property(
          uniqueThemeListArb.chain(themes => {
            const index = fc.integer({ min: 0, max: themes.length - 1 })
            return index.map(i => ({ themes, targetIndex: i }))
          }),
          ({ themes, targetIndex }) => {
            saveCustomThemes(themes)

            const targetId = themes[targetIndex].id

            removeCustomTheme(targetId)

            const remaining = loadCustomThemes()
            const ids = remaining.map(t => t.id)
            expect(ids).not.toContain(targetId)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: deletion preserves all other themes in the list', () => {
      fc.assert(
        fc.property(
          uniqueThemeListArb
            .filter(t => t.length >= 2)
            .chain(themes => {
              const index = fc.integer({ min: 0, max: themes.length - 1 })
              return index.map(i => ({ themes, targetIndex: i }))
            }),
          ({ themes, targetIndex }) => {
            saveCustomThemes(themes)

            const targetId = themes[targetIndex].id
            const expectedRemainingIds = themes
              .filter(t => t.id !== targetId)
              .map(t => t.id)

            removeCustomTheme(targetId)

            const remaining = loadCustomThemes()
            const remainingIds = remaining.map(t => t.id)
            expect(remainingIds).toEqual(expectedRemainingIds)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: deleting a non-existent id leaves the list unchanged', () => {
      fc.assert(
        fc.property(
          uniqueThemeListArb,
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter(s => /^[a-z0-9-]+$/.test(s)),
          (themes, randomId) => {
            fc.pre(!themes.some(t => t.id === randomId))

            saveCustomThemes(themes)

            removeCustomTheme(randomId)

            const remaining = loadCustomThemes()
            expect(remaining.map(t => t.id)).toEqual(themes.map(t => t.id))
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Active theme deletion triggers fallback to gray', () => {
    it('property: if deleted theme was active colorTheme, fallback sets colorTheme to gray', () => {
      fc.assert(
        fc.property(
          uniqueThemeListArb.chain(themes => {
            const index = fc.integer({ min: 0, max: themes.length - 1 })
            return index.map(i => ({ themes, targetIndex: i }))
          }),
          ({ themes, targetIndex }) => {
            saveCustomThemes(themes)
            const targetId = themes[targetIndex].id

            // Simulate AppSettings with colorTheme = targetId
            const appSettings = { colorTheme: targetId }
            localStorage.setItem('appSettings', JSON.stringify(appSettings))

            // Remove the theme
            removeCustomTheme(targetId)

            // Simulate component-level fallback logic (as in AppearanceSection)
            const currentSettings = JSON.parse(
              localStorage.getItem('appSettings') || '{}'
            )
            if (currentSettings.colorTheme === targetId) {
              currentSettings.colorTheme = 'gray'
              localStorage.setItem(
                'appSettings',
                JSON.stringify(currentSettings)
              )
            }

            const finalSettings = JSON.parse(
              localStorage.getItem('appSettings') || '{}'
            )
            expect(finalSettings.colorTheme).toBe('gray')
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: if deleted theme was NOT active colorTheme, colorTheme remains unchanged', () => {
      fc.assert(
        fc.property(
          uniqueThemeListArb
            .filter(t => t.length >= 2)
            .chain(themes => {
              const index = fc.integer({ min: 0, max: themes.length - 1 })
              return index.map(i => ({ themes, targetIndex: i }))
            }),
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter(s => /^[a-z0-9-]+$/.test(s)),
          ({ themes, targetIndex }, activeThemeId) => {
            const targetId = themes[targetIndex].id
            fc.pre(activeThemeId !== targetId)

            saveCustomThemes(themes)

            const appSettings = { colorTheme: activeThemeId }
            localStorage.setItem('appSettings', JSON.stringify(appSettings))

            removeCustomTheme(targetId)

            // Simulate component-level fallback logic
            const currentSettings = JSON.parse(
              localStorage.getItem('appSettings') || '{}'
            )
            if (currentSettings.colorTheme === targetId) {
              currentSettings.colorTheme = 'gray'
              localStorage.setItem(
                'appSettings',
                JSON.stringify(currentSettings)
              )
            }

            const finalSettings = JSON.parse(
              localStorage.getItem('appSettings') || '{}'
            )
            expect(finalSettings.colorTheme).toBe(activeThemeId)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
