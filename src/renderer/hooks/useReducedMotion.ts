import { useEffect, useState } from 'react'

/**
 * OS/ブラウザの「視覚効果を減らす」設定を購読し、真偽値として提供する。
 * `prefers-reduced-motion: reduce` が有効なら `true` を返す。
 * ブラウザ非対応環境では `false` を返す。
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return
    }

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')

    const handleChange = (event: MediaQueryListEvent) => {
      setReduced(event.matches)
    }

    mql.addEventListener('change', handleChange)

    return () => {
      mql.removeEventListener('change', handleChange)
    }
  }, [])

  return reduced
}
