import { useState } from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { Dialog } from '@/renderer/components/ui/dialog'

function ControlledDialog({
  initialOpen = true,
}: {
  initialOpen?: boolean
}) {
  const [open, setOpen] = useState(initialOpen)
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        開く
      </button>
      <Dialog
        description="この操作は取り消せません"
        onOpenChange={setOpen}
        open={open}
        title="削除の確認"
      >
        <p>本文コンテンツ</p>
      </Dialog>
    </>
  )
}

describe('Dialog', () => {
  afterEach(() => {
    cleanup()
  })

  it('open=true のときタイトル・説明・children を表示する', async () => {
    render(<ControlledDialog />)
    expect(await screen.findByText('削除の確認')).toBeInTheDocument()
    expect(screen.getByText('この操作は取り消せません')).toBeInTheDocument()
    expect(screen.getByText('本文コンテンツ')).toBeInTheDocument()
  })

  it('open=false のとき何も描画しない', () => {
    render(<ControlledDialog initialOpen={false} />)
    expect(screen.queryByText('削除の確認')).not.toBeInTheDocument()
  })

  it('Escapeキーで閉じる（onOpenChangeがfalseで呼ばれる）', async () => {
    render(<ControlledDialog />)
    await screen.findByText('削除の確認')

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByText('削除の確認')).not.toBeInTheDocument()
    })
  })

  it('role="dialog" と aria-modal を持つ', async () => {
    render(<ControlledDialog />)
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('マウント後にトランジション状態が"open"へ遷移し、表示状態になる（opacity-0のまま固まらない）', async () => {
    render(<ControlledDialog />)
    const dialog = await screen.findByRole('dialog')

    await waitFor(() => {
      expect(dialog).toHaveAttribute('data-status', 'open')
    })
    expect(dialog.className).toContain('opacity-100')
    expect(dialog.className).not.toContain('opacity-0')
  })
})
