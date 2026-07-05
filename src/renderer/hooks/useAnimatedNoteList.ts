import { useCallback, useEffect, useRef, useState } from 'react'
import type { MarkdownNoteMeta } from '@/shared/types'
import {
  ANIMATION_DURATION_MS,
  type AnimatedNoteEntry,
  type AnimationPhase,
  type NoteListMutation,
} from '@/renderer/lib/noteListAnimation'
import { useReducedMotion } from './useReducedMotion'

interface AnimationState {
  phase: AnimationPhase
  timerId: ReturnType<typeof setTimeout> | null
  snapshotNote: MarkdownNoteMeta
}

export interface UseAnimatedNoteListResult {
  displayEntries: AnimatedNoteEntry[]
  onExitAnimationEnd: (filePath: string) => void
}

/**
 * ノート一覧と変更イベントから、各ノートの表示用エントリとアニメーションフェーズを導出する。
 * 退去中のノートは displayEntries に保持され続け、タイマー経過後に完全除去される。
 */
export function useAnimatedNoteList(
  notes: MarkdownNoteMeta[],
  mutation: NoteListMutation | null,
  onNoteRemovalComplete: (filePath: string) => void
): UseAnimatedNoteListResult {
  const reducedMotion = useReducedMotion()

  // Internal state map: filePath → { phase, timerId, snapshotNote }
  const stateMapRef = useRef<Map<string, AnimationState>>(new Map())
  // Track last processed mutation.at to deduplicate
  const lastProcessedAtRef = useRef<number | null>(null)
  // Keep previous notes for snapshot on delete
  const prevNotesRef = useRef<MarkdownNoteMeta[]>(notes)
  // Stable reference to onNoteRemovalComplete
  const onNoteRemovalCompleteRef = useRef(onNoteRemovalComplete)
  onNoteRemovalCompleteRef.current = onNoteRemovalComplete

  // Force re-render when animation state changes
  const [, forceUpdate] = useState(0)
  const triggerRender = useCallback(() => forceUpdate(n => n + 1), [])

  // Resolve a single animation entry (transition to final state)
  const resolveEntry = useCallback(
    (filePath: string) => {
      const stateMap = stateMapRef.current
      const entry = stateMap.get(filePath)
      if (!entry) return

      if (entry.timerId !== null) {
        clearTimeout(entry.timerId)
      }

      if (entry.phase === 'entering') {
        stateMap.set(filePath, { ...entry, phase: 'idle', timerId: null })
        triggerRender()
      } else if (entry.phase === 'exiting') {
        stateMap.delete(filePath)
        onNoteRemovalCompleteRef.current(filePath)
        triggerRender()
      }
    },
    [triggerRender]
  )

  // Resolve all active animations immediately
  const resolveAll = useCallback(() => {
    const stateMap = stateMapRef.current
    const toResolve = [...stateMap.entries()].filter(
      ([, s]) => s.phase === 'entering' || s.phase === 'exiting'
    )
    for (const [filePath] of toResolve) {
      resolveEntry(filePath)
    }
  }, [resolveEntry])

  // Process mutation
  useEffect(() => {
    if (mutation === null) return
    if (mutation.at === lastProcessedAtRef.current) return

    lastProcessedAtRef.current = mutation.at
    const stateMap = stateMapRef.current

    if (mutation.type === 'create') {
      // Only animate if the filePath now exists in notes
      const noteInList = notes.find(n => n.filePath === mutation.filePath)
      if (!noteInList) return

      if (reducedMotion) {
        // Immediate resolution: set to idle directly
        stateMap.set(mutation.filePath, {
          phase: 'idle',
          timerId: null,
          snapshotNote: noteInList,
        })
        triggerRender()
        return
      }

      // Clear any existing timer for this filePath
      const existing = stateMap.get(mutation.filePath)
      if (existing?.timerId !== null && existing?.timerId !== undefined) {
        clearTimeout(existing.timerId)
      }

      const timerId = setTimeout(() => {
        const entry = stateMap.get(mutation.filePath)
        if (entry && entry.phase === 'entering') {
          stateMap.set(mutation.filePath, {
            ...entry,
            phase: 'idle',
            timerId: null,
          })
          triggerRender()
        }
      }, ANIMATION_DURATION_MS)

      stateMap.set(mutation.filePath, {
        phase: 'entering',
        timerId,
        snapshotNote: noteInList,
      })
      triggerRender()
    } else if (mutation.type === 'delete') {
      // Snapshot the note from previous notes or existing state map
      const snapshotNote =
        prevNotesRef.current.find(n => n.filePath === mutation.filePath) ??
        stateMap.get(mutation.filePath)?.snapshotNote

      if (!snapshotNote) return

      if (reducedMotion) {
        // Immediate resolution: remove and call callback
        const existing = stateMap.get(mutation.filePath)
        if (existing?.timerId !== null && existing?.timerId !== undefined) {
          clearTimeout(existing.timerId)
        }
        stateMap.delete(mutation.filePath)
        onNoteRemovalCompleteRef.current(mutation.filePath)
        triggerRender()
        return
      }

      // Clear any existing timer for this filePath
      const existing = stateMap.get(mutation.filePath)
      if (existing?.timerId !== null && existing?.timerId !== undefined) {
        clearTimeout(existing.timerId)
      }

      const timerId = setTimeout(() => {
        const entry = stateMap.get(mutation.filePath)
        if (entry && entry.phase === 'exiting') {
          stateMap.delete(mutation.filePath)
          onNoteRemovalCompleteRef.current(mutation.filePath)
          triggerRender()
        }
      }, ANIMATION_DURATION_MS)

      stateMap.set(mutation.filePath, {
        phase: 'exiting',
        timerId,
        snapshotNote,
      })
      triggerRender()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mutation, notes, reducedMotion, triggerRender])

  // Update prevNotesRef only when no exit animations are active
  // During exit animation, prevNotesRef must retain the old snapshot so that
  // position calculation (prevNotesRef.current.findIndex) still finds the exiting entry's predecessor
  useEffect(() => {
    const hasExiting = [...stateMapRef.current.values()].some(
      s => s.phase === 'exiting'
    )
    if (!hasExiting) {
      prevNotesRef.current = notes
    }
  }, [notes])

  // Subscribe to visibilitychange — resolve all on hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        resolveAll()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [resolveAll])

  // Cleanup on unmount: clear all timers and call onNoteRemovalComplete for exiting entries
  useEffect(() => {
    return () => {
      const stateMap = stateMapRef.current
      for (const [filePath, state] of stateMap.entries()) {
        if (state.timerId !== null) {
          clearTimeout(state.timerId)
        }
        if (state.phase === 'exiting') {
          onNoteRemovalCompleteRef.current(filePath)
        }
      }
      stateMap.clear()
    }
  }, [])

  // Manual exit animation end handler (called from NoteItem onAnimationEnd)
  const onExitAnimationEnd = useCallback(
    (filePath: string) => {
      const stateMap = stateMapRef.current
      const entry = stateMap.get(filePath)
      if (entry && entry.phase === 'exiting') {
        resolveEntry(filePath)
      }
    },
    [resolveEntry]
  )

  // Build displayEntries
  const stateMap = stateMapRef.current

  // Map current notes to entries with their phase
  const displayEntries: AnimatedNoteEntry[] = notes.map(note => {
    const state = stateMap.get(note.filePath)
    const phase: AnimationPhase = state?.phase ?? 'idle'
    return { note, phase }
  })

  // Re-insert exiting entries at their last known position
  const exitingEntries = [...stateMap.entries()].filter(
    ([filePath, state]) =>
      state.phase === 'exiting' && !notes.some(n => n.filePath === filePath)
  )

  for (const [filePath, state] of exitingEntries) {
    // Find last known position: look in previous notes for the index
    const prevIndex = prevNotesRef.current.findIndex(
      n => n.filePath === filePath
    )

    const entry: AnimatedNoteEntry = {
      note: state.snapshotNote,
      phase: 'exiting',
    }

    if (prevIndex === -1) {
      // Unknown position, append at end
      displayEntries.push(entry)
    } else {
      // Find the best insertion point based on neighbors in current displayEntries
      // Insert after the predecessor if it exists, or at the start
      const predecessorFilePath =
        prevIndex > 0
          ? prevNotesRef.current[prevIndex - 1]?.filePath
          : undefined

      if (predecessorFilePath) {
        const predecessorIdx = displayEntries.findIndex(
          e => e.note.filePath === predecessorFilePath
        )
        if (predecessorIdx !== -1) {
          displayEntries.splice(predecessorIdx + 1, 0, entry)
        } else {
          // Predecessor not found, try to insert at equivalent position
          const insertIdx = Math.min(prevIndex, displayEntries.length)
          displayEntries.splice(insertIdx, 0, entry)
        }
      } else {
        // Was first item, insert at beginning
        displayEntries.splice(0, 0, entry)
      }
    }
  }

  return { displayEntries, onExitAnimationEnd }
}
