import { describe, it, expect } from 'vitest'
import { builtinThemes } from '@/renderer/lib/themeManager'

describe('builtinThemes の destructive 配色コントラスト', () => {
  for (const theme of builtinThemes) {
    it(`${theme.id} (light): --destructive と --destructive-foreground が異なる値である`, () => {
      expect(theme.light['--destructive-foreground']).not.toBe(
        theme.light['--destructive']
      )
    })

    it(`${theme.id} (dark): --destructive と --destructive-foreground が異なる値である`, () => {
      expect(theme.dark['--destructive-foreground']).not.toBe(
        theme.dark['--destructive']
      )
    })
  }
})
