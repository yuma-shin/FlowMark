/**
 * Preservation Property Tests
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 *
 * These tests verify that non-buggy conditions (few notes, search/sort changes,
 * reduced-motion) behave correctly on the UNFIXED code. They must PASS on unfixed code.
 *
 * Properties tested:
 * - For all non-buggy delete operations (notes.length ≤ 20, no concurrent notes array update during animation):
 *   exit animation completes in exactly ANIMATION_DURATION_MS and entry is removed from displayEntries
 * - For all non-buggy create operations (notes.length ≤ 20):
 *   enter animation completes in exactly ANIMATION_DURATION_MS and entry transitions to idle
 * - For all notes changes without accompanying mutation:
 *   displayEntries equals notes.map(n => ({note: n, phase: 'idle'})) (no animation phases)
 * - For all operations with reducedMotion=true:
 *   animations are skipped, state transitions are immediate
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import fc from 'fast-check'
import { useAnimatedNoteList } from '@/renderer/hooks/useAnimatedNoteList'
import { ANIMATION_DURATION_MS } from '@/renderer/lib/noteListAnimation'
import type { MarkdownNoteMeta } from '@/shared/types'
import type { NoteListMutation } from '@/renderer/lib/noteListAnimation'

// Mutable flag to control useReducedMotion return value
let mockReducedMotion = false

vi.mock('@/renderer/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}))

// --- Generators ---

function createNote(index: number): MarkdownNoteMeta {
  return {
    id: `note-${index}`,
    title: `Note ${index}`,
    filePath: `/root/notes/note-${index}.md`,
    relativePath: `note-${index}.md`,
    tags: [],
    createdAt: new Date(Date.now() - index * 1000).toISOString(),
    updatedAt: new Date(Date.now() - index * 1000).toISOString(),
    excerpt: `Content of note ${index}`,
  }
}

/** Generates a list of 1-20 unique notes */
const notesArb = fc.integer({ min: 1, max: 20 }).map((count) => {
  return Array.from({ length: count }, (_, i) => createNote(i))
})

/** Generates a valid delete index for a given notes array */
const deleteIndexArb = (notesLength: number) =>
  fc.integer({ min: 0, max: notesLength - 1 })

// --- Property Tests ---

