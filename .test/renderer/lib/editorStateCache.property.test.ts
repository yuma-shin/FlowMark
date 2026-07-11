import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  EditorStateCache,
  type CacheEntry,
} from '@/renderer/lib/editorStateCache'

// --- Generators ---

/** Generate a file path string */
const filePathArb = fc
  .array(fc.constantFrom('notes', 'docs', 'projects', 'archive', 'daily', 'inbox'), {
    minLength: 1,
    maxLength: 3,
  })
  .chain(segments =>
    fc.constantFrom('.md', '.txt', '.markdown').map(ext => {
      return `/${segments.join('/')}/${segments[segments.length - 1]}-note${ext}`
    })
  )

/** Generate a unique set of file paths */
const uniqueFilePathsArb = (minLength: number, maxLength: number) =>
  fc
    .uniqueArray(
      fc.tuple(
        fc.constantFrom('notes', 'docs', 'projects', 'archive', 'daily', 'inbox', 'work', 'personal'),
        fc.integer({ min: 0, max: 999 }),
      ),
      { minLength, maxLength, comparator: (a, b) => a[0] === b[0] && a[1] === b[1] }
    )
    .map(pairs => pairs.map(([dir, id]) => `/${dir}/note-${id}.md`))

/** Generate a CacheEntry */
const cacheEntryArb = fc.string({ minLength: 0, maxLength: 200 }).map(
  (content): CacheEntry => ({
    json: { doc: content, history: { done: [], undone: [] } },
    documentContent: content,
  })
)

/** Generate a cache capacity (small for testing LRU behavior) */
const capacityArb = fc.integer({ min: 2, max: 10 })

/**
 * Feature: editor-undo-history-persistence, Property 2: LRU eviction removes least recently accessed entry
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
 *
 * For any sequence of put and get operations on the cache where the number of unique keys
 * exceeds the capacity, the cache size shall never exceed capacity, and the evicted entry
 * shall always be the one with the oldest access time.
 */
