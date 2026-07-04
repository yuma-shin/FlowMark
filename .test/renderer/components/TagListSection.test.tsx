import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { TagListSection } from '@/renderer/components/TagListSection'
import type { MarkdownNoteMeta } from '@/shared/types'

const NOTES: MarkdownNoteMeta[] = [
  {
    id: '1',
    title: 'Note One',
    filePath: '/notes/one.md',
    relativePath: 'one.md',
    tags: ['work'],
  },
]

describe('TagListSection', () => {
  afterEach(() => {
    cleanup()
  })

  it('タグをクリックすると onSelectTag が呼ばれる', () => {
    const onSelectTag = vi.fn()
    render(
      <TagListSection
        allNotes={NOTES}
        filteredNotes={NOTES}
        onSelectTag={onSelectTag}
        selectedTag={null}
        showAllNotes={true}
      />
    )
    fireEvent.click(screen.getByText('work'))
    expect(onSelectTag).toHaveBeenCalledWith('work')
  })

  it('選択中のタグはGhostボタンと同じ中立的なbg-accent背景になり、インラインの色付けを持たない', () => {
    render(
      <TagListSection
        allNotes={NOTES}
        filteredNotes={NOTES}
        onSelectTag={vi.fn()}
        selectedTag="work"
        showAllNotes={true}
      />
    )
    const tagButton = screen.getByText('work').closest('button')
    expect(tagButton).toHaveClass('bg-accent')
    expect(tagButton).not.toHaveAttribute('style')
  })
})