describe('Preservation Property: Non-buggy delete operations (notes.length ≤ 20)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockReducedMotion = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exit animation completes in exactly ANIMATION_DURATION_MS and entry is removed from displayEntries', () => {
    fc.assert(
      fc.property(notesArb, (notes) => {
        fc.pre(notes.length >= 2)

        // Pick a note to delete (not the last one, so we can verify position)
        const deleteIndex = 0
        const noteToDelete = notes[deleteIndex]
        const remainingNotes = notes.filter((_, i) => i !== deleteIndex)
        const onNoteRemovalComplete = vi.fn()

        const { result, rerender, unmount } = renderHook(
          ({ notes: n, mutation }) =>
            useAnimatedNoteList(n, mutation, onNoteRemovalComplete),
          { initialProps: { notes, mutation: null as NoteListMutation | null } }
        )

        // Initial state: all idle
        expect(result.current.displayEntries).toHaveLength(notes.length)
        for (const entry of result.current.displayEntries) {
          expect(entry.phase).toBe('idle')
        }

        // Emit delete mutation (note is STILL in the notes array)
        const deleteMutation: NoteListMutation = {
          type: 'delete',
          filePath: noteToDelete.filePath,
          at: Date.now(),
        }

        act(() => {
          rerender({ notes, mutation: deleteMutation })
        })

        // After mutation: note should be in 'exiting' phase
        const exitingEntry = result.current.displayEntries.find(
          (e) => e.note.filePath === noteToDelete.filePath
        )
        expect(exitingEntry).toBeDefined()
        expect(exitingEntry!.phase).toBe('exiting')

        // Non-buggy scenario: remove note from notes immediately (simulates fast loadNotes)
        // No additional re-renders forced between this and the timer
        act(() => {
          rerender({ notes: remainingNotes, mutation: deleteMutation })
        })

        // The exiting entry should still be in displayEntries (re-inserted from stateMap snapshot)
        const stillExiting = result.current.displayEntries.find(
          (e) => e.note.filePath === noteToDelete.filePath
        )
        expect(stillExiting).toBeDefined()
        expect(stillExiting!.phase).toBe('exiting')

        // Before ANIMATION_DURATION_MS: entry is still exiting
        act(() => {
          vi.advanceTimersByTime(ANIMATION_DURATION_MS - 1)
        })

        const stillExitingBeforeEnd = result.current.displayEntries.find(
          (e) => e.note.filePath === noteToDelete.filePath
        )
        expect(stillExitingBeforeEnd).toBeDefined()
        expect(stillExitingBeforeEnd!.phase).toBe('exiting')

        // At exactly ANIMATION_DURATION_MS: entry is removed and callback fired
        act(() => {
          vi.advanceTimersByTime(1)
        })

        const afterAnimation = result.current.displayEntries.find(
          (e) => e.note.filePath === noteToDelete.filePath
        )
        expect(afterAnimation).toBeUndefined()
        expect(onNoteRemovalComplete).toHaveBeenCalledWith(noteToDelete.filePath)

        unmount()
      }),
      { numRuns: 30 }
    )
  })

  it('onNoteRemovalComplete is called exactly once with the deleted note filePath', () => {
    fc.assert(
      fc.property(notesArb, (notes) => {
        fc.pre(notes.length >= 2)

        const deleteIndex = 0
        const noteToDelete = notes[deleteIndex]
        const remainingNotes = notes.filter((_, i) => i !== deleteIndex)
        const onNoteRemovalComplete = vi.fn()

        const { result, rerender, unmount } = renderHook(
          ({ notes: n, mutation }) =>
            useAnimatedNoteList(n, mutation, onNoteRemovalComplete),
          { initialProps: { notes, mutation: null as NoteListMutation | null } }
        )

        const deleteMutation: NoteListMutation = {
          type: 'delete',
          filePath: noteToDelete.filePath,
          at: Date.now(),
        }

        act(() => {
          rerender({ notes, mutation: deleteMutation })
        })

        // Remove note from notes (non-buggy: fast loadNotes)
        act(() => {
          rerender({ notes: remainingNotes, mutation: deleteMutation })
        })

        // Complete the animation
        act(() => {
          vi.advanceTimersByTime(ANIMATION_DURATION_MS)
        })

        expect(onNoteRemovalComplete).toHaveBeenCalledTimes(1)
        expect(onNoteRemovalComplete).toHaveBeenCalledWith(noteToDelete.filePath)

        unmount()
      }),
      { numRuns: 20 }
    )
  })
})

describe('Preservation Property: Non-buggy create operations (notes.length ≤ 20)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockReducedMotion = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('enter animation completes in exactly ANIMATION_DURATION_MS and entry transitions to idle', () => {
    fc.assert(
      fc.property(notesArb, (existingNotes) => {
        const newNote = createNote(existingNotes.length + 100) // Unique note
        const notesWithNew = [newNote, ...existingNotes]
        const onNoteRemovalComplete = vi.fn()

        // Start with existing notes (no new note yet)
        const { result, rerender, unmount } = renderHook(
          ({ notes, mutation }) =>
            useAnimatedNoteList(notes, mutation, onNoteRemovalComplete),
          { initialProps: { notes: existingNotes, mutation: null as NoteListMutation | null } }
        )

        // Add the new note to notes AND emit create mutation simultaneously
        // (This is the non-buggy pattern: note appears in array at the same time as mutation)
        const createMutation: NoteListMutation = {
          type: 'create',
          filePath: newNote.filePath,
          at: Date.now(),
        }

        act(() => {
          rerender({ notes: notesWithNew, mutation: createMutation })
        })

        // After mutation: new note should be in 'entering' phase
        const enteringEntry = result.current.displayEntries.find(
          (e) => e.note.filePath === newNote.filePath
        )
        expect(enteringEntry).toBeDefined()
        expect(enteringEntry!.phase).toBe('entering')

        // Before ANIMATION_DURATION_MS: entry is still entering
        act(() => {
          vi.advanceTimersByTime(ANIMATION_DURATION_MS - 1)
        })

        const stillEntering = result.current.displayEntries.find(
          (e) => e.note.filePath === newNote.filePath
        )
        expect(stillEntering).toBeDefined()
        expect(stillEntering!.phase).toBe('entering')

        // At exactly ANIMATION_DURATION_MS: entry transitions to idle
        act(() => {
          vi.advanceTimersByTime(1)
        })

        const afterAnimation = result.current.displayEntries.find(
          (e) => e.note.filePath === newNote.filePath
        )
        expect(afterAnimation).toBeDefined()
        expect(afterAnimation!.phase).toBe('idle')

        unmount()
      }),
      { numRuns: 30 }
    )
  })

  it('newly created note appears in displayEntries immediately with entering phase', () => {
    fc.assert(
      fc.property(notesArb, (existingNotes) => {
        const newNote = createNote(existingNotes.length + 200)
        const notesWithNew = [newNote, ...existingNotes]
        const onNoteRemovalComplete = vi.fn()

        const { result, rerender, unmount } = renderHook(
          ({ notes, mutation }) =>
            useAnimatedNoteList(notes, mutation, onNoteRemovalComplete),
          { initialProps: { notes: existingNotes, mutation: null as NoteListMutation | null } }
        )

        const createMutation: NoteListMutation = {
          type: 'create',
          filePath: newNote.filePath,
          at: Date.now(),
        }

        act(() => {
          rerender({ notes: notesWithNew, mutation: createMutation })
        })

        // The new note should be in displayEntries
        const newEntry = result.current.displayEntries.find(
          (e) => e.note.filePath === newNote.filePath
        )
        expect(newEntry).toBeDefined()
        expect(newEntry!.phase).toBe('entering')

        // Total entries = existingNotes + 1
        expect(result.current.displayEntries).toHaveLength(notesWithNew.length)

        unmount()
      }),
      { numRuns: 20 }
    )
  })
})

