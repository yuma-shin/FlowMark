import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { FolderTree } from '@/renderer/components/FolderTree'
import type { FolderNode } from '@/shared/types'

const TREE: FolderNode = {
  name: 'root',
  relativePath: '',
  notes: [],
  children: [
    { name: 'Work', relativePath: 'Work', notes: [], children: [] },
  ],
}

describe('FolderTree', () => {
  afterEach(() => {
    cleanup()
  })

  it('ルート直下のフォルダを表示する', () => {
    render(
      <FolderTree
        node={TREE}
        onSelectFolder={vi.fn()}
        selectedFolder=""
      />
    )
    expect(screen.getByText('Work')).toBeInTheDocument()
  })

  it('フォルダをクリックすると onSelectFolder が呼ばれる', () => {
    const onSelectFolder = vi.fn()
    render(
      <FolderTree
        node={TREE}
        onSelectFolder={onSelectFolder}
        selectedFolder=""
      />
    )
    fireEvent.click(screen.getByText('Work'))
    expect(onSelectFolder).toHaveBeenCalledWith('Work')
  })

  it('選択中のフォルダにGhostボタンと同じ中立的なアクティブ背景が適用される', () => {
    render(
      <FolderTree
        node={TREE}
        onSelectFolder={vi.fn()}
        selectedFolder="Work"
      />
    )
    const item = screen.getByText('Work').closest('[role="treeitem"]')
    expect(item).toHaveAttribute('data-active', 'true')
    expect(item).toHaveClass('sidebar-item')
  })

  it('未選択のフォルダは data-active が false になる', () => {
    render(
      <FolderTree
        node={TREE}
        onSelectFolder={vi.fn()}
        selectedFolder=""
      />
    )
    const item = screen.getByText('Work').closest('[role="treeitem"]')
    expect(item).toHaveAttribute('data-active', 'false')
  })

  it('ヘッダー全体はノートリストと同じ固定高さ(h-22)で、タイトル行はh-12', () => {
    render(<FolderTree node={TREE} onSelectFolder={vi.fn()} selectedFolder="" />)
    const titleRow = screen.getByText('Folders').closest('.h-12')
    expect(titleRow).not.toHaveClass('border-b')
    const wrapper = titleRow?.parentElement
    expect(wrapper).toHaveClass('border-b')
    expect(wrapper).toHaveClass('h-22')
  })

  it('幅を指定するとインラインスタイルで幅が固定される', () => {
    render(
      <FolderTree
        node={TREE}
        onSelectFolder={vi.fn()}
        selectedFolder=""
        width={300}
      />
    )
    expect(screen.getByText('Work').closest('.h-full')).toHaveStyle({
      width: '300px',
    })
  })
})
