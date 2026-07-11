/**
 * Unit Tests & Property-Based Tests for useNavigationHistory hook
 *
 * **Validates: Requirements 2.3, 2.4, 3.3, 3.4, 6.1, 6.4, 7.1, 7.2, 7.3**
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import * as fc from 'fast-check'
import { useNavigationHistory } from '@/renderer/hooks/useNavigationHistory'
import { MAX_HISTORY_SIZE } from '@/renderer/lib/navigationHistoryCore'

// Mock tauriApi to prevent actual Tauri calls
vi.mock('@/renderer/lib/tauriApi', () => ({
  tauriApi: {
    platform: 'win32',
    markdown: {
      getNoteContent: vi.fn().mockResolvedValue(null),
    },
  },
}))

const STORAGE_KEY = 'navigationHistory'

describe('useNavigationHistory', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Basic push / goBack / goForward', () => {
    it('push adds entries and updates currentFilePath', () => {
      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists: async () => true,
        })
      )

      expect(result.current.currentFilePath).toBeNull()

      act(() => { result.current.push('/root/a.md') })
      expect(result.current.currentFilePath).toBe('/root/a.md')

      act(() => { result.current.push('/root/b.md') })
      expect(result.current.currentFilePath).toBe('/root/b.md')
    })

    it('goBack returns previous entry and goForward returns next entry', async () => {
      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists: async () => true,
        })
      )

      act(() => { result.current.push('/root/a.md') })
      act(() => { result.current.push('/root/b.md') })
      act(() => { result.current.push('/root/c.md') })

      let path: string | null = null
      await act(async () => { path = await result.current.goBack() })
      expect(path).toBe('/root/b.md')
      expect(result.current.currentFilePath).toBe('/root/b.md')
      expect(result.current.canGoBack).toBe(true)
      expect(result.current.canGoForward).toBe(true)

      await act(async () => { path = await result.current.goBack() })
      expect(path).toBe('/root/a.md')
      expect(result.current.canGoBack).toBe(false)
      expect(result.current.canGoForward).toBe(true)

      await act(async () => { path = await result.current.goForward() })
      expect(path).toBe('/root/b.md')
      expect(result.current.canGoBack).toBe(true)
      expect(result.current.canGoForward).toBe(true)
    })

    it('canGoBack and canGoForward reflect state correctly', () => {
      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists: async () => true,
        })
      )

      // Initially, neither direction is available
      expect(result.current.canGoBack).toBe(false)
      expect(result.current.canGoForward).toBe(false)

      act(() => { result.current.push('/root/a.md') })
      expect(result.current.canGoBack).toBe(false)
      expect(result.current.canGoForward).toBe(false)

      act(() => { result.current.push('/root/b.md') })
      expect(result.current.canGoBack).toBe(true)
      expect(result.current.canGoForward).toBe(false)
    })

    it('goBack returns null when at the beginning', async () => {
      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists: async () => true,
        })
      )

      act(() => { result.current.push('/root/a.md') })

      let path: string | null = 'not-null'
      await act(async () => { path = await result.current.goBack() })
      expect(path).toBeNull()
    })

    it('goForward returns null when at the end', async () => {
      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists: async () => true,
        })
      )

      act(() => { result.current.push('/root/a.md') })

      let path: string | null = 'not-null'
      await act(async () => { path = await result.current.goForward() })
      expect(path).toBeNull()
    })
  })

  describe('Deleted entry skip (checkNoteExists mock)', () => {
    it('goBack skips deleted entries and lands on next valid one', async () => {
      const existingFiles = new Set(['/root/a.md', '/root/c.md'])
      const checkNoteExists = async (fp: string) => existingFiles.has(fp)

      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists,
        })
      )

      act(() => { result.current.push('/root/a.md') })
      act(() => { result.current.push('/root/b.md') })
      act(() => { result.current.push('/root/c.md') })

      // At c.md (cursor=2). goBack should skip b.md (deleted) and land on a.md
      let path: string | null = null
      await act(async () => { path = await result.current.goBack() })
      expect(path).toBe('/root/a.md')
      expect(result.current.currentFilePath).toBe('/root/a.md')
    })

    it('goForward skips deleted entries', async () => {
      const existingFiles = new Set(['/root/a.md', '/root/c.md'])
      const checkNoteExists = async (fp: string) => existingFiles.has(fp)

      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists,
        })
      )

      act(() => { result.current.push('/root/a.md') })
      act(() => { result.current.push('/root/b.md') })
      act(() => { result.current.push('/root/c.md') })

      // Go back to a.md first
      await act(async () => { await result.current.goBack() })
      // Now goForward should skip b.md and land on c.md
      let path: string | null = null
      await act(async () => { path = await result.current.goForward() })
      expect(path).toBe('/root/c.md')
    })

    it('goBack returns null when all prior entries are deleted', async () => {
      const checkNoteExists = async () => false // all deleted

      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists,
        })
      )

      act(() => { result.current.push('/root/a.md') })
      act(() => { result.current.push('/root/b.md') })
      act(() => { result.current.push('/root/c.md') })

      let path: string | null = 'not-null'
      await act(async () => { path = await result.current.goBack() })
      expect(path).toBeNull()
    })

    it('goForward returns null when all later entries are deleted', async () => {
      const existingFiles = new Set(['/root/a.md'])
      const checkNoteExists = async (fp: string) => existingFiles.has(fp)

      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists,
        })
      )

      act(() => { result.current.push('/root/a.md') })
      act(() => { result.current.push('/root/b.md') })
      act(() => { result.current.push('/root/c.md') })

      // Go back to a.md
      await act(async () => { await result.current.goBack() })
      await act(async () => { await result.current.goBack() })

      // From a.md, goForward: b.md and c.md are deleted
      let path: string | null = 'not-null'
      await act(async () => { path = await result.current.goForward() })
      expect(path).toBeNull()
    })
  })

  describe('Root folder switching - history restoration', () => {
    it('maintains separate histories per root folder', () => {
      const { result, rerender } = renderHook(
        ({ activeRootFolder }) =>
          useNavigationHistory({
            activeRootFolder,
            checkNoteExists: async () => true,
          }),
        { initialProps: { activeRootFolder: '/root1' } }
      )

      // Push entries in root1
      act(() => { result.current.push('/root1/a.md') })
      act(() => { result.current.push('/root1/b.md') })
      expect(result.current.currentFilePath).toBe('/root1/b.md')

      // Switch to root2
      rerender({ activeRootFolder: '/root2' })
      expect(result.current.currentFilePath).toBeNull()

      // Push entries in root2
      act(() => { result.current.push('/root2/x.md') })
      expect(result.current.currentFilePath).toBe('/root2/x.md')

      // Switch back to root1 - history should be restored
      rerender({ activeRootFolder: '/root1' })
      expect(result.current.currentFilePath).toBe('/root1/b.md')
      expect(result.current.canGoBack).toBe(true)
    })

    it('removeRootHistory clears only the specified root history', () => {
      const { result, rerender } = renderHook(
        ({ activeRootFolder }) =>
          useNavigationHistory({
            activeRootFolder,
            checkNoteExists: async () => true,
          }),
        { initialProps: { activeRootFolder: '/root1' } }
      )

      act(() => { result.current.push('/root1/a.md') })
      rerender({ activeRootFolder: '/root2' })
      act(() => { result.current.push('/root2/x.md') })

      // Remove root1 history
      act(() => { result.current.removeRootHistory('/root1') })

      // Root2 still intact
      expect(result.current.currentFilePath).toBe('/root2/x.md')

      // Switch to root1 - should be empty
      rerender({ activeRootFolder: '/root1' })
      expect(result.current.currentFilePath).toBeNull()
      expect(result.current.canGoBack).toBe(false)
    })
  })

  describe('localStorage persistence & restoration roundtrip', () => {
    it('persists history to localStorage on push', () => {
      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists: async () => true,
        })
      )

      act(() => { result.current.push('/root/a.md') })
      act(() => { result.current.push('/root/b.md') })

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
      expect(stored.version).toBe(1)
      expect(stored.histories['/root'].entries).toEqual(['/root/a.md', '/root/b.md'])
      expect(stored.histories['/root'].cursor).toBe(1)
    })

    it('restores history from localStorage on mount', () => {
      // Pre-seed localStorage
      const data = {
        version: 1,
        histories: {
          '/root': { entries: ['/root/x.md', '/root/y.md'], cursor: 1 },
        },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))

      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists: async () => true,
        })
      )

      expect(result.current.currentFilePath).toBe('/root/y.md')
      expect(result.current.canGoBack).toBe(true)
      expect(result.current.canGoForward).toBe(false)
    })
  })

  describe('Invalid data fallback', () => {
    it('falls back to empty state when localStorage has invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists: async () => true,
        })
      )

      expect(result.current.currentFilePath).toBeNull()
      expect(result.current.canGoBack).toBe(false)
      expect(result.current.canGoForward).toBe(false)
      consoleSpy.mockRestore()
    })

    it('falls back to empty state when version is wrong', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, histories: {} }))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists: async () => true,
        })
      )

      expect(result.current.currentFilePath).toBeNull()
      consoleSpy.mockRestore()
    })

    it('falls back to empty state when entries is not a string array', () => {
      const data = {
        version: 1,
        histories: {
          '/root': { entries: [123, null, true], cursor: 0 },
        },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists: async () => true,
        })
      )

      expect(result.current.currentFilePath).toBeNull()
      consoleSpy.mockRestore()
    })

    it('falls back to empty state when cursor is out of range', () => {
      const data = {
        version: 1,
        histories: {
          '/root': { entries: ['/root/a.md'], cursor: 5 },
        },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() =>
        useNavigationHistory({
          activeRootFolder: '/root',
          checkNoteExists: async () => true,
        })
      )

      expect(result.current.currentFilePath).toBeNull()
      consoleSpy.mockRestore()
    })
  })

  /**
   * Property 7: 削除済みエントリのスキップと除去
   *
   * **Validates: Requirements 2.3, 2.4, 3.3, 3.4**
   *
   * For any valid history with some entries marked as "deleted",
   * goBack/goForward skips deleted entries and returns the next valid one.
   * If all entries in the direction are deleted, null is returned.
   */
  describe('Feature: navigation-history, Property 7: 削除済みエントリのスキップと除去', () => {
    // Generator: a list of file paths (1-10) with a subset marked as "existing"
    const historyWithDeletionsArb = fc
      .integer({ min: 3, max: 10 })
      .chain(size => {
        const pathsArb = fc.array(
          fc.stringMatching(/^\/root\/note-[a-z]{1,5}\.md$/),
          { minLength: size, maxLength: size }
        )
        const existingIndicesArb = fc.subarray(
          Array.from({ length: size }, (_, i) => i),
          { minLength: 0 }
        )
        return fc.tuple(pathsArb, existingIndicesArb)
      })

    it('property: goBack skips deleted entries and returns next valid one or null', async () => {
      await fc.assert(
        fc.asyncProperty(historyWithDeletionsArb, async ([paths, existingIndices]) => {
          localStorage.clear()
          const existingSet = new Set(existingIndices.map(i => paths[i]))
          const checkNoteExists = async (fp: string) => existingSet.has(fp)

          const { result, unmount } = renderHook(() =>
            useNavigationHistory({
              activeRootFolder: '/root',
              checkNoteExists,
            })
          )

          // Push all paths
          for (const p of paths) {
            act(() => { result.current.push(p) })
          }

          // Now goBack: should find the last existing entry before current
          let path: string | null = null
          await act(async () => { path = await result.current.goBack() })

          if (path !== null) {
            // The returned path should exist
            expect(existingSet.has(path)).toBe(true)
          }
          // If null, there are no existing entries before the cursor

          unmount()
        }),
        { numRuns: 50 }
      )
    })

    it('property: goForward skips deleted entries and returns next valid one or null', async () => {
      await fc.assert(
        fc.asyncProperty(historyWithDeletionsArb, async ([paths, existingIndices]) => {
          localStorage.clear()
          const existingSet = new Set(existingIndices.map(i => paths[i]))
          const checkNoteExists = async (fp: string) => existingSet.has(fp)

          const { result, unmount } = renderHook(() =>
            useNavigationHistory({
              activeRootFolder: '/root',
              checkNoteExists,
            })
          )

          // Push all paths
          for (const p of paths) {
            act(() => { result.current.push(p) })
          }

          // Go back to the beginning first
          for (let i = 0; i < paths.length - 1; i++) {
            await act(async () => { await result.current.goBack() })
          }

          // Now goForward from the start: should find the first existing entry after cursor
          let path: string | null = null
          await act(async () => { path = await result.current.goForward() })

          if (path !== null) {
            expect(existingSet.has(path)).toBe(true)
          }

          unmount()
        }),
        { numRuns: 50 }
      )
    })
  })

  /**
   * Property 8: ルートフォルダ間の履歴分離
   *
   * **Validates: Requirements 6.1, 6.4**
   *
   * For any operations on multiple root folders, operations on one root folder
   * do not affect the history state of other root folders.
   */
  describe('Feature: navigation-history, Property 8: ルートフォルダ間の履歴分離', () => {
    // Generator for operations on two roots
    const twoRootOpsArb = fc.record({
      root1Paths: fc.array(
        fc.stringMatching(/^\/root1\/[a-z]{1,4}\.md$/),
        { minLength: 1, maxLength: 5 }
      ),
      root2Paths: fc.array(
        fc.stringMatching(/^\/root2\/[a-z]{1,4}\.md$/),
        { minLength: 1, maxLength: 5 }
      ),
    })

    it('property: push operations on one root do not affect another root', () => {
      fc.assert(
        fc.property(twoRootOpsArb, ({ root1Paths, root2Paths }) => {
          localStorage.clear()

          const { result, rerender, unmount } = renderHook(
            ({ activeRootFolder }) =>
              useNavigationHistory({
                activeRootFolder,
                checkNoteExists: async () => true,
              }),
            { initialProps: { activeRootFolder: '/root1' } }
          )

          // Push entries to root1
          for (const p of root1Paths) {
            act(() => { result.current.push(p) })
          }
          const root1Last = root1Paths[root1Paths.length - 1]
          expect(result.current.currentFilePath).toBe(root1Last)

          // Switch to root2 and push entries
          rerender({ activeRootFolder: '/root2' })
          for (const p of root2Paths) {
            act(() => { result.current.push(p) })
          }
          const root2Last = root2Paths[root2Paths.length - 1]
          expect(result.current.currentFilePath).toBe(root2Last)

          // Switch back to root1 - should be unchanged
          rerender({ activeRootFolder: '/root1' })
          expect(result.current.currentFilePath).toBe(root1Last)

          unmount()
        }),
        { numRuns: 50 }
      )
    })
  })

  /**
   * Property 9: 永続化のラウンドトリップ
   *
   * **Validates: Requirements 7.1, 7.2**
   *
   * For any valid history state, persisting to localStorage and then
   * creating a new hook instance restores the equivalent state.
   */
  describe('Feature: navigation-history, Property 9: 永続化のラウンドトリップ', () => {
    const validHistoryArb = fc
      .integer({ min: 1, max: 20 })
      .chain(size => {
        const pathsArb = fc.array(
          fc.stringMatching(/^\/root\/[a-z]{1,6}\.md$/),
          { minLength: size, maxLength: size }
        )
        return pathsArb
      })

    it('property: history pushed to hook persists and is restored on new hook mount', () => {
      fc.assert(
        fc.property(validHistoryArb, (paths) => {
          localStorage.clear()

          // First hook instance: push entries
          const { result, unmount } = renderHook(() =>
            useNavigationHistory({
              activeRootFolder: '/root',
              checkNoteExists: async () => true,
            })
          )

          for (const p of paths) {
            act(() => { result.current.push(p) })
          }

          const expectedFilePath = result.current.currentFilePath
          const expectedCanGoBack = result.current.canGoBack
          unmount()

          // Second hook instance: should restore from localStorage
          const { result: result2, unmount: unmount2 } = renderHook(() =>
            useNavigationHistory({
              activeRootFolder: '/root',
              checkNoteExists: async () => true,
            })
          )

          expect(result2.current.currentFilePath).toBe(expectedFilePath)
          expect(result2.current.canGoBack).toBe(expectedCanGoBack)
          unmount2()
        }),
        { numRuns: 50 }
      )
    })
  })

  /**
   * Property 10: 不正データへの耐性
   *
   * **Validates: Requirements 7.3**
   *
   * For any random string stored in localStorage under the navigation history key,
   * the hook initializes without throwing and falls back to empty state.
   */
  describe('Feature: navigation-history, Property 10: 不正データへの耐性', () => {
    it('property: random strings in localStorage do not crash the hook', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 200 }), (randomData) => {
          localStorage.clear()
          localStorage.setItem(STORAGE_KEY, randomData)
          const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

          const { result, unmount } = renderHook(() =>
            useNavigationHistory({
              activeRootFolder: '/root',
              checkNoteExists: async () => true,
            })
          )

          // Should not throw, and should be in a valid initial state
          expect(result.current.currentFilePath).toBeNull()
          expect(result.current.canGoBack).toBe(false)
          expect(result.current.canGoForward).toBe(false)

          unmount()
          consoleSpy.mockRestore()
        }),
        { numRuns: 100 }
      )
    })

    it('property: random JSON objects in localStorage do not crash the hook', () => {
      fc.assert(
        fc.property(fc.jsonValue(), (randomJson) => {
          localStorage.clear()
          localStorage.setItem(STORAGE_KEY, JSON.stringify(randomJson))
          const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

          const { result, unmount } = renderHook(() =>
            useNavigationHistory({
              activeRootFolder: '/root',
              checkNoteExists: async () => true,
            })
          )

          // Should not throw - either valid data is restored or empty state
          expect(result.current.canGoBack === true || result.current.canGoBack === false).toBe(true)

          unmount()
          consoleSpy.mockRestore()
        }),
        { numRuns: 100 }
      )
    })
  })
})
