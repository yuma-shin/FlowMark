import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReducedMotion } from '@/renderer/hooks/useReducedMotion'

describe('useReducedMotion', () => {
  let listeners: Map<string, ((event: MediaQueryListEvent) => void)[]>
  let matchesMock: boolean

  const createMockMatchMedia = (matches: boolean) => {
    matchesMock = matches
    listeners = new Map()
    return vi.fn().mockImplementation((query: string) => ({
      matches: matchesMock,
      media: query,
      addEventListener: (event: string, handler: (event: MediaQueryListEvent) => void) => {
        const handlers = listeners.get(event) ?? []
        handlers.push(handler)
        listeners.set(event, handlers)
      },
      removeEventListener: (event: string, handler: (event: MediaQueryListEvent) => void) => {
        const handlers = listeners.get(event) ?? []
        listeners.set(event, handlers.filter((h) => h !== handler))
      },
    }))
  }

  beforeEach(() => {
    window.matchMedia = createMockMatchMedia(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('matchMediaのmatches=falseの場合はfalseを返す', () => {
    window.matchMedia = createMockMatchMedia(false)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('matchMediaのmatches=trueの場合はtrueを返す', () => {
    window.matchMedia = createMockMatchMedia(true)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('changeイベントでmatchesがtrueに変わると値が更新される', () => {
    window.matchMedia = createMockMatchMedia(false)
    const { result } = renderHook(() => useReducedMotion())

    expect(result.current).toBe(false)

    act(() => {
      const handlers = listeners.get('change') ?? []
      for (const handler of handlers) {
        handler({ matches: true } as MediaQueryListEvent)
      }
    })

    expect(result.current).toBe(true)
  })

  it('changeイベントでmatchesがfalseに変わると値が更新される', () => {
    window.matchMedia = createMockMatchMedia(true)
    const { result } = renderHook(() => useReducedMotion())

    expect(result.current).toBe(true)

    act(() => {
      const handlers = listeners.get('change') ?? []
      for (const handler of handlers) {
        handler({ matches: false } as MediaQueryListEvent)
      }
    })

    expect(result.current).toBe(false)
  })

  it('matchMediaが利用不可の場合はfalseを返す', () => {
    // @ts-expect-error テスト用にmatchMediaを削除
    delete window.matchMedia
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('アンマウント時にイベントリスナーが解除される', () => {
    window.matchMedia = createMockMatchMedia(false)
    const { unmount } = renderHook(() => useReducedMotion())

    expect((listeners.get('change') ?? []).length).toBe(1)

    unmount()

    expect((listeners.get('change') ?? []).length).toBe(0)
  })
})
