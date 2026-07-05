/**
 * Bug Condition Exploration Test - Settings Window Titlebar
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * This test encodes the EXPECTED (correct) behavior:
 * - The `windows` array in `src-tauri/capabilities/default.json` SHOULD include `"settings"`
 * - Without `"settings"` in the array, the settings window has no window API permissions
 *   (start-dragging, minimize, close), causing the titlebar to be non-functional
 *
 * On UNFIXED code, this test MUST FAIL — failure confirms the bug exists.
 *
 * Counterexamples to document:
 * - `default.json` windows array is `["main", "note_*", "print-preview"]` — missing `"settings"`
 * - Settings window cannot drag because `core:window:allow-start-dragging` is not granted
 * - Settings window cannot minimize because `core:window:allow-minimize` is not granted
 * - Settings window cannot close because `core:window:allow-close` is not granted
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Bug Condition Exploration: Settings Window Missing from Capabilities', () => {
  const capabilitiesPath = resolve(__dirname, '../../src-tauri/capabilities/default.json')

  function loadCapabilities(): { windows: string[]; permissions: string[] } {
    const content = readFileSync(capabilitiesPath, 'utf-8')
    return JSON.parse(content)
  }

  /**
   * Property 1: Bug Condition - "settings" SHOULD be present in windows array
   *
   * EXPECTED behavior: The `windows` array includes `"settings"` so that the
   * settings window receives all permissions (start-dragging, minimize, close).
   *
   * BUG: On unfixed code, `windows` is `["main", "note_*", "print-preview"]`
   * and does NOT include `"settings"`, so the settings window has no API permissions.
   */
  it('"settings" is present in the windows array of default.json', () => {
    const capabilities = loadCapabilities()

    // The windows array SHOULD include "settings"
    // On unfixed code, this will FAIL because windows = ["main", "note_*", "print-preview"]
    expect(capabilities.windows).toContain('settings')
  })

  it('settings window has access to start-dragging permission (via windows array membership)', () => {
    const capabilities = loadCapabilities()

    // First verify the permission exists in the permissions array
    expect(capabilities.permissions).toContain('core:window:allow-start-dragging')

    // Then verify "settings" is in the windows array (so it receives this permission)
    // On unfixed code, this FAILS because "settings" is not in windows
    expect(capabilities.windows).toContain('settings')
  })

  it('settings window has access to minimize permission (via windows array membership)', () => {
    const capabilities = loadCapabilities()

    // First verify the permission exists in the permissions array
    expect(capabilities.permissions).toContain('core:window:allow-minimize')

    // Then verify "settings" is in the windows array (so it receives this permission)
    // On unfixed code, this FAILS because "settings" is not in windows
    expect(capabilities.windows).toContain('settings')
  })

  it('settings window has access to close permission (via windows array membership)', () => {
    const capabilities = loadCapabilities()

    // First verify the permission exists in the permissions array
    expect(capabilities.permissions).toContain('core:window:allow-close')

    // Then verify "settings" is in the windows array (so it receives this permission)
    // On unfixed code, this FAILS because "settings" is not in windows
    expect(capabilities.windows).toContain('settings')
  })
})
