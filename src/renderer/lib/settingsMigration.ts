import type { RootFolderEntry } from '@/shared/types'
import { resolvePreset, DEFAULT_FONT_EN, DEFAULT_FONT_JA } from './fontManager'

/**
 * 旧形式のフォント設定（単一の fontFamily フィールド）を
 * 新形式の fontFamilyEn / fontFamilyJa へ移行する。
 *
 * - fontFamilyEn と fontFamilyJa が既に存在する場合はスキップし、
 *   レガシーの fontFamily があれば削除する
 * - レガシーの fontFamily がビルトインプリセットIDに一致する場合は
 *   resolvePreset() で En/Ja ペアに展開する
 * - 一致しない場合はデフォルト（Geist / Kosugi Maru）を適用する
 */
export function migrateFontSettings(
  settings: Record<string, unknown>
): Record<string, unknown> {
  const fontFamilyEn = settings.fontFamilyEn as string | undefined
  const fontFamilyJa = settings.fontFamilyJa as string | undefined

  // If new fields already present, skip migration
  if (fontFamilyEn && fontFamilyJa) {
    const { fontFamily, ...rest } = settings
    return rest
  }

  const legacyFontFamily = settings.fontFamily as string | undefined
  if (!legacyFontFamily) {
    // No legacy, no new — use defaults (handled by fontManager at apply time)
    return settings
  }

  // Resolve legacy preset ID to En/Ja pair
  const resolved = resolvePreset(legacyFontFamily)
  const { fontFamily, ...rest } = settings

  if (resolved) {
    return {
      ...rest,
      fontFamilyEn: resolved.fontEn,
      fontFamilyJa: resolved.fontJa,
    }
  }
  // Unknown legacy value → apply defaults
  return {
    ...rest,
    fontFamilyEn: DEFAULT_FONT_EN,
    fontFamilyJa: DEFAULT_FONT_JA,
  }
}

/**
 * 旧形式（単一の rootDir スカラー値）の設定を、複数ルートフォルダ形式
 * （rootFolders 配列 + activeRootFolder）へ変換する。
 * rootFolders が既に存在し空でない場合は新形式とみなし、変換を行わない。
 *
 * すべてのレガシーマイグレーションをパイプラインとして実行する。
 */
export function migrateLegacySettings(
  parsed: Record<string, unknown>
): Record<string, unknown> {
  const existingRootFolders = parsed.rootFolders as
    | RootFolderEntry[]
    | undefined

  let result: Record<string, unknown>

  if (Array.isArray(existingRootFolders) && existingRootFolders.length > 0) {
    result = parsed
  } else {
    const legacyRootDir = parsed.rootDir as string | undefined
    const { rootDir, lastSelectedFolder, lastOpenedNotePath, ...rest } = parsed

    if (!legacyRootDir) {
      result = { ...rest, rootFolders: existingRootFolders ?? [] }
    } else {
      const migratedEntry: RootFolderEntry = { path: legacyRootDir }
      if (typeof lastSelectedFolder === 'string') {
        migratedEntry.lastSelectedFolder = lastSelectedFolder
      }
      if (typeof lastOpenedNotePath === 'string') {
        migratedEntry.lastOpenedNotePath = lastOpenedNotePath
      }

      result = {
        ...rest,
        rootFolders: [migratedEntry],
        activeRootFolder: legacyRootDir,
      }
    }
  }

  // Compose font settings migration
  result = migrateFontSettings(result)

  return result
}