describe('Feature: editor-undo-history-persistence, Property 2: LRU eviction removes least recently accessed entry', () => {
  it('property: cache size never exceeds capacity after any sequence of set operations', () => {
    fc.assert(
      fc.property(
        capacityArb,
        fc.array(
          fc.tuple(filePathArb, cacheEntryArb),
          { minLength: 1, maxLength: 50 }
        ),
        (capacity, operations) => {
          const cache = new EditorStateCache(capacity)

          for (const [path, entry] of operations) {
            cache.set(path, entry)
            expect(cache.size).toBeLessThanOrEqual(capacity)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: evicted entry is the least recently used when capacity is exceeded', () => {
    fc.assert(
      fc.property(
        capacityArb,
        (capacity) => {
          const cache = new EditorStateCache(capacity)

          // Fill the cache to capacity with unique keys
          const keys: string[] = []
          for (let i = 0; i < capacity; i++) {
            const key = `/note-${i}.md`
            keys.push(key)
            cache.set(key, { json: { i }, documentContent: `content-${i}` })
          }

          // All keys should be present
          for (const key of keys) {
            expect(cache.has(key)).toBe(true)
          }

          // Access the first key to make it recently used
          cache.get(keys[0])

          // Now the LRU (oldest access) is keys[1]
          // Adding a new entry should evict keys[1]
          const newKey = '/new-note.md'
          cache.set(newKey, { json: { new: true }, documentContent: 'new' })

          expect(cache.size).toBe(capacity)
          expect(cache.has(keys[0])).toBe(true) // accessed recently, not evicted
          expect(cache.has(keys[1])).toBe(false) // LRU, evicted
          expect(cache.has(newKey)).toBe(true) // newly added
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: get operation updates access order preventing eviction', () => {
    fc.assert(
      fc.property(
        capacityArb,
        fc.integer({ min: 0, max: 9 }),
        (capacity, accessIndex) => {
          const cache = new EditorStateCache(capacity)
          const normalizedIndex = accessIndex % capacity

          // Fill to capacity
          const keys: string[] = []
          for (let i = 0; i < capacity; i++) {
            const key = `/fill-${i}.md`
            keys.push(key)
            cache.set(key, { json: { i }, documentContent: `c-${i}` })
          }

          // Access a specific key to move it to most-recently-used
          cache.get(keys[normalizedIndex])

          // Add enough new entries to evict all except the accessed one
          for (let i = 0; i < capacity - 1; i++) {
            cache.set(`/extra-${i}.md`, { json: { extra: i }, documentContent: `extra-${i}` })
          }

          // The accessed key should still be present
          expect(cache.has(keys[normalizedIndex])).toBe(true)
          expect(cache.size).toBe(capacity)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: sequence of mixed set/get operations never exceeds capacity', () => {
    // Operation type: either set a new key or get an existing key
    const operationArb = fc.oneof(
      fc.tuple(fc.constant('set' as const), filePathArb, cacheEntryArb),
      fc.tuple(fc.constant('get' as const), filePathArb, fc.constant(undefined as unknown as CacheEntry))
    )

    fc.assert(
      fc.property(
        capacityArb,
        fc.array(operationArb, { minLength: 5, maxLength: 80 }),
        (capacity, operations) => {
          const cache = new EditorStateCache(capacity)

          for (const [op, path, entry] of operations) {
            if (op === 'set') {
              cache.set(path, entry)
            } else {
              cache.get(path)
            }
            expect(cache.size).toBeLessThanOrEqual(capacity)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: editor-undo-history-persistence, Property 3: Targeted invalidation removes exactly the specified entry
 *
 * **Validates: Requirements 4.1, 4.2, 5.2**
 *
 * For any cache containing N entries and any file path P that exists in the cache,
 * calling delete(P) shall remove only the entry for P while all other entries
 * remain accessible and unchanged.
 */
describe('Feature: editor-undo-history-persistence, Property 3: Targeted invalidation removes exactly the specified entry', () => {
  it('property: delete removes only the targeted entry, others remain unchanged', () => {
    fc.assert(
      fc.property(
        uniqueFilePathsArb(2, 10),
        fc.array(cacheEntryArb, { minLength: 2, maxLength: 10 }),
        fc.nat(),
        (paths, entries, deleteIndexRaw) => {
          // Ensure we have matching paths and entries
          const count = Math.min(paths.length, entries.length)
          if (count < 2) return // skip degenerate cases

          const usedPaths = paths.slice(0, count)
          const usedEntries = entries.slice(0, count)
          const deleteIndex = deleteIndexRaw % count

          const cache = new EditorStateCache(count + 5) // capacity > count to avoid eviction

          // Populate cache
          for (let i = 0; i < count; i++) {
            cache.set(usedPaths[i], usedEntries[i])
          }

          expect(cache.size).toBe(count)

          // Delete one entry
          const targetPath = usedPaths[deleteIndex]
          const result = cache.delete(targetPath)

          // Verify delete was successful
          expect(result).toBe(true)
          expect(cache.has(targetPath)).toBe(false)
          expect(cache.get(targetPath)).toBeUndefined()
          expect(cache.size).toBe(count - 1)

          // Verify all other entries are unchanged
          for (let i = 0; i < count; i++) {
            if (i === deleteIndex) continue
            expect(cache.has(usedPaths[i])).toBe(true)
            // Note: get() updates access order, so we use has() + get() carefully
            const retrieved = cache.get(usedPaths[i])
            expect(retrieved).toEqual(usedEntries[i])
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: delete on non-existent key returns false and does not change cache', () => {
    fc.assert(
      fc.property(
        uniqueFilePathsArb(1, 8),
        fc.array(cacheEntryArb, { minLength: 1, maxLength: 8 }),
        (paths, entries) => {
          const count = Math.min(paths.length, entries.length)
          const cache = new EditorStateCache(count + 5)

          for (let i = 0; i < count; i++) {
            cache.set(paths[i], entries[i])
          }

          const sizeBefore = cache.size
          const result = cache.delete('/non-existent/path.md')

          expect(result).toBe(false)
          expect(cache.size).toBe(sizeBefore)

          // All entries unchanged
          for (let i = 0; i < count; i++) {
            expect(cache.has(paths[i])).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: multiple sequential deletes each remove exactly one entry', () => {
    fc.assert(
      fc.property(
        uniqueFilePathsArb(3, 10),
        fc.array(cacheEntryArb, { minLength: 3, maxLength: 10 }),
        fc.array(fc.nat(), { minLength: 1, maxLength: 5 }),
        (paths, entries, deleteIndicesRaw) => {
          const count = Math.min(paths.length, entries.length)
          if (count < 3) return

          const usedPaths = paths.slice(0, count)
          const usedEntries = entries.slice(0, count)

          const cache = new EditorStateCache(count + 5)
          for (let i = 0; i < count; i++) {
            cache.set(usedPaths[i], usedEntries[i])
          }

          const deletedSet = new Set<number>()
          for (const rawIdx of deleteIndicesRaw) {
            const idx = rawIdx % count
            if (deletedSet.has(idx)) continue

            const sizeBefore = cache.size
            cache.delete(usedPaths[idx])
            deletedSet.add(idx)

            expect(cache.size).toBe(sizeBefore - 1)
            expect(cache.has(usedPaths[idx])).toBe(false)
          }

          // Remaining entries are intact
          for (let i = 0; i < count; i++) {
            if (deletedSet.has(i)) {
              expect(cache.has(usedPaths[i])).toBe(false)
            } else {
              expect(cache.has(usedPaths[i])).toBe(true)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

/**
 * Feature: editor-undo-history-persistence, Property 4: Clear removes all entries
 *
 * **Validates: Requirements 4.3**
 *
 * For any cache containing N entries (where N > 0), calling clear() shall result
 * in the cache size being 0 and all previously stored keys returning undefined on access.
 */
describe('Feature: editor-undo-history-persistence, Property 4: Clear removes all entries', () => {
  it('property: clear reduces size to 0 and all keys become inaccessible', () => {
    fc.assert(
      fc.property(
        uniqueFilePathsArb(1, 15),
        fc.array(cacheEntryArb, { minLength: 1, maxLength: 15 }),
        (paths, entries) => {
          const count = Math.min(paths.length, entries.length)
          if (count < 1) return

          const usedPaths = paths.slice(0, count)
          const usedEntries = entries.slice(0, count)

          const cache = new EditorStateCache(count + 5)

          for (let i = 0; i < count; i++) {
            cache.set(usedPaths[i], usedEntries[i])
          }

          expect(cache.size).toBe(count)

          // Clear the cache
          cache.clear()

          // Verify size is 0
          expect(cache.size).toBe(0)

          // Verify all keys return undefined
          for (const path of usedPaths) {
            expect(cache.get(path)).toBeUndefined()
            expect(cache.has(path)).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: clear followed by new insertions works correctly', () => {
    fc.assert(
      fc.property(
        uniqueFilePathsArb(1, 10),
        fc.array(cacheEntryArb, { minLength: 1, maxLength: 10 }),
        uniqueFilePathsArb(1, 5),
        fc.array(cacheEntryArb, { minLength: 1, maxLength: 5 }),
        (paths1, entries1, paths2, entries2) => {
          const count1 = Math.min(paths1.length, entries1.length)
          const count2 = Math.min(paths2.length, entries2.length)
          if (count1 < 1 || count2 < 1) return

          const cache = new EditorStateCache(20)

          // Fill initial entries
          for (let i = 0; i < count1; i++) {
            cache.set(paths1[i], entries1[i])
          }

          // Clear
          cache.clear()
          expect(cache.size).toBe(0)

          // Add new entries after clear
          for (let i = 0; i < count2; i++) {
            cache.set(paths2[i], entries2[i])
          }

          expect(cache.size).toBe(count2)

          // New entries are accessible
          for (let i = 0; i < count2; i++) {
            expect(cache.has(paths2[i])).toBe(true)
          }

          // Old entries remain inaccessible (unless they happen to collide with new paths)
          for (let i = 0; i < count1; i++) {
            if (!paths2.slice(0, count2).includes(paths1[i])) {
              expect(cache.has(paths1[i])).toBe(false)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('property: multiple clears are idempotent', () => {
    fc.assert(
      fc.property(
        uniqueFilePathsArb(1, 10),
        fc.array(cacheEntryArb, { minLength: 1, maxLength: 10 }),
        fc.integer({ min: 2, max: 5 }),
        (paths, entries, clearCount) => {
          const count = Math.min(paths.length, entries.length)
          if (count < 1) return

          const cache = new EditorStateCache(count + 5)

          for (let i = 0; i < count; i++) {
            cache.set(paths[i], entries[i])
          }

          // Clear multiple times
          for (let i = 0; i < clearCount; i++) {
            cache.clear()
            expect(cache.size).toBe(0)
          }

          // Still empty after multiple clears
          for (const path of paths.slice(0, count)) {
            expect(cache.get(path)).toBeUndefined()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
