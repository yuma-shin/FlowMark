import { useMemo } from 'react'
import { stripFrontMatter } from '@/renderer/utils/frontMatter'

export interface EditorContentStats {
  charCount: number
  wordCount: number
  lineCount: number
}

function countStats(body: string): EditorContentStats {
  const trimmed = body.trim()
  const wordCount = trimmed === '' ? 0 : trimmed.split(/\s+/).length

  return {
    charCount: body.length,
    wordCount,
    lineCount: body.split('\n').length,
  }
}

export function useEditorStatus(content: string): EditorContentStats {
  return useMemo(() => countStats(stripFrontMatter(content)), [content])
}
