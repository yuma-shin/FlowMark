/**
 * Bug Condition Exploration Test - Font Selector Preview
 *
 * **Validates: Requirements 1.1, 1.2, 1.3**
 *
 * This test encodes the EXPECTED (correct) behavior:
 * - Bug 1: Each FontOptionItem displays its font name as text content (not sample text)
 * - Bug 2: LanguageFontSection shows distinct text per font (not the same sample for all)
 *
 * On UNFIXED code, these tests MUST FAIL — failure confirms the bug exists.
 *
 * Counterexamples to document:
 * - "FontOptionItem displays 'The quick brown fox' instead of 'Inter'"
 * - "All font options show identical sample text"
 * - "h1 font-family shows system font stack instead of selected font"
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanup, screen, fireEvent, within } from '@testing-library/react'
import { renderWithProviders } from '../../helpers/test-app-provider'
import { FontFamilySelector } from '@/renderer/components/FontFamilySelector'
import { builtinEnglishFonts, builtinJapaneseFonts } from '@/renderer/lib/fontManager'

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

describe('Bug Condition Exploration: Font Option Preview Shows Fixed Sample Text Instead of Font Name', () => {
  afterEach(() => {
    cleanup()
  })

  /**
   * Property 1: Bug Condition - FontOptionItem displays fontName as text
   *
   * EXPECTED behavior: When FontOptionItem renders with fontName="Inter",
   * the visible text content should be "Inter" (the font name itself).
   *
   * BUG: On unfixed code, FontOptionItem renders sampleText ("The quick brown fox")
   * instead of fontName.
   */
  it('FontOptionItem renders fontName as text content, not sampleText (Bug 1 - English)', () => {
    renderWithProviders(<FontFamilySelector />, {
      settings: { fontFamilyEn: 'Geist', fontFamilyJa: 'Kosugi Maru' },
    })

    // Open the popover
    fireEvent.click(screen.getByRole('button', { name: /font/i }))

    // Get all option items in the English section
    // Each built-in English font should display its own name as text
    for (const fontName of builtinEnglishFonts) {
      // The font name should appear as text content in an option item
      // On unfixed code, this will fail because all items show "The quick brown fox"
      const fontElements = screen.getAllByRole('option')
      const matchingOption = fontElements.find(el => {
        const span = el.querySelector('span[style]')
        return span?.textContent === fontName
      })

      expect(matchingOption).toBeDefined()
    }
  })

  it('FontOptionItem renders fontName as text content, not sampleText (Bug 1 - Japanese)', () => {
    renderWithProviders(<FontFamilySelector />, {
      settings: { fontFamilyEn: 'Geist', fontFamilyJa: 'Kosugi Maru' },
    })

    // Open the popover
    fireEvent.click(screen.getByRole('button', { name: /font/i }))

    // Each built-in Japanese font should display its own name as text
    for (const fontName of builtinJapaneseFonts) {
      const fontElements = screen.getAllByRole('option')
      const matchingOption = fontElements.find(el => {
        const span = el.querySelector('span[style]')
        return span?.textContent === fontName
      })

      expect(matchingOption).toBeDefined()
    }
  })

  /**
   * Property 1 (cont.): Bug Condition - All font options show distinct text
   *
   * EXPECTED behavior: Each font option shows different text (its own name).
   *
   * BUG: On unfixed code, all English options show "The quick brown fox"
   * and all Japanese options show "あいうえお漢字".
   */
  it('LanguageFontSection shows distinct text per font, not identical sample text for all (Bug 1)', () => {
    renderWithProviders(<FontFamilySelector />, {
      settings: { fontFamilyEn: 'Geist', fontFamilyJa: 'Kosugi Maru' },
    })

    // Open the popover
    fireEvent.click(screen.getByRole('button', { name: /font/i }))

    // Get all styled spans within option items (these display the font preview text)
    const allOptions = screen.getAllByRole('option')
    const styledSpans = allOptions
      .map(opt => opt.querySelector('span[style]'))
      .filter((span): span is HTMLSpanElement => span !== null)

    // Collect text content from styled spans in the English section
    // (styled spans that have fontFamily containing known English fonts)
    const englishTexts = styledSpans
      .filter(span => {
        const style = span.getAttribute('style') || ''
        return builtinEnglishFonts.some(font => style.includes(font))
      })
      .map(span => span.textContent)

    // On unfixed code, all texts will be "The quick brown fox" (all identical)
    // On fixed code, each will be a unique font name
    const uniqueTexts = new Set(englishTexts)

    // There should be as many unique texts as there are English built-in fonts
    // This fails on unfixed code because all show the same sample text
    expect(uniqueTexts.size).toBeGreaterThan(1)
    expect(uniqueTexts.size).toBe(englishTexts.length)
  })

  /**
   * Bug Condition - Specific concrete case per task spec
   *
   * Render FontFamilySelector, find the "Inter" font option item,
   * and verify its text content equals "Inter" (not "The quick brown fox").
   */
  it('FontOptionItem with fontName="Inter" displays "Inter" as text, not sample text', () => {
    renderWithProviders(<FontFamilySelector />, {
      settings: { fontFamilyEn: 'Inter', fontFamilyJa: 'Noto Sans JP' },
    })

    // Open the popover
    fireEvent.click(screen.getByRole('button', { name: /font/i }))

    // Find the option item that has Inter in its inline style fontFamily
    const allOptions = screen.getAllByRole('option')
    const interOption = allOptions.find(el => {
      const span = el.querySelector('span[style]')
      if (!span) return false
      const style = span.getAttribute('style') || ''
      return style.includes('"Inter"')
    })

    expect(interOption).toBeDefined()

    // The text content of the styled span should be "Inter" (the font name)
    // On unfixed code, this will be "The quick brown fox"
    const styledSpan = interOption!.querySelector('span[style]')
    expect(styledSpan?.textContent).toBe('Inter')
  })

  /**
   * Bug 2: Heading font-family - CSS override check
   *
   * Note: jsdom does not compute CSS specificity/cascade. This test documents
   * the bug condition by verifying the CSS structure. The actual rendering
   * behavior is a CSS specificity issue where github-markdown-css overrides
   * the heading font-family.
   *
   * This test verifies that heading elements within .markdown-body[data-color-mode]
   * would have font-family: inherit set (which on unfixed code they don't).
   */
  it('documents heading font-family bug: h1-h6 should inherit from --font-sans (Bug 2)', () => {
    // Create a style element simulating the globals.css heading overrides
    // On unfixed code, the heading rules do NOT include font-family: inherit
    const styleEl = document.createElement('style')
    styleEl.textContent = `
      .markdown-body[data-color-mode] {
        font-family: var(--font-sans) !important;
      }
    `
    document.head.appendChild(styleEl)

    // Set --font-sans to a known value
    document.documentElement.style.setProperty('--font-sans', '"Inter", "Noto Sans JP", sans-serif')

    // Create a markdown-body container with headings
    const container = document.createElement('div')
    container.className = 'markdown-body'
    container.setAttribute('data-color-mode', 'light')
    container.innerHTML = `
      <h1>Heading 1</h1>
      <h2>Heading 2</h2>
      <h3>Heading 3</h3>
      <h4>Heading 4</h4>
      <h5>Heading 5</h5>
      <h6>Heading 6</h6>
    `
    document.body.appendChild(container)

    // In a real browser with github-markdown-css loaded, headings would have
    // font-family set to system fonts. After fix, they should inherit.
    // In jsdom we can check the computed style after applying our CSS.
    const h1 = container.querySelector('h1')!
    const computedStyle = window.getComputedStyle(h1)

    // On unfixed code, headings don't have font-family: inherit in globals.css,
    // so github-markdown-css's font-family wins.
    // This test asserts the expected behavior: heading font-family should
    // start with the selected font (Inter).
    //
    // Note: jsdom doesn't fully compute CSS cascade, so we verify the
    // structural expectation. The real validation is that globals.css
    // heading rules include `font-family: inherit`.
    // We'll read globals.css content to verify the rule exists.

    // Cleanup
    document.head.removeChild(styleEl)
    document.body.removeChild(container)
    document.documentElement.style.removeProperty('--font-sans')

    // The real assertion: check that globals.css contains font-family: inherit for headings
    // This is a structural check that will fail on unfixed code
    // We import and check the CSS file content indirectly via a snapshot of the rules
    expect(assertGlobalsCssHasHeadingFontInherit()).toBe(true)
  })
})

/**
 * Helper: Check if globals.css heading overrides include font-family: inherit.
 * On unfixed code, this returns false (bug exists).
 * On fixed code, this returns true (bug is resolved).
 */
function assertGlobalsCssHasHeadingFontInherit(): boolean {
  // Read the actual globals.css file content to verify the heading rules.
  // jsdom doesn't load CSS files, so we read the source directly.
  const fs = require('fs')
  const path = require('path')
  const cssPath = path.resolve(__dirname, '../../../src/renderer/globals.css')

  try {
    const cssContent = fs.readFileSync(cssPath, 'utf-8')
    // Check that h1 heading rules include font-family: inherit
    // Pattern: .markdown-body[data-color-mode] h1 { ... font-family: inherit ... }
    const h1RuleMatch = cssContent.match(
      /\.markdown-body\[data-color-mode\]\s+h1\s*\{[^}]*font-family:\s*inherit[^}]*\}/s
    )
    return h1RuleMatch !== null
  } catch {
    return false
  }
}
