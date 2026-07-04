import { useEffect, useState } from 'react'

export function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchVersion = async () => {
      try {
        const { getVersion } = await import('@tauri-apps/api/app')
        const result = await getVersion()
        if (!cancelled) {
          setVersion(result)
        }
      } catch (error) {
        console.error('Failed to get app version:', error)
      }
    }

    fetchVersion()

    return () => {
      cancelled = true
    }
  }, [])

  return version
}
