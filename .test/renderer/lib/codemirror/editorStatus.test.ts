import { describe, it, expect } from 'vitest'
import { Text } from '@codemirror/state'
import {
  computeCursorPosition,
  computeSelectionStats,
} from '@/renderer/lib/codemirror/editorStatus'

describe('computeCursorPosition', () => {
  it('空ドキュメントの先頭は行1列1を返す', () => {
    const doc = Text.of([''])
    expect(computeCursorPosition(doc, 0)).toEqual({ line: 1, column: 1 })
  })

  it('1行目の行頭は行1列1を返す', () => {
    const doc = Text.of(['Hello world'])
    expect(computeCursorPosition(doc, 0)).toEqual({ line: 1, column: 1 })
  })

  it('1行目の行末は列がテキスト長+1になる', () => {
    const doc = Text.of(['Hello'])
    expect(computeCursorPosition(doc, 5)).toEqual({ line: 1, column: 6 })
  })

  it('複数行ドキュメントの2行目先頭は行2列1を返す', () => {
    const doc = Text.of(['Hello', 'World'])
    // offset 6 = 改行の直後 = 2行目の先頭
    expect(computeCursorPosition(doc, 6)).toEqual({ line: 2, column: 1 })
  })

  it('複数行ドキュメントの2行目途中の位置を正しく算出する', () => {
    const doc = Text.of(['Hello', 'World'])
    // offset 9 = 2行目の4文字目の直後
    expect(computeCursorPosition(doc, 9)).toEqual({ line: 2, column: 4 })
  })
})

describe('computeSelectionStats', () => {
  it('選択範囲が空(from === to)の場合はnullを返す', () => {
    const doc = Text.of(['Hello world'])
    expect(computeSelectionStats(doc, 3, 3)).toBeNull()
  })

  it('単一行の選択範囲の文字数・語数を算出する', () => {
    const doc = Text.of(['Hello world foo'])
    // "Hello world" (0-11)
    expect(computeSelectionStats(doc, 0, 11)).toEqual({
      charCount: 11,
      wordCount: 2,
    })
  })

  it('複数行にまたがる選択範囲の文字数・語数を算出する', () => {
    const doc = Text.of(['Hello', 'World foo'])
    // "Hello\nWorld" (0-11)
    expect(computeSelectionStats(doc, 0, 11)).toEqual({
      charCount: 11,
      wordCount: 2,
    })
  })
})
