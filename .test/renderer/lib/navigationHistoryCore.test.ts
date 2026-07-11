import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  MAX_HISTORY_SIZE,
  createInitialState,
  pushEntry,
  goBack,
  goForward,
  canGoBack,
  canGoForward,
  type HistoryState,
} from '@/renderer/lib/navigationHistoryCore'

// --- Generators ---

/** Generate a valid filePath string */
const filePathArb = fc
  .stringMatching(/^[a-z]/)
  .filter(s => s.length > 0)
  .map(s => `/notes/${s}.md`)

/** Generate a valid HistoryState with entries and a valid cursor */
const historyStateArb: fc.Arbitrary<HistoryState> = fc
  .array(filePathArb, { minLength: 1, maxLength: 50 })
  .chain(entries =>
    fc.integer({ min: 0, max: entries.length - 1 }).map(cursor => ({
      entries: [...entries],
      cursor,
    }))
  )

/** Generate a HistoryState where cursor > 0 (goBack is possible) */
const goBackableStateArb: fc.Arbitrary<HistoryState> = fc
  .array(filePathArb, { minLength: 2, maxLength: 50 })
  .chain(entries =>
    fc.integer({ min: 1, max: entries.length - 1 }).map(cursor => ({
      entries: [...entries],
      cursor,
    }))
  )

/** Generate a HistoryState where cursor < entries.length - 1 (goForward is possible) */
const goForwardableStateArb: fc.Arbitrary<HistoryState> = fc
  .array(filePathArb, { minLength: 2, maxLength: 50 })
  .chain(entries =>
    fc.integer({ min: 0, max: entries.length - 2 }).map(cursor => ({
      entries: [...entries],
      cursor,
    }))
  )

/** Generate a HistoryState with exactly MAX_HISTORY_SIZE entries */
const fullHistoryStateArb: fc.Arbitrary<HistoryState> = fc
  .array(filePathArb, { minLength: MAX_HISTORY_SIZE, maxLength: MAX_HISTORY_SIZE })
  .chain(entries =>
    fc.integer({ min: 0, max: entries.length - 1 }).map(cursor => ({
      entries: [...entries],
      cursor,
    }))
  )

// --- Property Tests ---

/**
 * Property 1: Push はカーソル以降を切り捨てて末尾に追加する
 *
 * For any valid history state and filePath, push truncates entries after cursor,
 * appends new filePath, cursor points to new entry (old cursor + 1).
 *
 * **Validates: Requirements 1.1, 1.2**
 */
