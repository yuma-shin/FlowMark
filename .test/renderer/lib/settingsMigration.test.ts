import { describe, it, expect } from 'vitest'
import {
  migrateLegacySettings,
  migrateFontSettings,
} from '@/renderer/lib/settingsMigration'

describe('migrateLegacySettings', () => {
  it('旧形式（単一rootDirのみ）を rootFolders 配列へ変換する', () => {
    const result = migrateLegacySettings({
      theme: 'dark',
      rootDir: '/notes',
      lastSelectedFolder: 'sub',
      lastOpenedNotePath: '/notes/sub/a.md',
    })

    expect(result.rootFolders).toEqual([
      {
        path: '/notes',
        lastSelectedFolder: 'sub',
        lastOpenedNotePath: '/notes/sub/a.md',
      },
    ])
    expect(result.activeRootFolder).toBe('/notes')
    expect(result.rootDir).toBeUndefined()
    expect(result.lastSelectedFolder).toBeUndefined()
    expect(result.lastOpenedNotePath).toBeUndefined()
    expect(result.theme).toBe('dark')
  })

  it('旧形式のper-rootメタデータが無い場合も先頭要素として移行する', () => {
    const result = migrateLegacySettings({ rootDir: '/notes' })

    expect(result.rootFolders).toEqual([{ path: '/notes' }])
    expect(result.activeRootFolder).toBe('/notes')
  })

  it('新形式（rootFoldersが既に存在し空でない）の場合は移行をスキップする', () => {
    const existing = {
      rootFolders: [{ path: '/a' }, { path: '/b' }],
      activeRootFolder: '/b',
      rootDir: '/legacy-should-be-ignored',
    }

    const result = migrateLegacySettings(existing)

    expect(result.rootFolders).toEqual([{ path: '/a' }, { path: '/b' }])
    expect(result.activeRootFolder).toBe('/b')
  })

  it('rootDirもrootFoldersも無い場合は空配列を設定する', () => {
    const result = migrateLegacySettings({ theme: 'light' })

    expect(result.rootFolders).toEqual([])
    expect(result.activeRootFolder).toBeUndefined()
  })

  it('rootFoldersが空配列の場合は旧rootDirからの移行を行う', () => {
    const result = migrateLegacySettings({
      rootFolders: [],
      rootDir: '/notes',
    })

    expect(result.rootFolders).toEqual([{ path: '/notes' }])
    expect(result.activeRootFolder).toBe('/notes')
  })
})


describe('migrateFontSettings', () => {
  it('fontFamilyEn と fontFamilyJa が既に存在する場合はスキップし、レガシー fontFamily を削除する', () => {
    const result = migrateFontSettings({
      fontFamilyEn: 'Inter',
      fontFamilyJa: 'Noto Sans JP',
      fontFamily: 'geist-kosugi',
      theme: 'dark',
    })

    expect(result.fontFamilyEn).toBe('Inter')
    expect(result.fontFamilyJa).toBe('Noto Sans JP')
    expect(result.fontFamily).toBeUndefined()
    expect(result.theme).toBe('dark')
  })

  it('fontFamilyEn と fontFamilyJa が既に存在する場合、レガシー fontFamily が無くても正常動作する', () => {
    const result = migrateFontSettings({
      fontFamilyEn: 'Geist',
      fontFamilyJa: 'Kosugi Maru',
      theme: 'light',
    })

    expect(result.fontFamilyEn).toBe('Geist')
    expect(result.fontFamilyJa).toBe('Kosugi Maru')
    expect(result.fontFamily).toBeUndefined()
  })

  it('レガシー fontFamily がビルトインプリセットIDに一致する場合は En/Ja に展開する', () => {
    const result = migrateFontSettings({
      fontFamily: 'inter-noto',
      theme: 'dark',
    })

    expect(result.fontFamilyEn).toBe('Inter')
    expect(result.fontFamilyJa).toBe('Noto Sans JP')
    expect(result.fontFamily).toBeUndefined()
    expect(result.theme).toBe('dark')
  })

  it('レガシー fontFamily が geist-kosugi プリセットの場合は正しく解決する', () => {
    const result = migrateFontSettings({
      fontFamily: 'geist-kosugi',
    })

    expect(result.fontFamilyEn).toBe('Geist')
    expect(result.fontFamilyJa).toBe('Kosugi Maru')
    expect(result.fontFamily).toBeUndefined()
  })

  it('レガシー fontFamily がプリセットIDに一致しない場合はデフォルトを適用する', () => {
    const result = migrateFontSettings({
      fontFamily: 'unknown-font-id',
      theme: 'dark',
    })

    expect(result.fontFamilyEn).toBe('Geist')
    expect(result.fontFamilyJa).toBe('Kosugi Maru')
    expect(result.fontFamily).toBeUndefined()
    expect(result.theme).toBe('dark')
  })

  it('fontFamily も fontFamilyEn/Ja も無い場合はそのまま返す', () => {
    const result = migrateFontSettings({
      theme: 'light',
      language: 'ja',
    })

    expect(result).toEqual({ theme: 'light', language: 'ja' })
    expect(result.fontFamilyEn).toBeUndefined()
    expect(result.fontFamilyJa).toBeUndefined()
  })
})

describe('migrateLegacySettings (font migration integration)', () => {
  it('rootDir と fontFamily の両方を含む旧形式設定を一度に移行する', () => {
    const result = migrateLegacySettings({
      rootDir: '/notes',
      fontFamily: 'inter-noto',
      theme: 'dark',
    })

    // rootDir migration
    expect(result.rootFolders).toEqual([{ path: '/notes' }])
    expect(result.activeRootFolder).toBe('/notes')
    expect(result.rootDir).toBeUndefined()

    // font migration
    expect(result.fontFamilyEn).toBe('Inter')
    expect(result.fontFamilyJa).toBe('Noto Sans JP')
    expect(result.fontFamily).toBeUndefined()
  })

  it('新形式の rootFolders が存在し fontFamily がある場合もフォント移行は行う', () => {
    const result = migrateLegacySettings({
      rootFolders: [{ path: '/a' }],
      activeRootFolder: '/a',
      fontFamily: 'geist-mplus',
    })

    expect(result.rootFolders).toEqual([{ path: '/a' }])
    expect(result.fontFamilyEn).toBe('Geist')
    expect(result.fontFamilyJa).toBe('M PLUS Rounded 1c')
    expect(result.fontFamily).toBeUndefined()
  })
})
