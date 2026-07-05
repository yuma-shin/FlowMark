import type { MarkdownNoteMeta } from '@/shared/types'

/** アニメーション再生時間（ms）。CSS側にも同値を供給する */
export const ANIMATION_DURATION_MS = 220

export type AnimationPhase = 'entering' | 'idle' | 'exiting'

export interface NoteListMutation {
  type: 'create' | 'delete'
  filePath: string
  at: number // Date.now() — 同一mutationの重複処理防止に使用
}

export interface AnimatedNoteEntry {
  note: MarkdownNoteMeta
  phase: AnimationPhase
}
