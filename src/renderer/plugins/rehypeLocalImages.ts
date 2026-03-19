import { visit } from 'unist-util-visit'
import type { Root, Element } from 'hast'
import { convertFileSrc } from '@tauri-apps/api/core'

interface RehypeLocalImagesOptions {
  noteDir: string
}

const PROTOCOL_PREFIXES = [
  'http://',
  'https://',
  'data:',
  'blob:',
  'asset://',
  'https://asset.localhost',
]

export function rehypeLocalImages(options: RehypeLocalImagesOptions) {
  const { noteDir } = options

  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return

      const src = node.properties?.src
      if (typeof src !== 'string' || !src) return

      // Skip URLs that already have a protocol (including Tauri asset protocol)
      if (PROTOCOL_PREFIXES.some(prefix => src.startsWith(prefix))) return

      // Convert relative path to Tauri asset:// URL via convertFileSrc
      const normalizedDir = noteDir.replace(/\\/g, '/')
      const absolutePath = `${normalizedDir}/${src}`
      node.properties.src = convertFileSrc(absolutePath)
      // Store absolute path as fallback for environments where asset protocol fails
      node.properties['data-tauri-path'] = absolutePath
    })
  }
}
