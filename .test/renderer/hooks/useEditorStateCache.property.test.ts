import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import * as fc from 'fast-check'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { history, historyField } from '@codemirror/commands'
import { useEditorStateCache } from '@/renderer/hooks/useEditorStateCache'

// --- Helpers ---

/**
 * Create an EditorView with history extension and apply edits to build undo history.
 */
function createViewWithHistory(doc: string, edits: string[]): EditorView {
  const state = EditorState.create({
    doc,
    extensions: [history()],
  })
  const parent = document.createElement('div')
  const view = new EditorView({ state, parent })

  // Apply edits to build undo history
  for (const edit of edits) {
    view.dispatch({
      changes: { from: 0, insert: edit },
    })
  }

  return view
}

// --- Generators ---

/** Generate document content (non-empty for meaningful tests) */
const docContentArb = fc.string({ minLength: 1, maxLength: 100 })

/** Generate a sequence of edit strings to build undo history */
const editsArb = fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
  minLength: 1,
  maxLength: 5,
})

/** Generate a file path */
const filePathArb = fc
  .tuple(
    fc.constantFrom('notes', 'docs', 'projects', 'archive', 'daily'),
    fc.integer({ min: 0, max: 999 }),
  )
  .map(([dir, id]) => `/${dir}/note-${id}.md`)

/**
 * Feature: editor-undo-history-persistence, Property 1: Save/Restore round-trip preserves undo history
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 2.2, 2.3**
 *
 * For any file path and any sequence of document edits (producing an EditorState with undo history),
 * saving the state to the cache and then restoring it should yield a state where the JSON structure
 * is preserved.
 */
