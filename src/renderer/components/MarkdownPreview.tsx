import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import { useMarkdownProcessing } from '@/renderer/hooks/useMarkdownProcessing'
import { useCodeCopyHandler } from '@/renderer/hooks/useCodeCopyHandler'
import { useCheckboxHandler } from '@/renderer/hooks/useCheckboxHandler'
import { useLinkHandler } from '@/renderer/hooks/useLinkHandler'
import { useImageLightbox } from '@/renderer/hooks/useImageLightbox'
import { tauriApi } from '@/renderer/lib/tauriApi'
import 'github-markdown-css/github-markdown-light.css'
import 'github-markdown-css/github-markdown-dark.css'
import hljsLightCss from 'highlight.js/styles/github.min.css?inline'
import hljsDarkCss from 'highlight.js/styles/github-dark.min.css?inline'

interface MarkdownPreviewProps {
  content: string
  scrollRef?: React.RefObject<HTMLDivElement | null>
  onScroll?: (
    scrollTop: number,
    scrollHeight: number,
    clientHeight: number
  ) => void
  onChange?: (content: string) => void
  noteDir?: string
}

export function MarkdownPreview({
  content,
  scrollRef,
  onScroll,
  onChange,
  noteDir,
}: MarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )
  const prevIsDarkRef = useRef<boolean | null>(null)

  // Custom hooks
  const html = useMarkdownProcessing(content, noteDir)
  useCodeCopyHandler(html, contentRef)
  useCheckboxHandler(content, contentRef, onChange)
  useLinkHandler(html, contentRef)
  const { lightboxSrc, closeLightbox } = useImageLightbox(html, contentRef)

  // highlight.jsのテーマを動的に読み込む
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark')
      const themeId = 'hljs-theme'

      const existingStyle = document.getElementById(themeId)
      if (existingStyle) {
        existingStyle.remove()
      }

      const style = document.createElement('style')
      style.id = themeId
      style.textContent = isDark ? hljsDarkCss : hljsLightCss
      document.head.appendChild(style)

      const markdownBody = document.querySelector('.markdown-body')
      if (markdownBody) {
        markdownBody.setAttribute('data-color-mode', isDark ? 'dark' : 'light')
      }
    }

    updateTheme()

    const observer = new MutationObserver(() => {
      updateTheme()
      setIsDark(document.documentElement.classList.contains('dark'))
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => {
      observer.disconnect()
      const link = document.getElementById('hljs-theme')
      if (link) {
        link.remove()
      }
    }
  }, [])

  useEffect(() => {
    if (!contentRef.current) return

    // テーマが変わったかを判定（変わった場合はキャッシュをスキップして全図を再レンダリング）
    const themeChanged =
      prevIsDarkRef.current !== null && prevIsDarkRef.current !== isDark
    prevIsDarkRef.current = isDark

    // innerHTML 置き換え前に既存の Mermaid SVG をキャッシュ
    // (diagram ソースをキーにして、変更のない図は再レンダリングせず即座に復元する)
    // テーマ変更時はキャッシュを使用しない（旧テーマの SVG を復元しないため）
    const mermaidCache = new Map<string, string>()
    if (!themeChanged) {
      for (const el of contentRef.current.querySelectorAll<HTMLElement>(
        '.mermaid-placeholder'
      )) {
        const encoded = el.getAttribute('data-diagram')
        if (encoded && el.querySelector('svg')) {
          mermaidCache.set(encoded, el.innerHTML)
        }
      }
    }

    contentRef.current.innerHTML = html

    // アセットプロトコルで画像が読み込めない場合（主にインストール済みパッケージ）に
    // base64 データ URL に差し替えるフォールバック
    const applyBase64Fallback = (img: HTMLImageElement) => {
      const tauriPath = img.getAttribute('data-tauri-path')
      if (!tauriPath) return
      tauriApi.image
        .getAsBase64(tauriPath)
        .then(dataUrl => {
          img.src = dataUrl
        })
        .catch(() => {
          // 読み込み失敗は無視
        })
    }

    for (const el of contentRef.current.querySelectorAll<HTMLImageElement>(
      'img[data-tauri-path]'
    )) {
      if (el.complete && el.naturalWidth === 0) {
        // すでに読み込み失敗している
        applyBase64Fallback(el)
      } else {
        el.addEventListener('error', () => applyBase64Fallback(el), {
          once: true,
        })
      }
    }

    // キャッシュ済み SVG を即座に復元し、コンテンツ高さの崩壊を防ぐ
    const placeholders = contentRef.current.querySelectorAll<HTMLElement>(
      '.mermaid-placeholder'
    )
    const needsRender: HTMLElement[] = []
    for (const el of placeholders) {
      const encoded = el.getAttribute('data-diagram')
      if (encoded && mermaidCache.has(encoded)) {
        el.innerHTML = mermaidCache.get(encoded) ?? ''
        el.style.textAlign = 'center'
      } else {
        needsRender.push(el)
      }
    }

    if (needsRender.length === 0) return

    // 新規・変更された図のみ Mermaid でレンダリング（遅延ロード）
    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
      })

      for (const [i, el] of needsRender.entries()) {
        const encoded = el.getAttribute('data-diagram')
        if (!encoded) continue
        const diagram = decodeURIComponent(encoded)
        const id = `mermaid-${Date.now()}-${i}`
        mermaid
          .render(id, diagram)
          .then(({ svg }: { svg: string }) => {
            el.innerHTML = svg
            el.style.textAlign = 'center'
          })
          .catch((err: unknown) => {
            const errorMessage =
              err instanceof Error ? err.message : String(err)
            el.innerHTML = `<pre style="color:var(--destructive);background:color-mix(in srgb, var(--destructive) 8%, transparent);border:1px solid color-mix(in srgb, var(--destructive) 30%, transparent);border-radius:var(--radius-md);padding:10px 14px;font-size:0.8rem;white-space:pre-wrap;overflow-x:auto;">${errorMessage}</pre>`
          })
          .finally(() => {
            // mermaid.render() がエラー時に document.body へ残す要素を確実に削除
            // ただしビュアー内の要素（描画済み SVG）は削除しない
            for (const strayId of [id, `d${id}`]) {
              const stray = document.getElementById(strayId)
              if (stray && !contentRef.current?.contains(stray)) {
                stray.remove()
              }
            }
          })
      }
    })
  }, [html, isDark])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (onScroll) {
      const target = e.currentTarget
      onScroll(target.scrollTop, target.scrollHeight, target.clientHeight)
    }
  }

  return (
    <div
      className="bg-background flex justify-center min-h-full"
      onScroll={handleScroll}
      ref={scrollRef || containerRef}
    >
      <div
        className="markdown-body w-full max-w-6xl px-8 pt-8"
        data-color-mode={
          document.documentElement.classList.contains('dark') ? 'dark' : 'light'
        }
        ref={contentRef}
        style={{
          colorScheme: document.documentElement.classList.contains('dark')
            ? 'dark'
            : 'light',
        }}
      />

      {lightboxSrc && (
        <button
          aria-label="拡大画像を閉じる"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out"
          onClick={closeLightbox}
          type="button"
        >
          <img
            alt="拡大画像"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            src={lightboxSrc}
          />
        </button>
      )}
    </div>
  )
}
