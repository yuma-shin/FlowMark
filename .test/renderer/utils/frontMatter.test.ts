import { describe, it, expect } from 'vitest'
import { stripFrontMatter } from '@/renderer/utils/frontMatter'

describe('stripFrontMatter', () => {
  it('Front Matterがある場合は本文のみを返す', () => {
    const raw = '---\ntitle: Hello\n---\nBody text'
    expect(stripFrontMatter(raw)).toBe('Body text')
  })

  it('Front Matterがない場合は入力をそのまま返す', () => {
    const raw = 'Just body text'
    expect(stripFrontMatter(raw)).toBe('Just body text')
  })

  it('終端の"\\n---\\n"が存在しない不正形式の場合は入力をそのまま返す', () => {
    const raw = '---\ntitle: Hello\nBody text'
    expect(stripFrontMatter(raw)).toBe(raw)
  })

  it('空文字列の場合は空文字列を返す', () => {
    expect(stripFrontMatter('')).toBe('')
  })

  it('Front Matterのみで本文が無い場合は空文字列を返す', () => {
    const raw = '---\ntitle: Hello\n---\n'
    expect(stripFrontMatter(raw)).toBe('')
  })
})
