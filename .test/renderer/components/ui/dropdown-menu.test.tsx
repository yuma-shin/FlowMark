import { useState } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { DropdownMenu } from '@/renderer/components/ui/dropdown-menu'

const OPTIONS = [
  { value: 'a', label: 'オプションA' },
  { value: 'b', label: 'オプションB' },
  { value: 'c', label: 'オプションC' },
]

function ControlledDropdown({
  onChange,
}: {
  onChange?: (value: string) => void
}) {
  const [value, setValue] = useState('a')
  return (
    <DropdownMenu
      items={OPTIONS}
      onChange={next => {
        setValue(next)
        onChange?.(next)
      }}
      trigger={<button type="button">開く</button>}
      value={value}
    />
  )
}

describe('DropdownMenu', () => {
  afterEach(() => {
    cleanup()
  })

  it('初期状態では選択肢を表示しない', () => {
    render(<ControlledDropdown />)
    expect(screen.queryByText('オプションB')).not.toBeInTheDocument()
  })

  it('トリガークリックで選択肢一覧を表示する', () => {
    render(<ControlledDropdown />)
    fireEvent.click(screen.getByRole('button', { name: '開く' }))
    expect(screen.getByText('オプションA')).toBeInTheDocument()
    expect(screen.getByText('オプションB')).toBeInTheDocument()
    expect(screen.getByText('オプションC')).toBeInTheDocument()
  })

  it('選択済みの項目に aria-selected を付与する', () => {
    render(<ControlledDropdown />)
    fireEvent.click(screen.getByRole('button', { name: '開く' }))
    expect(screen.getByText('オプションA')).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByText('オプションB')).toHaveAttribute(
      'aria-selected',
      'false'
    )
  })

  it('項目をクリックすると onChange が呼ばれ、選択肢一覧を閉じる', () => {
    const onChange = vi.fn()
    render(<ControlledDropdown onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '開く' }))
    fireEvent.click(screen.getByText('オプションB'))

    expect(onChange).toHaveBeenCalledWith('b')
    expect(screen.queryByText('オプションB')).not.toBeInTheDocument()
  })

  it('矢印キーで選択項目を移動し、Enterキーで確定する', () => {
    const onChange = vi.fn()
    render(<ControlledDropdown onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '開く' }))

    const listbox = screen.getByRole('listbox')
    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    fireEvent.keyDown(listbox, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith('b')
  })
})
