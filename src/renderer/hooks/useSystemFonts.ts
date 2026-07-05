import { useState, useEffect, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface UseSystemFontsResult {
  fonts: string[]
  isLoading: boolean
  error: string | null
  refresh: () => void
}

// Module-level cache shared across all hook instances
let cachedFonts: string[] | null = null

export function useSystemFonts(): UseSystemFontsResult {
  const [fonts, setFonts] = useState<string[]>(cachedFonts ?? [])
  const [isLoading, setIsLoading] = useState(cachedFonts === null)
  const [error, setError] = useState<string | null>(null)
  const isFetching = useRef(false)

  const fetchFonts = useCallback(async (force = false) => {
    if (!force && cachedFonts !== null) {
      setFonts(cachedFonts)
      setIsLoading(false)
      return
    }
    if (isFetching.current) return
    isFetching.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await invoke<string[]>('list_system_fonts')
      cachedFonts = result
      setFonts(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
      isFetching.current = false
    }
  }, [])

  useEffect(() => {
    fetchFonts()
  }, [fetchFonts])

  const refresh = useCallback(() => {
    cachedFonts = null
    fetchFonts(true)
  }, [fetchFonts])

  return { fonts, isLoading, error, refresh }
}
