import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { NoteItem } from '@/renderer/components/NoteItem'
import type { MarkdownNoteMeta } from '@/shared/types'

const NOTE: MarkdownNoteMeta = {
  id: '1',
  title: 'サンプルノート',
  filePath: '/notes/sample.md',
  relativePath: 'sample.md',
  excerpt: '本文の抜粋',
  tags: ['work', 'urgent'],
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('NoteItem', () => {
  afterEach(() => {
    cleanup()
  })

  it('タイトル・抜粋・タグを表示する', () => {
    render(
      <NoteItem
        isSelected={false}
        note={NOTE}
        onDoubleClick={vi.fn()}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText('サンプルノート')).toBeInTheDocument()
    expect(screen.getByText('本文の抜粋')).toBeInTheDocument()
    expect(screen.getByText('work')).toBeInTheDocument()
  })

  it('クリックすると onSelect が呼ばれる', () => {
    const onSelect = vi.fn()
    render(
      <NoteItem
        isSelected={false}
        note={NOTE}
        onDoubleClick={vi.fn()}
        onSelect={onSelect}
      />
    )
    fireEvent.click(screen.getByText('サンプルノート'))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('選択中はサイドバー項目と同じsidebar-item/data-activeで角丸ハイライトになる', () => {
    render(
      <NoteItem
        isSelected={true}
        note={NOTE}
        onDoubleClick={vi.fn()}
        onSelect={vi.fn()}
      />
    )
    const row = screen.getByText('サンプルノート').closest('.group')
    expect(row).toHaveClass('sidebar-item')
    expect(row).toHaveAttribute('data-active', 'true')
    expect(row).not.toHaveAttribute('style')
  })

  it('未選択のときはdata-activeがfalseになる', () => {
    render(
      <NoteItem
        isSelected={false}
        note={NOTE}
        onDoubleClick={vi.fn()}
        onSelect={vi.fn()}
      />
    )
    const row = screen.getByText('サンプルノート').closest('.group')
    expect(row).toHaveAttribute('data-active', 'false')
  })

  it('更新日はタイトルと同じ行に圧縮表示される', () => {
    render(
      <NoteItem
        isSelected={false}
        note={NOTE}
        onDoubleClick={vi.fn()}
        onSelect={vi.fn()}
      />
    )
    const title = screen.getByText('サンプルノート')
    const dateText = screen.getByText('2026年1月1日')
    expect(title.parentElement).toBe(dateText.parentElement)
  })

  it('削除ボタンをクリックすると onDelete が呼ばれる', () => {
    const onDelete = vi.fn()
    render(
      <NoteItem
        isSelected={false}
        note={NOTE}
        onDelete={onDelete}
        onDoubleClick={vi.fn()}
        onSelect={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('削除ゾーンはabsolute配置のオーバーレイで、本文エリアの幅を一切圧迫しない', () => {
    render(
      <NoteItem
        isSelected={false}
        note={NOTE}
        onDelete={vi.fn()}
        onDoubleClick={vi.fn()}
        onSelect={vi.fn()}
      />
    )
    const button = screen.getByRole('button', { name: 'Delete' })
    const zone = button.parentElement!
    expect(zone).toHaveClass('absolute')
    const contentButton = screen.getByText('サンプルノート').closest('button')
    expect(contentButton).toHaveClass('w-full')
    expect(contentButton).not.toHaveClass('pr-9')
    expect(contentButton).not.toHaveClass('flex-1')
  })

  it('削除ゾーンは未ホバー時は非表示で、行ホバーでフェードイン・ボタン直接ホバーで実色になる', () => {
    render(
      <NoteItem
        isSelected={false}
        note={NOTE}
        onDelete={vi.fn()}
        onDoubleClick={vi.fn()}
        onSelect={vi.fn()}
      />
    )
    const button = screen.getByRole('button', { name: 'Delete' })
    const zone = button.parentElement!
    expect(zone).toHaveClass('opacity-0')
    expect(zone).toHaveClass('group-hover:opacity-100')
    expect(button).toHaveClass('hover:bg-destructive')
  })

  it('ホバー時のアイコン色はテーマ変数に依存せず常に白になる', () => {
    render(
      <NoteItem
        isSelected={false}
        note={NOTE}
        onDelete={vi.fn()}
        onDoubleClick={vi.fn()}
        onSelect={vi.fn()}
      />
    )
    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toHaveClass('hover:text-white')
    expect(button).not.toHaveClass('hover:text-destructive-foreground')
  })

  it('ノートアイテムの左右余白は控えめにする', () => {
    render(
      <NoteItem
        isSelected={false}
        note={NOTE}
        onDoubleClick={vi.fn()}
        onSelect={vi.fn()}
      />
    )
    const row = screen.getByText('サンプルノート').closest('.group')
    expect(row).not.toHaveClass('mx-2')
  })
})
