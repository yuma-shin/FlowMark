import { useEffect, useState } from 'react'

/**
 * 指定されたメディアクエリの一致状態を購読し、真偽値として提供する。
 * `window.matchMedia` を使用してクエリを評価し、`change` イベントで状態を更新する。
 * ブラウザ非対応環境では `false` を返す。
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return false
    }
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return
    }

    const mql = window.matchMedia(query)

    // Sync state in case query changed between render and effect
    setMatches(mql.matches)

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mql.addEventListener('change', handleChange)

    return () => {
      mql.removeEventListener('change', handleChange)
    }
  }, [query])

  return matches
}
