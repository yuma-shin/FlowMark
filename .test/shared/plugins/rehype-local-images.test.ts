import { describe, it, expect, vi } from 'vitest'

// convertFileSrc はブラウザ（Tauri WebView）専用 API のため、テスト環境でモックする
vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: (path: string) =>
    `asset://localhost/${encodeURIComponent(path.replace(/\\/g, '/'))}`,
}))

import { rehypeLocalImages } from '@/renderer/plugins/rehypeLocalImages'
import { remark } from 'remark'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'

async function processMarkdown(md: string, noteDir: string): Promise<string> {
  const result = await remark()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeLocalImages, { noteDir })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md)
  return String(result)
}

describe('rehypeLocalImages', () => {
  it('should convert relative image paths to asset:// URLs', async () => {
    const md = '![alt](images/photo.png)'
    const html = await processMarkdown(md, '/root/notes')
    expect(html).toContain('src="asset://localhost/')
    expect(html).toContain('images%2Fphoto.png')
  })

  it('should skip absolute http URLs', async () => {
    const md = '![alt](https://example.com/photo.png)'
    const html = await processMarkdown(md, '/root/notes')
    expect(html).toContain('src="https://example.com/photo.png"')
  })

  it('should skip data: URLs', async () => {
    const md = '![alt](data:image/png;base64,abc)'
    const html = await processMarkdown(md, '/root/notes')
    expect(html).toContain('src="data:image/png;base64,abc"')
  })

  it('should skip already converted asset:// URLs', async () => {
    const md = '![alt](asset://localhost/root/notes/images/photo.png)'
    const html = await processMarkdown(md, '/root/notes')
    expect(html).toContain('src="asset://localhost/root/notes/images/photo.png"')
  })

  it('should handle images/ prefix correctly', async () => {
    const md = '![test](images/note_20260216_001.jpg)'
    const html = await processMarkdown(md, '/my/project')
    expect(html).toContain('src="asset://localhost/')
    expect(html).toContain('note_20260216_001.jpg')
  })

  it('should handle blob: URLs by skipping them', async () => {
    const md = '![alt](blob:http://localhost/abc)'
    const html = await processMarkdown(md, '/root')
    expect(html).toContain('src="blob:http://localhost/abc"')
  })

  it('should handle multiple images in a single document', async () => {
    const md = '![a](images/a.png)\n\n![b](https://cdn.example.com/b.png)\n\n![c](images/c.jpg)'
    const html = await processMarkdown(md, '/root')
    // 相対パスは asset:// に変換される
    expect(html).toMatch(/src="asset:\/\/localhost\/[^"]*a\.png"/)
    expect(html).toContain('src="https://cdn.example.com/b.png"')
    expect(html).toMatch(/src="asset:\/\/localhost\/[^"]*c\.jpg"/)
  })

  it('should handle Windows-style noteDir paths with forward slashes', async () => {
    const md = '![alt](images/photo.png)'
    const html = await processMarkdown(md, 'C:/Users/test/notes')
    expect(html).toContain('src="asset://localhost/')
    expect(html).toContain('photo.png')
  })

  it('should handle Windows-style noteDir paths with backslashes', async () => {
    const md = '![alt](images/photo.png)'
    const html = await processMarkdown(md, 'C:\\Users\\test\\notes')
    expect(html).toContain('src="asset://localhost/')
    expect(html).toContain('photo.png')
  })
})
