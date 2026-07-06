import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * Bug Condition Exploration Test: ビルトインフォントがGoogle Fonts CDNリンクに依存している
 *
 * This test encodes the EXPECTED (correct) behavior after the fix is applied.
 * On UNFIXED code, this test is EXPECTED TO FAIL, confirming the bug exists.
 *
 * Bug: パッケージ化後のTauriアプリで、CSPがGoogle Fonts CDNへの外部リクエストを
 * ブロックし、ビルトインフォント（Geist, Inter, Kosugi Maru, Noto Sans JP, M PLUS Rounded 1c）
 * が読み込めない。
 *
 * Root Cause: index.html が外部CDN（fonts.googleapis.com）からフォントを読み込んでおり、
 * ローカルの@font-face宣言が存在しない。CSPに font-src 'self' もない。
 *
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
 */
describe('Bug Condition: ビルトインフォントがローカルバンドルから読み込まれること', () => {
  const projectRoot = path.resolve(__dirname, '../../..')
  const indexHtmlPath = path.join(projectRoot, 'src/renderer/index.html')
  const fontsCssPath = path.join(projectRoot, 'src/renderer/assets/fonts/fonts.css')
  const globalsCssPath = path.join(projectRoot, 'src/renderer/globals.css')
  const tauriConfPath = path.join(projectRoot, 'src-tauri/tauri.conf.json')

  const builtinFonts = ['Geist', 'Inter', 'Kosugi Maru', 'Noto Sans JP', 'M PLUS Rounded 1c']

  describe('index.html does NOT contain Google Fonts CDN links', () => {
    it('should not have any preconnect links to fonts.googleapis.com', () => {
      const html = fs.readFileSync(indexHtmlPath, 'utf-8')
      expect(html).not.toContain('fonts.googleapis.com')
    })

    it('should not have any preconnect links to fonts.gstatic.com', () => {
      const html = fs.readFileSync(indexHtmlPath, 'utf-8')
      expect(html).not.toContain('fonts.gstatic.com')
    })

    it('should not contain any external stylesheet link for fonts', () => {
      const html = fs.readFileSync(indexHtmlPath, 'utf-8')
      // Match <link> tags with Google Fonts URLs
      const googleFontsLinkPattern = /<link[^>]*href="https:\/\/fonts\.googleapis\.com[^"]*"[^>]*>/
      expect(html).not.toMatch(googleFontsLinkPattern)
    })
  })

  describe('fonts.css exists with valid @font-face declarations', () => {
    it('fonts.css file should exist at src/renderer/assets/fonts/fonts.css', () => {
      expect(fs.existsSync(fontsCssPath)).toBe(true)
    })

    it.each(builtinFonts)(
      'should contain @font-face declaration for "%s"',
      (fontName) => {
        const css = fs.readFileSync(fontsCssPath, 'utf-8')
        // @font-face with font-family matching the builtin font name
        expect(css).toContain(`font-family: "${fontName}"`)
      }
    )

    it('should use font-display: swap for all declarations', () => {
      const css = fs.readFileSync(fontsCssPath, 'utf-8')
      // Every @font-face should have font-display: swap
      const fontFaceBlocks = css.match(/@font-face\s*\{[^}]+\}/g) || []
      expect(fontFaceBlocks.length).toBeGreaterThan(0)
      for (const block of fontFaceBlocks) {
        expect(block).toContain('font-display: swap')
      }
    })

    it('should reference local woff2 files (not external URLs)', () => {
      const css = fs.readFileSync(fontsCssPath, 'utf-8')
      // src should use local file references, not external CDN URLs
      expect(css).not.toContain('fonts.googleapis.com')
      expect(css).not.toContain('fonts.gstatic.com')
      // Should contain local url() references to .woff2 files
      expect(css).toMatch(/url\("[^"]*\.woff2"\)/)
    })
  })

  describe('globals.css imports fonts.css', () => {
    it('should import fonts.css before other imports', () => {
      const css = fs.readFileSync(globalsCssPath, 'utf-8')
      expect(css).toContain('@import "./assets/fonts/fonts.css"')
    })

    it('fonts.css import should come before tailwindcss import', () => {
      const css = fs.readFileSync(globalsCssPath, 'utf-8')
      const fontsImportIndex = css.indexOf('@import "./assets/fonts/fonts.css"')
      const tailwindImportIndex = css.indexOf('@import "tailwindcss"')
      expect(fontsImportIndex).toBeGreaterThanOrEqual(0)
      expect(tailwindImportIndex).toBeGreaterThanOrEqual(0)
      expect(fontsImportIndex).toBeLessThan(tailwindImportIndex)
    })
  })

  describe('CSP includes font-src self', () => {
    it('tauri.conf.json CSP should include font-src directive allowing self', () => {
      const conf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf-8'))
      const csp: string = conf.app.security.csp
      expect(csp).toContain("font-src 'self'")
    })
  })
})
