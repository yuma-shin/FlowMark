import { useEffect } from 'react'
import { tauriApi as App } from '@/renderer/lib/tauriApi'

export function useLinkHandler(
  html: string,
  containerRef: React.RefObject<HTMLDivElement | null>
) {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      const link = target.closest('a')
      if (link) {
        const href = link.getAttribute('href')

        if (
          href &&
          (href.startsWith('http://') || href.startsWith('https://'))
        ) {
          e.preventDefault()
          App.shell.openExternal(href)
        }
      }
    }

    const contentElement = containerRef.current
    if (contentElement) {
      contentElement.addEventListener('click', handleClick)
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('click', handleClick)
      }
    }
  }, [html, containerRef])
}