describe('Feature: navigation-history, Property 1: Push はカーソル以降を切り捨てて末尾に追加する', () => {
  it('property: push truncates entries after cursor and appends new filePath at the end', () => {
    fc.assert(
      fc.property(historyStateArb, filePathArb, (state, filePath) => {
        // Skip if duplicate (Property 2 covers that case)
        if (state.entries[state.cursor] === filePath) return

        const result = pushEntry(state, filePath)

        // Entries up to cursor should be preserved
        for (let i = 0; i <= state.cursor; i++) {
          expect(result.entries[i]).toBe(state.entries[i])
        }

        // New entry is at the end
        expect(result.entries[result.entries.length - 1]).toBe(filePath)

        // Cursor points to the new entry (last position)
        expect(result.cursor).toBe(result.entries.length - 1)

        // No entries after cursor from original remain (length = old cursor + 1 + 1 new)
        // Unless MAX_HISTORY_SIZE truncation occurred
        if (state.cursor + 2 <= MAX_HISTORY_SIZE) {
          expect(result.entries.length).toBe(state.cursor + 2)
        }
      }),
      { numRuns: 100 },
    )
  })

  it('property: push on initial (empty) state creates single-entry history', () => {
    fc.assert(
      fc.property(filePathArb, (filePath) => {
        const initial = createInitialState()
        const result = pushEntry(initial, filePath)

        expect(result.entries).toEqual([filePath])
        expect(result.cursor).toBe(0)
      }),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 2: 重複エントリの抑制
 *
 * If the current cursor entry matches the pushed filePath, state does not change
 * (reference equality).
 *
 * **Validates: Requirements 1.3**
 */
describe('Feature: navigation-history, Property 2: 重複エントリの抑制', () => {
  it('property: pushing the same filePath as current cursor entry returns the same state reference', () => {
    fc.assert(
      fc.property(historyStateArb, (state) => {
        const currentFilePath = state.entries[state.cursor]
        const result = pushEntry(state, currentFilePath)

        // Reference equality - state should not change
        expect(result).toBe(state)
      }),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 3: 最大サイズ不変条件
 *
 * After any sequence of push operations, entries.length <= MAX_HISTORY_SIZE.
 * When at 100 entries and pushing, oldest is removed and cursor decremented by 1.
 *
 * **Validates: Requirements 1.4, 1.5**
 */
describe('Feature: navigation-history, Property 3: 最大サイズ不変条件', () => {
  it('property: entries.length never exceeds MAX_HISTORY_SIZE after any sequence of pushes', () => {
    fc.assert(
      fc.property(
        fc.array(filePathArb, { minLength: 1, maxLength: 200 }),
        (filePaths) => {
          let state = createInitialState()

          for (const fp of filePaths) {
            state = pushEntry(state, fp)
            expect(state.entries.length).toBeLessThanOrEqual(MAX_HISTORY_SIZE)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('property: pushing onto a full history (100 entries, cursor at end) removes oldest and adjusts cursor', () => {
    fc.assert(
      fc.property(fullHistoryStateArb, filePathArb, (state, filePath) => {
        // Set cursor to end to avoid truncation of entries after cursor
        const fullState: HistoryState = {
          entries: state.entries,
          cursor: state.entries.length - 1,
        }

        // Skip duplicate case
        if (fullState.entries[fullState.cursor] === filePath) return

        const result = pushEntry(fullState, filePath)

        // Size should still be MAX_HISTORY_SIZE
        expect(result.entries.length).toBe(MAX_HISTORY_SIZE)

        // The oldest entry (index 0) from the original should be removed
        expect(result.entries[0]).toBe(fullState.entries[1])

        // New entry is at the end
        expect(result.entries[result.entries.length - 1]).toBe(filePath)

        // Cursor points to the last element
        expect(result.cursor).toBe(MAX_HISTORY_SIZE - 1)
      }),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 4: ナビゲーション可否の正確性
 *
 * canGoBack === (cursor > 0), canGoForward === (cursor < entries.length - 1)
 *
 * **Validates: Requirements 2.2, 3.2**
 */
describe('Feature: navigation-history, Property 4: ナビゲーション可否の正確性', () => {
  it('property: canGoBack is equivalent to cursor > 0', () => {
    fc.assert(
      fc.property(historyStateArb, (state) => {
        expect(canGoBack(state)).toBe(state.cursor > 0)
      }),
      { numRuns: 100 },
    )
  })

  it('property: canGoForward is equivalent to cursor < entries.length - 1', () => {
    fc.assert(
      fc.property(historyStateArb, (state) => {
        expect(canGoForward(state)).toBe(state.cursor < state.entries.length - 1)
      }),
      { numRuns: 100 },
    )
  })

  it('property: initial empty state has both canGoBack and canGoForward as false', () => {
    const initial = createInitialState()
    expect(canGoBack(initial)).toBe(false)
    expect(canGoForward(initial)).toBe(false)
  })
})

/**
 * Property 5: GoBack はカーソルを1つ前に移動する
 *
 * When cursor > 0, goBack results in cursor - 1 and returns entries[cursor - 1].
 *
 * **Validates: Requirements 2.1**
 */
describe('Feature: navigation-history, Property 5: GoBack はカーソルを1つ前に移動する', () => {
  it('property: goBack decrements cursor by 1 and the entry at new cursor matches entries[cursor - 1]', () => {
    fc.assert(
      fc.property(goBackableStateArb, (state) => {
        const result = goBack(state)

        // Cursor is decremented by 1
        expect(result.cursor).toBe(state.cursor - 1)

        // Entry at new cursor is the expected one
        expect(result.entries[result.cursor]).toBe(state.entries[state.cursor - 1])

        // Entries array is unchanged
        expect(result.entries).toBe(state.entries)
      }),
      { numRuns: 100 },
    )
  })

  it('property: goBack on state where cursor is 0 returns same state', () => {
    fc.assert(
      fc.property(
        fc.array(filePathArb, { minLength: 1, maxLength: 50 }).map(entries => ({
          entries,
          cursor: 0,
        })),
        (state) => {
          const result = goBack(state)
          expect(result).toBe(state)
        },
      ),
      { numRuns: 100 },
    )
  })
})

/**
 * Property 6: GoForward はカーソルを1つ後に移動する
 *
 * When cursor < entries.length - 1, goForward results in cursor + 1 and returns entries[cursor + 1].
 *
 * **Validates: Requirements 3.1**
 */
describe('Feature: navigation-history, Property 6: GoForward はカーソルを1つ後に移動する', () => {
  it('property: goForward increments cursor by 1 and the entry at new cursor matches entries[cursor + 1]', () => {
    fc.assert(
      fc.property(goForwardableStateArb, (state) => {
        const result = goForward(state)

        // Cursor is incremented by 1
        expect(result.cursor).toBe(state.cursor + 1)

        // Entry at new cursor is the expected one
        expect(result.entries[result.cursor]).toBe(state.entries[state.cursor + 1])

        // Entries array is unchanged
        expect(result.entries).toBe(state.entries)
      }),
      { numRuns: 100 },
    )
  })

  it('property: goForward on state where cursor is at end returns same state', () => {
    fc.assert(
      fc.property(
        fc.array(filePathArb, { minLength: 1, maxLength: 50 }).map(entries => ({
          entries,
          cursor: entries.length - 1,
        })),
        (state) => {
          const result = goForward(state)
          expect(result).toBe(state)
        },
      ),
      { numRuns: 100 },
    )
  })
})
