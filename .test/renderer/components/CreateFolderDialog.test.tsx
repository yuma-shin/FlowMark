import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { CreateFolderDialog } from '@/renderer/components/CreateFolderDialog'

describe('CreateFolderDialog', () => {
  afterEach(() => {
    cleanup()
  })

  it('isOpen=false のとき何も描画しない', () => {
    render(
      <CreateFolderDialog
        currentPath=""
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.queryByText('Create Folder')).not.toBeInTheDocument()
  })

  it('現在のパスを表示する', () => {
    render(
      <CreateFolderDialog
        currentPath="Work/Projects"
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByText('Location')).toBeInTheDocument()
    expect(screen.getByText('Work/Projects')).toBeInTheDocument()
  })

  it('入力欄上部に placeholder と重複するラベルを表示しない', () => {
    render(
      <CreateFolderDialog
        currentPath=""
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    )
    // "Folder Name" は placeholder（およびaria-label）としてのみ存在し、
    // 入力欄の外側に可視ラベルとして重複表示されない
    expect(screen.queryAllByText('Folder Name')).toHaveLength(0)
    expect(screen.getByPlaceholderText('Folder Name')).toBeInTheDocument()
  })

  it('フォルダ名を入力して送信すると onSubmit が呼ばれ、閉じる', () => {
    const onSubmit = vi.fn()
    const onClose = vi.fn()
    render(
      <CreateFolderDialog
        currentPath=""
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Folder Name'), {
      target: { value: 'NewFolder' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSubmit).toHaveBeenCalledWith('NewFolder')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Escapeキーで閉じると onClose が呼ばれる', async () => {
    const onClose = vi.fn()
    render(
      <CreateFolderDialog
        currentPath=""
        isOpen={true}
        onClose={onClose}
        onSubmit={vi.fn()}
      />
    )
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })
})
