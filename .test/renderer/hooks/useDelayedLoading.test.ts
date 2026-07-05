import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDelayedLoading } from '@/renderer/hooks/useDelayedLoading'

describe('useDelayedLoading', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('しきい値時間(150ms)未満でisLoadingがfalseに戻った場合、一度もtrueにならない', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ isLoading }) => useDelayedLoading(isLoading),
      { initialProps: { isLoading: true } }
    )

    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe(false)

    rerender({ isLoading: false })

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current).toBe(false)
  })

  it('しきい値時間経過後もisLoadingがtrueのままであればtrueになる', () => {
    vi.useFakeTimers()
    const { result } = renderHook(
      ({ isLoading }) => useDelayedLoading(isLoading),
      { initialProps: { isLoading: true } }
    )

    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(result.current).toBe(true)
  })

  it('表示開始後は最小表示時間(400ms)が経過するまでtrueを維持し、経過後にfalseへ戻る', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ isLoading }) => useDelayedLoading(isLoading),
      { initialProps: { isLoading: true } }
    )

    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(result.current).toBe(true)

    // 表示開始からまもなく読み込みが完了するが、最小表示時間未満なのでtrueを維持
    rerender({ isLoading: false })
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(399)
    })
    expect(result.current).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe(false)
  })

  it('アンマウント後にタイマーが発火しても状態更新エラーが発生しない', () => {
    vi.useFakeTimers()
    const { unmount } = renderHook(
      ({ isLoading }) => useDelayedLoading(isLoading),
      { initialProps: { isLoading: true } }
    )

    unmount()

    expect(() => {
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    }).not.toThrow()
  })

  it('showDelayMs/minVisibleMsのオプションで既定値を上書きできる', () => {
    vi.useFakeTimers()
    const { result } = renderHook(
      ({ isLoading }) =>
        useDelayedLoading(isLoading, { showDelayMs: 50, minVisibleMs: 200 }),
      { initialProps: { isLoading: true } }
    )

    act(() => {
      vi.advanceTimersByTime(49)
    })
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe(true)
  })
})
