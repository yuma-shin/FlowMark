import { useCallback, useEffect, useRef, useState } from 'react'
import type React from 'react'

export interface UseResizablePaneOptions {
  initialWidth: number
  minWidth: number
  maxWidth: number
  /** ドラッグ確定時（mouseup）に1回だけ発火。永続化専用 */
  onWidthCommit?: (width: number) => void
}

export interface UseResizablePaneResult {
  /** ドラッグ中はmousemoveごとに更新されるライブ描画用の幅 */
  width: number
  isDragging: boolean
  handleProps: {
    onMouseDown: (event: React.MouseEvent) => void
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function useResizablePane({
  initialWidth,
  minWidth,
  maxWidth,
  onWidthCommit,
}: UseResizablePaneOptions): UseResizablePaneResult {
  const [width, setWidth] = useState(() =>
    clamp(initialWidth, minWidth, maxWidth)
  )
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(width)
  const widthRef = useRef(width)
  const onWidthCommitRef = useRef(onWidthCommit)

  useEffect(() => {
    widthRef.current = width
  }, [width])

  useEffect(() => {
    onWidthCommitRef.current = onWidthCommit
  }, [onWidthCommit])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (event: MouseEvent) => {
      const delta = event.clientX - startXRef.current
      setWidth(clamp(startWidthRef.current + delta, minWidth, maxWidth))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      onWidthCommitRef.current?.(widthRef.current)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, minWidth, maxWidth])

  const onMouseDown = useCallback((event: React.MouseEvent) => {
    startXRef.current = event.clientX
    startWidthRef.current = widthRef.current
    setIsDragging(true)
  }, [])

  return {
    width,
    isDragging,
    handleProps: { onMouseDown },
  }
}
