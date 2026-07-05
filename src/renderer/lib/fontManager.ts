export interface FontOption {
  id: string
  name: string
  nameJa: string
  /** CSS font-family value (English font) */
  fontEn: string
  /** CSS font-family value (Japanese font) */
  fontJa: string
}

/** Built-in font presets */
export const builtinFonts: FontOption[] = [
  {
    id: 'geist-kosugi',
    name: 'Geist + Kosugi Maru',
    nameJa: 'Geist + 小杉丸ゴシック',
    fontEn: '"Geist"',
    fontJa: '"Kosugi Maru"',
  },
  {
    id: 'inter-noto',
    name: 'Inter + Noto Sans JP',
    nameJa: 'Inter + Noto Sans JP',
    fontEn: '"Inter"',
    fontJa: '"Noto Sans JP"',
  },
  {
    id: 'geist-mplus',
    name: 'Geist + M PLUS Rounded 1c',
    nameJa: 'Geist + M PLUS Rounded 1c',
    fontEn: '"Geist"',
    fontJa: '"M PLUS Rounded 1c"',
  },
  {
    id: 'system',
    name: 'System Default',
    nameJa: 'システムデフォルト',
    fontEn: '-apple-system, BlinkMacSystemFont, "Segoe UI"',
    fontJa: '"Yu Gothic UI", "Hiragino Kaku Gothic ProN", "Meiryo"',
  },
]

export const DEFAULT_FONT_ID = 'geist-kosugi'
export const DEFAULT_FONT_EN = 'Geist'
export const DEFAULT_FONT_JA = 'Kosugi Maru'

/** Shared font family name used in @font-face declarations for unicode-range separation */
export const SHARED_FONT_FAMILY = 'NotyraSans'

/** Unicode range for Latin/Basic characters (English font) */
export const UNICODE_RANGE_LATIN =
  'U+0000-007F, U+0080-00FF, U+0100-024F, U+2000-206F, U+2070-209F'

/** Unicode range for CJK/Kana characters (Japanese font) - kept for backward compatibility */
export const UNICODE_RANGE_CJK =
  'U+3000-303F, U+3040-309F, U+30A0-30FF, U+4E00-9FFF, U+3400-4DBF, U+FF00-FFEF, U+F900-FAFF'

/**
 * Build CSS font-family value for --font-sans.
 *
 * Uses direct font-family stacking: the English font is listed first,
 * followed by the Japanese font, then sans-serif fallback.
 * The browser's font matching naturally handles the separation:
 * - Characters present in the English font render with it
 * - Characters NOT in the English font (e.g. CJK) fall through to the Japanese font
 *
 * NOTE: The previous approach used @font-face with src: local() and unicode-range,
 * but local() only resolves OS-installed fonts — it cannot reference web fonts
 * loaded via <link> (e.g. Google Fonts). Since the app loads fonts via Google Fonts,
 * that approach silently failed, causing Japanese text to fall back to sans-serif.
 */
export function buildFontSansValue(fontEn: string, fontJa: string): string {
  const en = fontEn.includes(' ') ? `"${fontEn}"` : fontEn
  const ja = fontJa.includes(' ') ? `"${fontJa}"` : fontJa
  return `${en}, ${ja}, sans-serif`
}

/**
 * Generate @font-face CSS declarations with unicode-range separation.
 *
 * @deprecated This function uses src: local() which only works for OS-installed fonts,
 * not for web fonts loaded via Google Fonts <link> tag. Use buildFontSansValue() instead
 * for direct font-family stacking which works correctly with web fonts.
 *
 * Kept for backward compatibility with tests; no longer used in production code path.
 */
export function generateFontFaceDeclarations(
  fontEn: string,
  fontJa: string
): string {
  return `
@font-face {
  font-family: "${SHARED_FONT_FAMILY}";
  src: local("${fontEn}");
  unicode-range: ${UNICODE_RANGE_LATIN};
}
@font-face {
  font-family: "${SHARED_FONT_FAMILY}";
  src: local("${fontJa}");
}`.trim()
}

/** Built-in English font names extracted from presets */
export const builtinEnglishFonts: string[] = [
  ...new Set(
    builtinFonts
      .map(f => f.fontEn.replace(/"/g, ''))
      .filter(name => !name.includes(','))
  ),
]

/** Built-in Japanese font names extracted from presets */
export const builtinJapaneseFonts: string[] = [
  ...new Set(
    builtinFonts
      .map(f => f.fontJa.replace(/"/g, ''))
      .filter(name => !name.includes(','))
  ),
]

/**
 * Build a CSS font-family string from a FontOption (legacy single-argument version).
 * @deprecated Use the two-argument buildFontFamilyValue(fontEn, fontJa) instead.
 */
export function buildFontFamilyValueFromOption(font: FontOption): string {
  return `${font.fontEn}, ${font.fontJa}, sans-serif`
}

/** Build CSS font-family string from separate En/Ja identifiers */
export function buildFontFamilyValue(fontEn: string, fontJa: string): string {
  const en = fontEn.includes(' ') ? `"${fontEn}"` : fontEn
  const ja = fontJa.includes(' ') ? `"${fontJa}"` : fontJa
  return `${en}, ${ja}, sans-serif`
}

/** Apply per-language font settings to the document root */
export function applyFontPerLanguage(
  fontEn: string | undefined,
  fontJa: string | undefined
): void {
  const en = fontEn || DEFAULT_FONT_EN
  const ja = fontJa || DEFAULT_FONT_JA

  // Remove legacy @font-face style element if it exists (from previous local()-based approach)
  const legacyStyle = document.getElementById('notyra-font-faces')
  if (legacyStyle) {
    legacyStyle.remove()
  }

  // Set --font-sans directly with font-family stacking.
  // The browser naturally handles the cascade:
  // - Characters present in the English font render with it
  // - Characters NOT in the English font (CJK/Kana) fall through to the Japanese font
  // - Anything else falls through to sans-serif
  const fontSansValue = buildFontSansValue(en, ja)
  document.documentElement.style.setProperty('--font-sans', fontSansValue)
}

/** Resolve a built-in preset ID to its En/Ja pair */
export function resolvePreset(
  presetId: string
): { fontEn: string; fontJa: string } | null {
  const preset = builtinFonts.find(f => f.id === presetId)
  if (!preset) return null
  return {
    fontEn: preset.fontEn.replace(/"/g, ''),
    fontJa: preset.fontJa.replace(/"/g, ''),
  }
}

/**
 * Apply the selected font to the document root (legacy version).
 * @deprecated Use applyFontPerLanguage(fontEn, fontJa) instead.
 */
export function applyFont(fontId: string | undefined): void {
  const defaultFont = builtinFonts.find(f => f.id === DEFAULT_FONT_ID)
  if (!defaultFont) {
    throw new Error(
      `Default font "${DEFAULT_FONT_ID}" not found in builtinFonts`
    )
  }
  const font = builtinFonts.find(f => f.id === fontId) ?? defaultFont
  const value = buildFontFamilyValueFromOption(font)
  document.documentElement.style.setProperty('--font-sans', value)
}

/** Get display name based on locale */
export function getFontName(font: FontOption, lang: string): string {
  if (lang === 'ja') return font.nameJa
  return font.name
}
