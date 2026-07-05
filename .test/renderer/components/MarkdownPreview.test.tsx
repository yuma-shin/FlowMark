/**
 * MarkdownPreview コンポーネントのテスト
 * 主に Mermaid ダイアグラムのテーマ対応を検証する
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, cleanup } from '@testing-library/react'
import React from 'react'

// ---- Mermaid モック ----
const mockInitialize = vi.fn()
const mockRender = vi.fn().mockResolvedValue({ svg: '<svg id="test">mermaid</svg>' })

vi.mock('mermaid', () => ({
  default: { initialize: mockInitialize, render: mockRender },
}))

// ---- Tauri モック ----
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }))
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: vi.fn(() => ({
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    close: vi.fn(),
    isMaximized: vi.fn().mockResolvedValue(false),
    startDragging: vi.fn(),
    onResized: vi.fn().mockResolvedValue(() => {}),
    onMoved: vi.fn().mockResolvedValue(() => {}),
  })),
}))
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: vi.fn() }))

// ---- Markdown 処理モック (mermaid プレースホルダーを含む) ----
const DIAGRAM = 'graph LR; A-->B'
const ENCODED = encodeURIComponent(DIAGRAM)
const MERMAID_HTML = `<div class="mermaid-placeholder" data-diagram="${ENCODED}"></div>`

vi.mock('@/renderer/hooks/useMarkdownProcessing', () => ({
  useMarkdownProcessing: vi.fn(() => MERMAID_HTML),
}))
vi.mock('@/renderer/hooks/useCodeCopyHandler', () => ({
  useCodeCopyHandler: vi.fn(),
}))
vi.mock('@/renderer/hooks/useCheckboxHandler', () => ({
  useCheckboxHandler: vi.fn(),
}))
vi.mock('@/renderer/hooks/useLinkHandler', () => ({
  useLinkHandler: vi.fn(),
}))
vi.mock('@/renderer/hooks/useImageLightbox', () => ({
  useImageLightbox: vi.fn(() => ({ lightboxSrc: null, closeLightbox: vi.fn() })),
}))
vi.mock('github-markdown-css/github-markdown-light.css', () => ({}))
vi.mock('github-markdown-css/github-markdown-dark.css', () => ({}))

import { MarkdownPreview } from '@/renderer/components/MarkdownPreview'

describe('MarkdownPreview - Mermaid テーマ切替', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    cleanup()
    document.documentElement.classList.remove('dark')
  })

  it('初回レンダリング時に mermaid.initialize がライトテーマで呼ばれる', async () => {
    await act(async () => {
      render(<MarkdownPreview content="```mermaid\ngraph LR; A-->B\n```" />)
    })
    // mermaid.render が呼ばれるまで少し待つ
    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })

    expect(mockInitialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'default' })
    )
  })

  it('ダークモードに切り替えると mermaid.initialize がダークテーマで再呼び出しされる', async () => {
    await act(async () => {
      render(<MarkdownPreview content="```mermaid\ngraph LR; A-->B\n```" />)
    })
    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })

    vi.clearAllMocks()

    // ダークモードに切り替え
    await act(async () => {
      document.documentElement.classList.add('dark')
      await new Promise(r => setTimeout(r, 50))
    })

    expect(mockInitialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark' })
    )
  })
})
