import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cssPath = resolve(__dirname, '../../src/renderer/globals.css')
const css = readFileSync(cssPath, 'utf-8')

// globals.css には複数の `:root { ... }` ブロックが存在するため、
// 目的の変数を含むブロックのみを対象に抽出する。
function extractBlockContaining(selector: string, mustContain: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`, 'g')
  let match: RegExpExecArray | null
  while ((match = regex.exec(css)) !== null) {
    if (match[1].includes(mustContain)) return match[1]
  }
  throw new Error(
    `Block "${selector}" containing "${mustContain}" not found`
  )
}

function extractVar(block: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`${escaped}:\\s*([^;]+);`).exec(block)
  if (!match) throw new Error(`Variable not found: ${name}`)
  return match[1].trim()
}

describe('globals.css デザイントークンの前景色/背景色コントラスト', () => {
  it('ライトモード: --destructive と --destructive-foreground が異なる値である（同色でテキストが不可視になることを防ぐ）', () => {
    const root = extractBlockContaining(':root', '--destructive:')
    const bg = extractVar(root, '--destructive')
    const fg = extractVar(root, '--destructive-foreground')
    expect(fg).not.toBe(bg)
  })

  it('ダークモード: --destructive と --destructive-foreground が異なる値である', () => {
    const dark = extractBlockContaining('.dark', '--destructive:')
    const bg = extractVar(dark, '--destructive')
    const fg = extractVar(dark, '--destructive-foreground')
    expect(fg).not.toBe(bg)
  })
})
