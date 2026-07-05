import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { renderHookWithProviders } from '../../helpers/test-app-provider'
import { useRootFolders } from '@/renderer/hooks/useRootFolders'

const mockCheckRootExists = vi.fn()

vi.mock('@/renderer/lib/tauriApi', () => ({
  tauriApi: {
    markdown: {
      checkRootExists: (...args: unknown[]) => mockCheckRootExists(...args),
    },
  },
}))

describe('useRootFolders', () => {
  beforeEach(() => {
    localStorage.clear()
    mockCheckRootExists.mockReset()
    mockCheckRootExists.mockResolvedValue(true)
  })

  it('起動時に永続化された一覧を読み込んで復元する', () => {
    const { result } = renderHookWithProviders(() => useRootFolders(), {
      settings: {
        rootFolders: [{ path: '/a' }, { path: '/b' }],
        activeRootFolder: '/b',
      },
    })

    expect(result.current.rootFolders).toEqual([
      { path: '/a' },
      { path: '/b' },
    ])
    expect(result.current.activeRootFolder).toEqual({ path: '/b' })
  })

  it('新しいフォルダを追加すると一覧に加わりアクティブになる', () => {
    const { result } = renderHookWithProviders(() => useRootFolders())

    act(() => {
      result.current.addRootFolder('/notes')
    })

    expect(result.current.rootFolders).toEqual([{ path: '/notes' }])
    expect(result.current.activeRootFolder).toEqual({ path: '/notes' })
  })

  it('既存フォルダを表記ゆれ付きで再追加すると重複させず既存タブをアクティブにする', () => {
    const { result } = renderHookWithProviders(() => useRootFolders(), {
      settings: {
        rootFolders: [{ path: 'C:\\Notes' }, { path: '/other' }],
        activeRootFolder: '/other',
      },
    })

    act(() => {
      result.current.addRootFolder('c:/notes/')
    })

    expect(result.current.rootFolders).toHaveLength(2)
    expect(result.current.activeRootFolder).toEqual({ path: 'C:\\Notes' })
  })

  it('アクティブなルートを削除すると隣接するルートがアクティブになる', () => {
    const { result } = renderHookWithProviders(() => useRootFolders(), {
      settings: {
        rootFolders: [{ path: '/a' }, { path: '/b' }, { path: '/c' }],
        activeRootFolder: '/b',
      },
    })

    act(() => {
      result.current.removeRootFolder('/b')
    })

    expect(result.current.rootFolders).toEqual([{ path: '/a' }, { path: '/c' }])
    expect(result.current.activeRootFolder).toEqual({ path: '/c' })
  })

  it('最後の1件を削除するとアクティブなルートが未設定になる', () => {
    const { result } = renderHookWithProviders(() => useRootFolders(), {
      settings: {
        rootFolders: [{ path: '/a' }],
        activeRootFolder: '/a',
      },
    })

    act(() => {
      result.current.removeRootFolder('/a')
    })

    expect(result.current.rootFolders).toEqual([])
    expect(result.current.activeRootFolder).toBeUndefined()
  })

  it('非アクティブなルートを削除してもアクティブなルートは変わらない', () => {
    const { result } = renderHookWithProviders(() => useRootFolders(), {
      settings: {
        rootFolders: [{ path: '/a' }, { path: '/b' }],
        activeRootFolder: '/a',
      },
    })

    act(() => {
      result.current.removeRootFolder('/b')
    })

    expect(result.current.rootFolders).toEqual([{ path: '/a' }])
    expect(result.current.activeRootFolder).toEqual({ path: '/a' })
  })

  it('updateRootMetaは対象エントリのみを更新し、他のエントリに影響しない', () => {
    const { result } = renderHookWithProviders(() => useRootFolders(), {
      settings: {
        rootFolders: [
          { path: '/a', lastSelectedFolder: 'old-a' },
          { path: '/b', lastSelectedFolder: 'old-b' },
        ],
        activeRootFolder: '/a',
      },
    })

    act(() => {
      result.current.updateRootMeta('/a', { lastSelectedFolder: 'new-a' })
    })

    expect(result.current.rootFolders).toEqual([
      { path: '/a', lastSelectedFolder: 'new-a' },
      { path: '/b', lastSelectedFolder: 'old-b' },
    ])
  })

  it('アクセス不能なルートフォルダをrootStatusでmissingとして識別する', async () => {
    mockCheckRootExists.mockImplementation(async (path: string) =>
      path === '/missing' ? false : true
    )

    const { result } = renderHookWithProviders(() => useRootFolders(), {
      settings: {
        rootFolders: [{ path: '/ok' }, { path: '/missing' }],
        activeRootFolder: '/ok',
      },
    })

    await waitFor(() => {
      expect(result.current.rootStatus).toEqual({
        '/ok': 'ok',
        '/missing': 'missing',
      })
    })
  })

  it('setActiveRootFolderでアクティブなルートを切り替えられる', () => {
    const { result } = renderHookWithProviders(() => useRootFolders(), {
      settings: {
        rootFolders: [{ path: '/a' }, { path: '/b' }],
        activeRootFolder: '/a',
      },
    })

    act(() => {
      result.current.setActiveRootFolder('/b')
    })

    expect(result.current.activeRootFolder).toEqual({ path: '/b' })
  })

  it('reorderRootFoldersでドラッグしたタブが対象タブの直前に移動する(前方から後方へ)', () => {
    const { result } = renderHookWithProviders(() => useRootFolders(), {
      settings: {
        rootFolders: [
          { path: '/a' },
          { path: '/b' },
          { path: '/c' },
          { path: '/d' },
        ],
        activeRootFolder: '/a',
      },
    })

    act(() => {
      result.current.reorderRootFolders('/a', '/c')
    })

    expect(result.current.rootFolders).toEqual([
      { path: '/b' },
      { path: '/a' },
      { path: '/c' },
      { path: '/d' },
    ])
  })

  it('reorderRootFoldersでドラッグしたタブが対象タブの直前に移動する(後方から前方へ)', () => {
    const { result } = renderHookWithProviders(() => useRootFolders(), {
      settings: {
        rootFolders: [
          { path: '/a' },
          { path: '/b' },
          { path: '/c' },
          { path: '/d' },
        ],
        activeRootFolder: '/a',
      },
    })

    act(() => {
      result.current.reorderRootFolders('/d', '/b')
    })

    expect(result.current.rootFolders).toEqual([
      { path: '/a' },
      { path: '/d' },
      { path: '/b' },
      { path: '/c' },
    ])
  })

  it('reorderRootFoldersは移動元と移動先が同じ場合は何もしない', () => {
    const { result } = renderHookWithProviders(() => useRootFolders(), {
      settings: {
        rootFolders: [{ path: '/a' }, { path: '/b' }],
        activeRootFolder: '/a',
      },
    })

    act(() => {
      result.current.reorderRootFolders('/a', '/a')
    })

    expect(result.current.rootFolders).toEqual([{ path: '/a' }, { path: '/b' }])
  })

  it('reorderRootFoldersは存在しないパスを指定しても何もしない', () => {
    const { result } = renderHookWithProviders(() => useRootFolders(), {
      settings: {
        rootFolders: [{ path: '/a' }, { path: '/b' }],
        activeRootFolder: '/a',
      },
    })

    act(() => {
      result.current.reorderRootFolders('/missing', '/b')
    })

    expect(result.current.rootFolders).toEqual([{ path: '/a' }, { path: '/b' }])
  })
})