describe('Preservation Property: Notes changes without mutation (search/sort)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockReducedMotion = false
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('displayEntries equals notes.map(n => ({note: n, phase: idle})) when no mutation is active', () => {
    fc.assert(
      fc.property(notesArb, notesArb, (initialNotes, newNotes) => {
        const onNoteRemovalComplete = vi.fn()

        const { result, rerender, unmount } = renderHook(
          ({ notes, mutation }) =>
            useAnimatedNoteList(notes, mutation, onNoteRemovalComplete),
          { initialProps: { notes: initialNotes, mutation: null as NoteListMutation | null } }
        )

        // Change notes without any mutation (simulates search/sort)
        act(() => {
          rerender({ notes: newNotes, mutation: null })
        })

        // displayEntries should exactly match new notes, all idle
        expect(result.current.displayEntries).toHaveLength(newNotes.length)
        for (let i = 0; i < newNotes.length; i++) {
          expect(result.current.displayEntries[i].note.filePath).toBe(newNotes[i].filePath)
          expect(result.current.displayEntries[i].phase).toBe('idle')
        }

        // No removal callback should have been triggered
        expect(onNoteRemovalComplete).not.toHaveBeenCalled()

        unmount()
      }),
      { numRuns: 30 }
    )
  })

  it('displayEntries immediately reflects filtered/sorted notes without animation delay', () => {
    const notes = Array.from({ length: 10 }, (_, i) => createNote(i))
    const onNoteRemovalComplete = vi.fn()

    const { result, rerender, unmount } = renderHook(
      ({ notes: n, mutation }) =>
        useAnimatedNoteList(n, mutation, onNoteRemovalComplete),
      { initialProps: { notes, mutation: null as NoteListMutation | null } }
    )

    // Simulate a search filter reducing the list
    const filteredNotes = notes.slice(0, 5)
    act(() => {
      rerender({ notes: filteredNotes, mutation: null })
    })

    // Should immediately reflect filtered list, no animation
    expect(result.current.displayEntries).toHaveLength(5)
    for (let i = 0; i < 5; i++) {
      expect(result.current.displayEntries[i].note.filePath).toBe(filteredNotes[i].filePath)
      expect(result.current.displayEntries[i].phase).toBe('idle')
    }

    // Simulate a sort (reverse the list)
    const sortedNotes = [...filteredNotes].reverse()
    act(() => {
      rerender({ notes: sortedNotes, mutation: null })
    })

    // Should immediately reflect sorted list, no animation
    expect(result.current.displayEntries).toHaveLength(5)
    for (let i = 0; i < 5; i++) {
      expect(result.current.displayEntries[i].note.filePath).toBe(sortedNotes[i].filePath)
      expect(result.current.displayEntries[i].phase).toBe('idle')
    }

    unmount()
  })
})

