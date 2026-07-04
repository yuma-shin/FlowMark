import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useEditorStatus } from '@/renderer/hooks/useEditorStatus'

describe('useEditorStatus', () => {
  it('空文字列の場合はcharCount/wordCount/lineCountすべて0を返す', () => {
    const { result } = renderHook(() => useEditorStatus(''))
    expect(result.current).toEqual({
      charCount: 0,
      wordCount: 0,
      lineCount: 1,
    })
  })

  it('Front Matterのみの場合は本文が空として集計する', () => {
    const raw = '---\ntitle: Hello\n---\n'
    const { result } = renderHook(() => useEditorStatus(raw))
    expect(result.current.charCount).toBe(0)
    expect(result.current.wordCount).toBe(0)
    expect(result.current.lineCount).toBe(1)
  })

  it('Front Matterなしの複数行本文を集計する', () => {
    const raw = 'Hello world\nfoo bar baz'
    const { result } = renderHook(() => useEditorStatus(raw))
    expect(result.current.charCount).toBe(raw.length)
    expect(result.current.wordCount).toBe(5)
    expect(result.current.lineCount).toBe(2)
  })

  it('Front Matter込みの本文はFront Matterを除いた文字数/語数/行数を返す', () => {
    const raw = '---\ntitle: Hello\ntags:\n  - a\n---\nHello world\nfoo bar baz'
    const body = 'Hello world\nfoo bar baz'
    const { result } = renderHook(() => useEditorStatus(raw))
    expect(result.current.charCount).toBe(body.length)
    expect(result.current.wordCount).toBe(5)
    expect(result.current.lineCount).toBe(2)
  })
})
