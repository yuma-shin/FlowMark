import { useEffect, useRef, useState } from 'react'

export interface UseDelayedLoadingOptions {
  showDelayMs?: number
  minVisibleMs?: number
}

const DEFAULT_SHOW_DELAY_MS = 150
const DEFAULT_MIN_VISIBLE_MS = 400

/**
 * 生の読み込みフラグから、ちらつき防止済みの表示要否boolean を導出する。
 * showDelayMs未満で読み込みが終わる場合は一度もtrueを返さず、
 * 表示開始後はminVisibleMsが経過するまでtrueを維持する。
 */
export function useDelayedLoading(
  isLoading: boolean,
  options: UseDelayedLoadingOptions = {}
): boolean {
  const {
    showDelayMs = DEFAULT_SHOW_DELAY_MS,
    minVisibleMs = DEFAULT_MIN_VISIBLE_MS,
  } = options

  const [show, setShow] = useState(false)
  const showRef = useRef(show)
  showRef.current = show

  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const visibleSinceRef = useRef<number | null>(null)

  useEffect(() => {
    const clearShowTimer = () => {
      if (showTimerRef.current !== null) {
        clearTimeout(showTimerRef.current)
        showTimerRef.current = null
      }
    }
    const clearHideTimer = () => {
      if (hideTimerRef.current !== null) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
    }

    if (isLoading) {
      clearHideTimer()
      if (!showRef.current && showTimerRef.current === null) {
        showTimerRef.current = setTimeout(() => {
          showTimerRef.current = null
          visibleSinceRef.current = Date.now()
          setShow(true)
        }, showDelayMs)
      }
      return
    }

    clearShowTimer()

    if (!showRef.current) {
      return
    }

    const elapsed = Date.now() - (visibleSinceRef.current ?? Date.now())
    const remaining = minVisibleMs - elapsed

    if (remaining <= 0) {
      visibleSinceRef.current = null
      setShow(false)
      return
    }

    clearHideTimer()
    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null
      visibleSinceRef.current = null
      setShow(false)
    }, remaining)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  useEffect(() => {
    return () => {
      if (showTimerRef.current !== null) clearTimeout(showTimerRef.current)
      if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current)
    }
  }, [])

  return show
}
