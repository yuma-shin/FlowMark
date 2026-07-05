import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { AppProvider, useApp } from '@/renderer/contexts/AppContext'
import type { AppSettings } from '@/shared/types'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AppProvider, null, children)
}

const APP_SETTINGS_KEY = 'appSettings'

// Default settings (mirrors AppContext's defaultSettings)
const defaultSettings: AppSettings = {
  rootFolders: [],
  editorLayoutMode: 'split',
  theme: 'system',
  colorTheme: 'gray',
  language: 'en',
  showSidebar: true,
  showNoteList: true,
}

// Lightweight generators (avoid expensive regex-based arbitraries)
const editorLayoutModeArb = fc.constantFrom(
  'editor' as const,
  'preview' as const,
  'split' as const
)

const themeArb = fc.constantFrom(
  'light' as const,
  'dark' as const,
  'system' as const
)

const languageArb = fc.constantFrom('en' as const, 'ja' as const)

const colorThemeArb = fc.constantFrom('gray', 'blue', 'red', 'green', 'orange', 'purple', 'custom-1')

const fontFamilyArb = fc.constantFrom('Geist', 'Inter', 'Kosugi Maru', 'Noto Sans JP', 'M PLUS Rounded 1c')

const appSettingsArb = fc.record({
  rootFolders: fc.constant([]),
  editorLayoutMode: editorLayoutModeArb,
  theme: themeArb,
  colorTheme: colorThemeArb,
  language: languageArb,
  fontFamilyEn: fc.oneof(fc.constant(undefined), fontFamilyArb),
  fontFamilyJa: fc.oneof(fc.constant(undefined), fontFamilyArb),
  showSidebar: fc.oneof(fc.constant(undefined), fc.boolean()),
  showNoteList: fc.oneof(fc.constant(undefined), fc.boolean()),
  sidebarWidth: fc.oneof(fc.constant(undefined), fc.integer({ min: 100, max: 600 })),
  noteListWidth: fc.oneof(fc.constant(undefined), fc.integer({ min: 100, max: 600 })),
})

// Generator for a partial AppSettings with only defined values (no undefined keys)
// This avoids the JSON.stringify issue where undefined values are dropped
const partialAppSettingsArb: fc.Arbitrary<Partial<AppSettings>> = fc
  .record(
    {
      rootFolders: fc.array(
        fc.record({
          path: fc.constantFrom('/notes', '/docs', '/projects', '/archive'),
        }),
        { minLength: 0, maxLength: 2 }
      ),
      editorLayoutMode: editorLayoutModeArb,
      theme: themeArb,
      colorTheme: colorThemeArb,
      language: languageArb,
      fontFamilyEn: fontFamilyArb,
      fontFamilyJa: fontFamilyArb,
      showSidebar: fc.boolean(),
      showNoteList: fc.boolean(),
      sidebarWidth: fc.integer({ min: 100, max: 600 }),
      noteListWidth: fc.integer({ min: 100, max: 600 }),
    },
    { requiredKeys: [] }
  )
  .map(obj => {
    // Remove keys that are undefined to get a clean partial object
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = value
      }
    }
    return result as Partial<AppSettings>
  })

/**
 * Property 4: Settings persistence round-trip
 *
 * **Validates: Requirements 6.1**
 *
 * For any valid partial AppSettings object passed to updateSettings, the resulting
 * localStorage.getItem('appSettings') SHALL be a JSON string that, when parsed,
 * contains all the updated keys merged with the previous settings.
 */