describe('Feature: editor-undo-history-persistence, Property 1: Save/Restore round-trip preserves undo history', () => {
  const views: EditorView[] = []

  afterEach(() => {
    for (const view of views) {
      view.destroy()
    }
    views.length = 0
  })

  it('property: save then restore returns json with correct doc and history field', () => {
    fc.assert(
      fc.property(
        filePathArb,
        docContentArb,
        editsArb,
        (filePath, initialDoc, edits) => {
          const view = createViewWithHistory(initialDoc, edits)
          views.push(view)

          const { result } = renderHook(() => useEditorStateCache())

          // Save the current state
          act(() => {
            result.current.saveCurrentState(filePath, view)
          })

          // Get the expected document content after edits
          const expectedContent = view.state.doc.toString()

          // Restore the state
          let restored: ReturnType<typeof result.current.restoreState>
          act(() => {
            restored = result.current.restoreState(filePath, expectedContent)
          })

          // Verify restored object has the expected structure
          expect(restored).toBeDefined()
          expect(restored!.json).toBeDefined()
          expect(restored!.fields).toBeDefined()
          expect(restored!.fields.history).toBe(historyField)

          // Verify the JSON contains the correct document content
          const json = restored!.json as { doc: string; history: unknown }
          expect(json.doc).toBe(expectedContent)

          // Verify history field is present in the serialized JSON
          expect(json.history).toBeDefined()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('property: restored state can be used to reconstruct EditorState with undo history', () => {
    fc.assert(
      fc.property(
        filePathArb,
        docContentArb,
        editsArb,
        (filePath, initialDoc, edits) => {
          const view = createViewWithHistory(initialDoc, edits)
          views.push(view)

          const { result } = renderHook(() => useEditorStateCache())

          act(() => {
            result.current.saveCurrentState(filePath, view)
          })

          const expectedContent = view.state.doc.toString()

          let restored: ReturnType<typeof result.current.restoreState>
          act(() => {
            restored = result.current.restoreState(filePath, expectedContent)
          })

          expect(restored).toBeDefined()

          // Reconstruct the EditorState using the restored JSON + fields
          const restoredState = EditorState.fromJSON(
            restored!.json,
            { extensions: [history()] },
            restored!.fields,
          )

          // The document content should match
          expect(restoredState.doc.toString()).toBe(expectedContent)

          // The history field should be accessible (not throw)
          const historyValue = restoredState.field(historyField)
          expect(historyValue).toBeDefined()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('property: multiple saves for same filePath overwrites with latest state', () => {
    fc.assert(
      fc.property(
        filePathArb,
        docContentArb,
        editsArb,
        editsArb,
        (filePath, initialDoc, edits1, edits2) => {
          // Create first view
          const view1 = createViewWithHistory(initialDoc, edits1)
          views.push(view1)

          const { result } = renderHook(() => useEditorStateCache())

          // Save first state
          act(() => {
            result.current.saveCurrentState(filePath, view1)
          })

          // Create second view with different edits
          const view2 = createViewWithHistory(initialDoc, edits2)
          views.push(view2)

          // Save second state (overwrite)
          act(() => {
            result.current.saveCurrentState(filePath, view2)
          })

          const expectedContent = view2.state.doc.toString()

          // Restore should return the latest saved state
          let restored: ReturnType<typeof result.current.restoreState>
          act(() => {
            restored = result.current.restoreState(filePath, expectedContent)
          })

          expect(restored).toBeDefined()
          const json = restored!.json as { doc: string }
          expect(json.doc).toBe(expectedContent)
        },
      ),
      { numRuns: 100 },
    )
  })
})

/**
 * Feature: editor-undo-history-persistence, Property 5: Content mismatch detection discards stale cache
 *
 * **Validates: Requirements 5.1, 5.2**
 *
 * For any cached entry with document content D1 and any current note content D2 where D1 ≠ D2,
 * attempting to restore the state shall return undefined and the entry shall be removed from the cache.
 */
describe('Feature: editor-undo-history-persistence, Property 5: Content mismatch detection discards stale cache', () => {
  const views: EditorView[] = []

  afterEach(() => {
    for (const view of views) {
      view.destroy()
    }
    views.length = 0
  })

  it('property: restoring with mismatched content returns undefined', () => {
    fc.assert(
      fc.property(
        filePathArb,
        docContentArb,
        editsArb,
        docContentArb,
        (filePath, initialDoc, edits, differentContent) => {
          const view = createViewWithHistory(initialDoc, edits)
          views.push(view)

          const savedContent = view.state.doc.toString()

          // Ensure D2 !== D1 (content mismatch)
          if (differentContent === savedContent) return

          const { result } = renderHook(() => useEditorStateCache())

          // Save state with content D1
          act(() => {
            result.current.saveCurrentState(filePath, view)
          })

          // Try to restore with mismatched content D2
          let restored: ReturnType<typeof result.current.restoreState>
          act(() => {
            restored = result.current.restoreState(filePath, differentContent)
          })

          // Should return undefined due to content mismatch
          expect(restored).toBeUndefined()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('property: content mismatch removes the entry from cache', () => {
    fc.assert(
      fc.property(
        filePathArb,
        docContentArb,
        editsArb,
        docContentArb,
        (filePath, initialDoc, edits, differentContent) => {
          const view = createViewWithHistory(initialDoc, edits)
          views.push(view)

          const savedContent = view.state.doc.toString()

          // Ensure D2 !== D1
          if (differentContent === savedContent) return

          const { result } = renderHook(() => useEditorStateCache())

          // Save state
          act(() => {
            result.current.saveCurrentState(filePath, view)
          })

          // Attempt restore with mismatched content (triggers deletion)
          act(() => {
            result.current.restoreState(filePath, differentContent)
          })

          // Subsequent restore with the original content should also return undefined
          // because the entry was deleted
          let secondAttempt: ReturnType<typeof result.current.restoreState>
          act(() => {
            secondAttempt = result.current.restoreState(filePath, savedContent)
          })

          expect(secondAttempt).toBeUndefined()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('property: matching content succeeds while mismatched content fails', () => {
    fc.assert(
      fc.property(
        filePathArb,
        docContentArb,
        editsArb,
        docContentArb,
        (filePath, initialDoc, edits, differentContent) => {
          const view = createViewWithHistory(initialDoc, edits)
          views.push(view)

          const savedContent = view.state.doc.toString()

          // Ensure different content is actually different
          if (differentContent === savedContent) return

          const { result } = renderHook(() => useEditorStateCache())

          // Save state
          act(() => {
            result.current.saveCurrentState(filePath, view)
          })

          // Restore with correct content should succeed
          let matchResult: ReturnType<typeof result.current.restoreState>
          act(() => {
            matchResult = result.current.restoreState(filePath, savedContent)
          })
          expect(matchResult).toBeDefined()

          // Re-save the state (since get consumed it from LRU perspective but it's still there)
          act(() => {
            result.current.saveCurrentState(filePath, view)
          })

          // Restore with wrong content should fail
          let mismatchResult: ReturnType<typeof result.current.restoreState>
          act(() => {
            mismatchResult = result.current.restoreState(filePath, differentContent)
          })
          expect(mismatchResult).toBeUndefined()
        },
      ),
      { numRuns: 100 },
    )
  })
})
