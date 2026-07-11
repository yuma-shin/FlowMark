import { describe, it, expect } from 'vitest'
import {
  EditorStateCache,
  DEFAULT_CACHE_CAPACITY,
  type CacheEntry,
} from '@/renderer/lib/editorStateCache'

function makeEntry(content: string): CacheEntry {
  return { json: { doc: content, history: {} }, documentContent: content }
}

describe('EditorStateCache', () => {
  describe('DEFAULT_CACHE_CAPACITY', () => {
    it('should be 20', () => {
      expect(DEFAULT_CACHE_CAPACITY).toBe(20)
    })
  })

  describe('constructor', () => {
    it('creates an empty cache with default capacity', () => {
      const cache = new EditorStateCache()
      expect(cache.size).toBe(0)
    })

    it('creates an empty cache with custom capacity', () => {
      const cache = new EditorStateCache(5)
      expect(cache.size).toBe(0)
    })
  })

  describe('set / get', () => {
    it('stores and retrieves an entry', () => {
      const cache = new EditorStateCache()
      const entry = makeEntry('hello')
      cache.set('/notes/a.md', entry)

      expect(cache.get('/notes/a.md')).toEqual(entry)
    })

    it('overwrites existing entry for same key', () => {
      const cache = new EditorStateCache()
      cache.set('/notes/a.md', makeEntry('v1'))
      cache.set('/notes/a.md', makeEntry('v2'))

      expect(cache.size).toBe(1)
      expect(cache.get('/notes/a.md')?.documentContent).toBe('v2')
    })

    it('returns undefined for missing key', () => {
      const cache = new EditorStateCache()
      expect(cache.get('/notes/missing.md')).toBeUndefined()
    })
  })

  describe('LRU eviction', () => {
    it('evicts the oldest entry when capacity is exceeded', () => {
      const cache = new EditorStateCache(3)
      cache.set('/a.md', makeEntry('a'))
      cache.set('/b.md', makeEntry('b'))
      cache.set('/c.md', makeEntry('c'))

      // Cache is full (3/3), adding a new one should evict /a.md
      cache.set('/d.md', makeEntry('d'))

      expect(cache.size).toBe(3)
      expect(cache.has('/a.md')).toBe(false)
      expect(cache.has('/b.md')).toBe(true)
      expect(cache.has('/c.md')).toBe(true)
      expect(cache.has('/d.md')).toBe(true)
    })

    it('get updates LRU order (accessed entry is not evicted)', () => {
      const cache = new EditorStateCache(3)
      cache.set('/a.md', makeEntry('a'))
      cache.set('/b.md', makeEntry('b'))
      cache.set('/c.md', makeEntry('c'))

      // Access /a.md to make it recently used
      cache.get('/a.md')

      // Now /b.md is the oldest. Adding a new entry should evict /b.md
      cache.set('/d.md', makeEntry('d'))

      expect(cache.has('/a.md')).toBe(true)
      expect(cache.has('/b.md')).toBe(false)
      expect(cache.has('/c.md')).toBe(true)
      expect(cache.has('/d.md')).toBe(true)
    })

    it('set with existing key updates LRU order', () => {
      const cache = new EditorStateCache(3)
      cache.set('/a.md', makeEntry('a'))
      cache.set('/b.md', makeEntry('b'))
      cache.set('/c.md', makeEntry('c'))

      // Re-set /a.md to update its order
      cache.set('/a.md', makeEntry('a-updated'))

      // Now /b.md is the oldest
      cache.set('/d.md', makeEntry('d'))

      expect(cache.has('/a.md')).toBe(true)
      expect(cache.has('/b.md')).toBe(false)
      expect(cache.has('/c.md')).toBe(true)
      expect(cache.has('/d.md')).toBe(true)
    })

    it('never exceeds capacity', () => {
      const cache = new EditorStateCache(3)
      for (let i = 0; i < 100; i++) {
        cache.set(`/note-${i}.md`, makeEntry(`content-${i}`))
        expect(cache.size).toBeLessThanOrEqual(3)
      }
    })
  })

  describe('delete', () => {
    it('removes an existing entry and returns true', () => {
      const cache = new EditorStateCache()
      cache.set('/a.md', makeEntry('a'))

      expect(cache.delete('/a.md')).toBe(true)
      expect(cache.has('/a.md')).toBe(false)
      expect(cache.size).toBe(0)
    })

    it('returns false for non-existent key', () => {
      const cache = new EditorStateCache()
      expect(cache.delete('/missing.md')).toBe(false)
    })

    it('does not affect other entries', () => {
      const cache = new EditorStateCache()
      cache.set('/a.md', makeEntry('a'))
      cache.set('/b.md', makeEntry('b'))
      cache.set('/c.md', makeEntry('c'))

      cache.delete('/b.md')

      expect(cache.size).toBe(2)
      expect(cache.has('/a.md')).toBe(true)
      expect(cache.has('/c.md')).toBe(true)
    })
  })

  describe('clear', () => {
    it('removes all entries', () => {
      const cache = new EditorStateCache()
      cache.set('/a.md', makeEntry('a'))
      cache.set('/b.md', makeEntry('b'))
      cache.set('/c.md', makeEntry('c'))

      cache.clear()

      expect(cache.size).toBe(0)
      expect(cache.has('/a.md')).toBe(false)
      expect(cache.has('/b.md')).toBe(false)
      expect(cache.has('/c.md')).toBe(false)
    })

    it('works on empty cache', () => {
      const cache = new EditorStateCache()
      cache.clear()
      expect(cache.size).toBe(0)
    })
  })

  describe('has', () => {
    it('returns true for existing key', () => {
      const cache = new EditorStateCache()
      cache.set('/a.md', makeEntry('a'))
      expect(cache.has('/a.md')).toBe(true)
    })

    it('returns false for non-existent key', () => {
      const cache = new EditorStateCache()
      expect(cache.has('/a.md')).toBe(false)
    })
  })

  describe('size', () => {
    it('reflects the number of entries', () => {
      const cache = new EditorStateCache()
      expect(cache.size).toBe(0)

      cache.set('/a.md', makeEntry('a'))
      expect(cache.size).toBe(1)

      cache.set('/b.md', makeEntry('b'))
      expect(cache.size).toBe(2)

      cache.delete('/a.md')
      expect(cache.size).toBe(1)
    })
  })
})
