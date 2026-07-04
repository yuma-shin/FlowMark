import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SortDropdown } from '@/renderer/components/SortDropdown'

describe('SortDropdown', () => {
  afterEach(() => {
    cleanup()
  })

  it('トリガーボタンはノートリストのフィルター行に合わせた小さめサイズになる', () => {
    render(<SortDropdown onChange={vi.fn()} value="date-desc" />)
    expect(screen.getByRole('button').className).toContain('size-6')
  })

  it('トリガークリックでソート選択肢を表示する', () => {
    render(<SortDropdown onChange={vi.fn()} value="date-desc" />)
    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByText('Date (Newest)')).toBeInTheDocument()
    expect(screen.getByText('Date (Oldest)')).toBeInTheDocument()
    expect(screen.getByText('Title (A-Z)')).toBeInTheDocument()
    expect(screen.getByText('Title (Z-A)')).toBeInTheDocument()
  })

  it('選択肢をクリックすると onChange が呼ばれる', () => {
    const onChange = vi.fn()
    render(<SortDropdown onChange={onChange} value="date-desc" />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Title (A-Z)'))

    expect(onChange).toHaveBeenCalledWith('title-asc')
  })

  it('現在の value に対応する選択肢が aria-selected になる', () => {
    render(<SortDropdown onChange={vi.fn()} value="title-desc" />)
    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByText('Title (Z-A)')).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })
})
