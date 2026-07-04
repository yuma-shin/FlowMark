import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { CreateNoteDialog } from '@/renderer/components/CreateNoteDialog'

describe('CreateNoteDialog', () => {
  afterEach(() => {
    cleanup()
  })

  it('isOpen=false のとき何も描画しない', () => {
    render(
      <CreateNoteDialog isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(screen.queryByText('Create Note')).not.toBeInTheDocument()
  })

  it('入力が空の場合、作成ボタンは無効化される', () => {
    render(
      <CreateNoteDialog isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
  })

  it('入力欄上部に placeholder と重複するラベルを表示しない', () => {
    render(
      <CreateNoteDialog isOpen={true} onClose={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(screen.queryAllByText('Note Name')).toHaveLength(0)
    expect(screen.getByPlaceholderText('Note Name')).toBeInTheDocument()
  })

  it('タイトルを入力して送信すると onSubmit が呼ばれ、閉じる', () => {
    const onSubmit = vi.fn()
    const onClose = vi.fn()
    render(
      <CreateNoteDialog isOpen={true} onClose={onClose} onSubmit={onSubmit} />
    )

    fireEvent.change(screen.getByPlaceholderText('Note Name'), {
      target: { value: '新しいノート' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSubmit).toHaveBeenCalledWith('新しいノート')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Escapeキーで閉じると onClose が呼ばれる', async () => {
    const onClose = vi.fn()
    render(
      <CreateNoteDialog isOpen={true} onClose={onClose} onSubmit={vi.fn()} />
    )
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
