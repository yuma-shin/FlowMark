import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MetadataEditor } from '@/renderer/components/MetadataEditor'

describe('MetadataEditor', () => {
  afterEach(() => {
    cleanup()
  })

  it('タイトルとファイル名を表示する', () => {
    render(
      <MetadataEditor
        filePath="/notes/example.md"
        onSave={vi.fn()}
        tags={['work']}
        title="サンプルノート"
      />
    )
    expect(screen.getByDisplayValue('サンプルノート')).toBeInTheDocument()
    expect(screen.getByText('example.md')).toBeInTheDocument()
    expect(screen.getByText('work')).toBeInTheDocument()
  })

  it('サイドバー/ノートリストと同じ固定高さ(h-22)になる', () => {
    render(
      <MetadataEditor
        filePath="/notes/example.md"
        onSave={vi.fn()}
        tags={['work']}
        title="サンプルノート"
      />
    )
    const wrapper = screen.getByDisplayValue('サンプルノート').closest('.border-b')
    expect(wrapper).toHaveClass('h-22')
  })

  it('タイトルを編集すると500ms後に onSave が呼ばれる', async () => {
    vi.useFakeTimers()
    const onSave = vi.fn()
    render(
      <MetadataEditor
        filePath="/notes/example.md"
        onSave={onSave}
        tags={[]}
        title="旧タイトル"
      />
    )

    fireEvent.change(screen.getByDisplayValue('旧タイトル'), {
      target: { value: '新タイトル' },
    })

    await vi.advanceTimersByTimeAsync(500)

    expect(onSave).toHaveBeenCalledWith('新タイトル', [])
    vi.useRealTimers()
  })

  it('タグ追加ボタンから新しいタグを追加できる', async () => {
    const onSave = vi.fn()
    render(
      <MetadataEditor
        filePath="/notes/example.md"
        onSave={onSave}
        tags={[]}
        title="タイトル"
      />
    )

    fireEvent.click(screen.getByText('Click to create a tag'))
    const input = screen.getByPlaceholderText('Add tag...')
    fireEvent.change(input, { target: { value: 'newtag' } })
    fireEvent.submit(input.closest('form')!)

    expect(screen.getByText('newtag')).toBeInTheDocument()
  })
})
