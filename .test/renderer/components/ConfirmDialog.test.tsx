import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { ConfirmDialog } from '@/renderer/components/ConfirmDialog'

describe('ConfirmDialog', () => {
  afterEach(() => {
    cleanup()
  })

  it('isOpen=false のとき何も描画しない', () => {
    render(
      <ConfirmDialog
        isOpen={false}
        message="本当に削除しますか？"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        title="削除の確認"
      />
    )
    expect(screen.queryByText('削除の確認')).not.toBeInTheDocument()
  })

  it('isOpen=true のときタイトル・メッセージを表示する', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        message="本当に削除しますか？"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        title="削除の確認"
      />
    )
    expect(screen.getByText('削除の確認')).toBeInTheDocument()
    expect(screen.getByText('本当に削除しますか？')).toBeInTheDocument()
  })

  it('確認ボタンをクリックすると onConfirm が呼ばれる', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        isOpen={true}
        message="本当に削除しますか？"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        title="削除の確認"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('キャンセルボタンをクリックすると onCancel が呼ばれる', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        isOpen={true}
        message="本当に削除しますか？"
        onCancel={onCancel}
        onConfirm={vi.fn()}
        title="削除の確認"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('Escapeキーで閉じると onCancel が呼ばれる', async () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        isOpen={true}
        message="本当に削除しますか？"
        onCancel={onCancel}
        onConfirm={vi.fn()}
        title="削除の確認"
      />
    )
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  it('カスタムの confirmText / cancelText を表示する', () => {
    render(
      <ConfirmDialog
        cancelText="やめる"
        confirmText="削除する"
        isOpen={true}
        message="本当に削除しますか？"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        title="削除の確認"
      />
    )
    expect(screen.getByRole('button', { name: '削除する' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'やめる' })).toBeInTheDocument()
  })
})
