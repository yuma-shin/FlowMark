import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResizablePane } from '@/renderer/hooks/useResizablePane'

function fireMouseMove(clientX: number) {
  const event = new MouseEvent('mousemove', { clientX, bubbles: true })
  document.dispatchEvent(event)
}

function fireMouseUp() {
  const event = new MouseEvent('mouseup', { bubbles: true })
  document.dispatchEvent(event)
}

describe('useResizablePane', () => {
  it('initialWidth が minWidth 未満の場合 minWidth にclampする', () => {
    const { result } = renderHook(() =>
      useResizablePane({ initialWidth: 10, minWidth: 180, maxWidth: 480 })
    )
    expect(result.current.width).toBe(180)
  })

  it('initialWidth が maxWidth を超える場合 maxWidth にclampする', () => {
    const { result } = renderHook(() =>
      useResizablePane({ initialWidth: 999, minWidth: 180, maxWidth: 480 })
    )
    expect(result.current.width).toBe(480)
  })

  it('ドラッグ中は mousemove ごとに width がライブ更新される', () => {
    const { result } = renderHook(() =>
      useResizablePane({ initialWidth: 240, minWidth: 180, maxWidth: 480 })
    )

    act(() => {
      result.current.handleProps.onMouseDown({
        clientX: 100,
      } as React.MouseEvent)
    })
    expect(result.current.isDragging).toBe(true)

    act(() => {
      fireMouseMove(150)
    })
    expect(result.current.width).toBe(290)
  })

  it('ドラッグ中に最小幅を下回ろうとするとclampされる', () => {
    const { result } = renderHook(() =>
      useResizablePane({ initialWidth: 240, minWidth: 180, maxWidth: 480 })
    )

    act(() => {
      result.current.handleProps.onMouseDown({
        clientX: 100,
      } as React.MouseEvent)
    })
    act(() => {
      fireMouseMove(-500)
    })
    expect(result.current.width).toBe(180)
  })

  it('onWidthCommit は mouseup 時に1回だけ、ドラッグ中は発火しない', () => {
    const onWidthCommit = vi.fn()
    const { result } = renderHook(() =>
      useResizablePane({
        initialWidth: 240,
        minWidth: 180,
        maxWidth: 480,
        onWidthCommit,
      })
    )

    act(() => {
      result.current.handleProps.onMouseDown({
        clientX: 100,
      } as React.MouseEvent)
    })
    act(() => {
      fireMouseMove(150)
    })
    expect(onWidthCommit).not.toHaveBeenCalled()

    act(() => {
      fireMouseMove(200)
    })
    expect(onWidthCommit).not.toHaveBeenCalled()

    act(() => {
      fireMouseUp()
    })
    expect(onWidthCommit).toHaveBeenCalledTimes(1)
    expect(onWidthCommit).toHaveBeenCalledWith(340)
    expect(result.current.isDragging).toBe(false)
  })

  it('アンマウント後は mousemove/mouseup を処理しない', () => {
    const onWidthCommit = vi.fn()
    const { result, unmount } = renderHook(() =>
      useResizablePane({
        initialWidth: 240,
        minWidth: 180,
        maxWidth: 480,
        onWidthCommit,
      })
    )

    act(() => {
      result.current.handleProps.onMouseDown({
        clientX: 100,
      } as React.MouseEvent)
    })

    unmount()

    expect(() => {
      fireMouseMove(150)
      fireMouseUp()
    }).not.toThrow()
    expect(onWidthCommit).not.toHaveBeenCalled()
  })
})
