import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import {
  detectAlertMarker,
  classifyBlockquoteLines,
} from '@/renderer/lib/codemirror/blockquoteDecoration'

// ─── Task 1.1: detectAlertMarker ────────────────────────────────────────────

describe('detectAlertMarker', () => {
  it('"[!NOTE]" で note を返す', () => {
    expect(detectAlertMarker('[!NOTE]')).toBe('note')
  })

  it('"[!TIP]" で tip を返す', () => {
    expect(detectAlertMarker('[!TIP]')).toBe('tip')
  })

  it('"[!IMPORTANT]" で important を返す', () => {
    expect(detectAlertMarker('[!IMPORTANT]')).toBe('important')
  })

  it('"[!WARNING]" で warning を返す', () => {
    expect(detectAlertMarker('[!WARNING]')).toBe('warning')
  })

  it('"[!CAUTION]" で caution を返す', () => {
    expect(detectAlertMarker('[!CAUTION]')).toBe('caution')
  })

  it('大文字小文字を区別しない ("[!note]" → note)', () => {
    expect(detectAlertMarker('[!note]')).toBe('note')
  })

  it('大文字小文字混在でも一致する ("[!NoTe]" → note)', () => {
    expect(detectAlertMarker('[!NoTe]')).toBe('note')
  })

  it('通常テキストは default を返す', () => {
    expect(detectAlertMarker('Hello world')).toBe('default')
  })

  it('未知のマーカーは default を返す ("[!UNKNOWN]")', () => {
    expect(detectAlertMarker('[!UNKNOWN]')).toBe('default')
  })

  it('閉じ括弧が欠落している場合は default を返す ("[!NOTE")', () => {
    expect(detectAlertMarker('[!NOTE')).toBe('default')
  })

  it('前後の空白を許容する ("  [!TIP]  " → tip)', () => {
    expect(detectAlertMarker('  [!TIP]  ')).toBe('tip')
  })

  it('空文字は default を返す', () => {
    expect(detectAlertMarker('')).toBe('default')
  })
})

// ─── Task 1.2: classifyBlockquoteLines ──────────────────────────────────────

function createState(doc: string): EditorState {
  return EditorState.create({ doc, extensions: [markdown()] })
}

describe('classifyBlockquoteLines', () => {
  it('通常の単一行引用ブロックを default として分類する', () => {
    const state = createState('> Hello')
    const result = classifyBlockquoteLines(state)
    expect(result.get(1)).toEqual({ kind: 'default', isMarkerLine: true })
  })

  it('通常の複数行引用ブロックの全行に同じ種別が継続する', () => {
    const state = createState('> Hello\n> World')
    const result = classifyBlockquoteLines(state)
    expect(result.get(1)).toEqual({ kind: 'default', isMarkerLine: true })
    expect(result.get(2)).toEqual({ kind: 'default', isMarkerLine: false })
  })

  it('Alertマーカーの行を対応する種別として分類する', () => {
    const state = createState('> [!TIP]\n> content')
    const result = classifyBlockquoteLines(state)
    expect(result.get(1)).toEqual({ kind: 'tip', isMarkerLine: true })
    expect(result.get(2)).toEqual({ kind: 'tip', isMarkerLine: false })
  })

  it('引用ブロックでない行は分類結果に含まれない', () => {
    const state = createState('plain text\n\n> Quoted')
    const result = classifyBlockquoteLines(state)
    expect(result.has(1)).toBe(false)
    expect(result.get(3)).toEqual({ kind: 'default', isMarkerLine: true })
  })

  it('ネストした引用内のAlertは最も内側の種別を採用する', () => {
    const state = createState('> outer\n> > [!WARNING]\n> > nested body')
    const result = classifyBlockquoteLines(state)
    expect(result.get(1)).toEqual({ kind: 'default', isMarkerLine: true })
    expect(result.get(2)).toEqual({ kind: 'warning', isMarkerLine: true })
    expect(result.get(3)).toEqual({ kind: 'warning', isMarkerLine: false })
  })

  it('Alertマーカーを別種別に書き換えると分類結果が追従する', () => {
    const before = classifyBlockquoteLines(createState('> [!TIP]'))
    const after = classifyBlockquoteLines(createState('> [!CAUTION]'))
    expect(before.get(1)?.kind).toBe('tip')
    expect(after.get(1)?.kind).toBe('caution')
  })

  it('Alertマーカーを削除するとdefaultに戻る', () => {
    const result = classifyBlockquoteLines(createState('> plain again'))
    expect(result.get(1)?.kind).toBe('default')
  })
})