describe('Preservation Property: Reduced motion (all operations immediate)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockReducedMotion = true
  })

  afterEach(() => {
    vi.useRealTimers()
    mockReducedMotion = false
  })

  it('delete with reducedMotion=true: entry immediately removed, onNoteRemovalComplete called synchronously', () => {
    fc.assert(
      fc.property(notesArb, (notes) => {
        fc.pre(notes.length >= 1)

        const deleteIndex = 0
        const noteToDelete = notes[deleteIndex]
        const onNoteRemovalComplete = vi.fn()

        const { result, rerender, unmount } = renderHook(
          ({ notes: n, mutation }) =>
            useAnimatedNoteList(n, mutation, onNoteRemovalComplete),
          { initialProps: { notes, mutation: null as NoteListMutation | null } }
        )

        const deleteMutation: NoteListMutation = {
          type: 'delete',
          filePath: noteToDelete.filePath,
          at: Date.now(),
        }

        act(() => {
          rerender({ notes, mutation: deleteMutation })
        })

        // With reduced motion: entry should NOT be in exiting phase
        // It should be immediately removed and callback called
        const exitingEntry = result.current.displayEntries.find(
          (e) => e.note.filePath === noteToDelete.filePath && e.phase === 'exiting'
        )
        expect(exitingEntry).toBeUndefined()

        // onNoteRemovalComplete should be called immediately (synchronously in same render cycle)
        expect(onNoteRemovalComplete).toHaveBeenCalledWith(noteToDelete.filePath)
        expect(onNoteRemovalComplete).toHaveBeenCalledTimes(1)

        // No timer advancement needed — the transition was immediate
        unmount()
      }),
      { numRuns: 20 }
    )
  })

  it('create with reducedMotion=true: entry immediately set to idle', () => {
    fc.assert(
      fc.property(notesArb, (existingNotes) => {
        const newNote = createNote(existingNotes.length + 300)
        const notesWithNew = [newNote, ...existingNotes]
        const onNoteRemovalComplete = vi.fn()

        const { result, rerender, unmount } = renderHook(
          ({ notes, mutation }) =>
            useAnimatedNoteList(notes, mutation, onNoteRemovalComplete),
          { initialProps: { notes: existingNotes, mutation: null as NoteListMutation | null } }
        )

        const createMutation: NoteListMutation = {
          type: 'create',
          filePath: newNote.filePath,
          at: Date.now(),
        }

        act(() => {
          rerender({ notes: notesWithNew, mutation: createMutation })
        })

        // With reduced motion: new note should immediately be idle (no 'entering' phase)
        const newEntry = result.current.displayEntries.find(
          (e) => e.note.filePath === newNote.filePath
        )
        expect(newEntry).toBeDefined()
        expect(newEntry!.phase).toBe('idle')

        // No entering phase at any point
        const enteringEntry = result.current.displayEntries.find(
          (e) => e.phase === 'entering'
        )
        expect(enteringEntry).toBeUndefined()

        unmount()
      }),
      { numRuns: 20 }
    )
  })

  it('reduced motion delete does not leave timers running', () => {
    const notes = Array.from({ length: 5 }, (_, i) => createNote(i))
    const noteToDelete = notes[2]
    const onNoteRemovalComplete = vi.fn()

    const { result, rerender, unmount } = renderHook(
      ({ notes: n, mutation }) =>
        useAnimatedNoteList(n, mutation, onNoteRemovalComplete),
      { initialProps: { notes, mutation: null as NoteListMutation | null } }
    )

    const deleteMutation: NoteListMutation = {
      type: 'delete',
      filePath: noteToDelete.filePath,
      at: Date.now(),
    }

    act(() => {
      rerender({ notes, mutation: deleteMutation })
    })

    // Callback already called
    expect(onNoteRemovalComplete).toHaveBeenCalledTimes(1)

    // Advance time well beyond animation duration — should not trigger additional callbacks
    act(() => {
      vi.advanceTimersByTime(ANIMATION_DURATION_MS * 2)
    })

    // Still only 1 call
    expect(onNoteRemovalComplete).toHaveBeenCalledTimes(1)

    unmount()
  })
})