describe('Feature: settings-window, Property 4: Settings persistence round-trip', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('updateSettings persists merged settings to localStorage', () => {
    it('property: calling updateSettings with partial settings merges with defaults and persists to localStorage', () => {
      fc.assert(
        fc.property(partialAppSettingsArb, (partialSettings) => {
          localStorage.clear()

          const { result, unmount } = renderHook(() => useApp(), { wrapper })

          act(() => {
            result.current.updateSettings(partialSettings)
          })

          // Read what was stored in localStorage
          const stored = localStorage.getItem(APP_SETTINGS_KEY)
          expect(stored).not.toBeNull()

          const parsed = JSON.parse(stored!)

          // Verify all updated keys are present in the stored value
          for (const [key, value] of Object.entries(partialSettings)) {
            expect(parsed[key]).toEqual(value)
          }

          // Verify default settings are preserved for keys not in the partial update
          for (const [key, value] of Object.entries(defaultSettings)) {
            if (!(key in partialSettings)) {
              expect(parsed[key]).toEqual(value)
            }
          }

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('property: sequential updateSettings calls merge correctly with accumulated state', () => {
      fc.assert(
        fc.property(
          partialAppSettingsArb,
          partialAppSettingsArb,
          (firstUpdate, secondUpdate) => {
            localStorage.clear()

            const { result, unmount } = renderHook(() => useApp(), { wrapper })

            act(() => {
              result.current.updateSettings(firstUpdate)
            })

            act(() => {
              result.current.updateSettings(secondUpdate)
            })

            const stored = localStorage.getItem(APP_SETTINGS_KEY)
            expect(stored).not.toBeNull()

            const parsed = JSON.parse(stored!)

            // Compute the expected merged result:
            // defaults -> firstUpdate -> secondUpdate (spread semantics)
            const expected = { ...defaultSettings, ...firstUpdate, ...secondUpdate }

            // Verify all defined keys in the expected result match stored JSON
            for (const [key, value] of Object.entries(expected)) {
              if (value !== undefined) {
                expect(parsed[key]).toEqual(value)
              }
            }

            unmount()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('property: stored JSON is valid and round-trips through parse/stringify', () => {
      fc.assert(
        fc.property(partialAppSettingsArb, (partialSettings) => {
          localStorage.clear()

          const { result, unmount } = renderHook(() => useApp(), { wrapper })

          act(() => {
            result.current.updateSettings(partialSettings)
          })

          const stored = localStorage.getItem(APP_SETTINGS_KEY)
          expect(stored).not.toBeNull()

          // Verify it's valid JSON that can be parsed and re-serialized identically
          const parsed = JSON.parse(stored!)
          const reSerialized = JSON.stringify(parsed)
          expect(JSON.parse(reSerialized)).toEqual(parsed)

          unmount()
        }),
        { numRuns: 100 }
      )
    })

    it('property: updateSettings with empty object preserves all existing settings', () => {
      fc.assert(
        fc.property(partialAppSettingsArb, (initialUpdate) => {
          localStorage.clear()

          const { result, unmount } = renderHook(() => useApp(), { wrapper })

          act(() => {
            result.current.updateSettings(initialUpdate)
          })

          const beforeEmpty = localStorage.getItem(APP_SETTINGS_KEY)

          act(() => {
            result.current.updateSettings({})
          })

          const afterEmpty = localStorage.getItem(APP_SETTINGS_KEY)
          expect(afterEmpty).toBe(beforeEmpty)

          unmount()
        }),
        { numRuns: 100 }
      )
    })
  })
})

/**
 * Property 5: Cross-window settings sync via StorageEvent
 *
 * **Validates: Requirements 6.2**
 *
 * For any valid AppSettings JSON string dispatched as a StorageEvent with
 * key 'appSettings', the AppContext state SHALL reflect the parsed settings
 * values within a single React re-render cycle.
 */
describe('Feature: settings-window, Property 5: Cross-window settings sync via StorageEvent', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('property: dispatching StorageEvent with valid AppSettings JSON updates context state', () => {
    localStorage.clear()
    const { result } = renderHook(() => useApp(), { wrapper })

    // Generate 100 test cases and verify each using the same hook
    fc.assert(
      fc.property(appSettingsArb, (settings) => {
        // Remove undefined keys for the JSON payload
        const settingsPayload = Object.fromEntries(
          Object.entries(settings).filter(([, v]) => v !== undefined)
        )

        act(() => {
          window.dispatchEvent(
            new StorageEvent('storage', {
              key: 'appSettings',
              newValue: JSON.stringify(settingsPayload),
              storageArea: localStorage,
            })
          )
        })

        // The context merges dispatched settings with defaults
        const expected = { ...defaultSettings, ...settingsPayload }

        expect(result.current.settings.editorLayoutMode).toBe(expected.editorLayoutMode)
        expect(result.current.settings.theme).toBe(expected.theme)
        expect(result.current.settings.colorTheme).toBe(expected.colorTheme)
        expect(result.current.settings.language).toBe(expected.language)
        expect(result.current.settings.showSidebar).toBe(expected.showSidebar)
        expect(result.current.settings.showNoteList).toBe(expected.showNoteList)

        // Optional fields
        if (settingsPayload.fontFamilyEn !== undefined) {
          expect(result.current.settings.fontFamilyEn).toBe(expected.fontFamilyEn)
        }
        if (settingsPayload.fontFamilyJa !== undefined) {
          expect(result.current.settings.fontFamilyJa).toBe(expected.fontFamilyJa)
        }
        if (settingsPayload.sidebarWidth !== undefined) {
          expect(result.current.settings.sidebarWidth).toBe(expected.sidebarWidth)
        }
        if (settingsPayload.noteListWidth !== undefined) {
          expect(result.current.settings.noteListWidth).toBe(expected.noteListWidth)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('property: StorageEvent with non-appSettings key does not change context state', () => {
    localStorage.clear()
    const { result } = renderHook(() => useApp(), { wrapper })

    fc.assert(
      fc.property(
        appSettingsArb,
        fc.constantFrom('otherKey', 'theme', 'config', 'notes', 'prefs'),
        (settings, key) => {
          // Capture current state before event
          const settingsBefore = { ...result.current.settings }

          act(() => {
            window.dispatchEvent(
              new StorageEvent('storage', {
                key,
                newValue: JSON.stringify(settings),
                storageArea: localStorage,
              })
            )
          })

          // Settings should remain unchanged
          expect(result.current.settings).toEqual(settingsBefore)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: StorageEvent with null newValue does not change context state', () => {
    localStorage.clear()
    const { result } = renderHook(() => useApp(), { wrapper })

    fc.assert(
      fc.property(appSettingsArb, (settings) => {
        // First set state to a known value via valid event
        const payload = Object.fromEntries(
          Object.entries(settings).filter(([, v]) => v !== undefined)
        )

        act(() => {
          window.dispatchEvent(
            new StorageEvent('storage', {
              key: 'appSettings',
              newValue: JSON.stringify(payload),
              storageArea: localStorage,
            })
          )
        })

        const settingsAfterApply = { ...result.current.settings }

        // Dispatch event with null newValue — should be ignored
        act(() => {
          window.dispatchEvent(
            new StorageEvent('storage', {
              key: 'appSettings',
              newValue: null,
              storageArea: localStorage,
            })
          )
        })

        // Settings should remain unchanged
        expect(result.current.settings).toEqual(settingsAfterApply)
      }),
      { numRuns: 100 }
    )
  })

  it('property: multiple sequential StorageEvents result in state reflecting the last event', () => {
    localStorage.clear()
    const { result } = renderHook(() => useApp(), { wrapper })

    fc.assert(
      fc.property(
        fc.tuple(appSettingsArb, appSettingsArb),
        ([settings1, settings2]) => {
          const payload1 = Object.fromEntries(
            Object.entries(settings1).filter(([, v]) => v !== undefined)
          )
          const payload2 = Object.fromEntries(
            Object.entries(settings2).filter(([, v]) => v !== undefined)
          )

          act(() => {
            window.dispatchEvent(
              new StorageEvent('storage', {
                key: 'appSettings',
                newValue: JSON.stringify(payload1),
                storageArea: localStorage,
              })
            )
            window.dispatchEvent(
              new StorageEvent('storage', {
                key: 'appSettings',
                newValue: JSON.stringify(payload2),
                storageArea: localStorage,
              })
            )
          })

          // State should reflect the last dispatched settings merged with defaults
          const expected = { ...defaultSettings, ...payload2 }

          expect(result.current.settings.editorLayoutMode).toBe(expected.editorLayoutMode)
          expect(result.current.settings.theme).toBe(expected.theme)
          expect(result.current.settings.colorTheme).toBe(expected.colorTheme)
          expect(result.current.settings.language).toBe(expected.language)
        }
      ),
      { numRuns: 100 }
    )
  })
})
