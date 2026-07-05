import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaQuery } from '@/renderer/hooks/useMediaQuery'

describe('useMediaQuery', () => {
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

  it('クエリが一致しない場合はfalseを返す', () => {
    window.matchMedia = createMockMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(min-width: 640px)'))
    expect(result.current).toBe(false)
  })

  it('クエリが一致する場合はtrueを返す', () => {
    window.matchMedia = createMockMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery('(min-width: 640px)'))
    expect(result.current).toBe(true)
  })

  it('changeイベントでmatchesがtrueに変わると値が更新される', () => {
    window.matchMedia = createMockMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(min-width: 640px)'))

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
    const { result } = renderHook(() => useMediaQuery('(min-width: 640px)'))

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
    const { result } = renderHook(() => useMediaQuery('(min-width: 640px)'))
    expect(result.current).toBe(false)
  })

  it('アンマウント時にイベントリスナーが解除される', () => {
    window.matchMedia = createMockMatchMedia(false)
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 640px)'))

    expect((listeners.get('change') ?? []).length).toBe(1)

    unmount()

    expect((listeners.get('change') ?? []).length).toBe(0)
  })

  it('クエリ文字列が変更されると新しいMediaQueryListを購読する', () => {
    window.matchMedia = createMockMatchMedia(false)
    const { result, rerender } = renderHook(
      ({ query }) => useMediaQuery(query),
      { initialProps: { query: '(min-width: 640px)' } }
    )

    expect(result.current).toBe(false)

    // Change the query — mock will still return false
    window.matchMedia = createMockMatchMedia(true)
    rerender({ query: '(min-width: 1024px)' })

    expect(result.current).toBe(true)
  })
})
