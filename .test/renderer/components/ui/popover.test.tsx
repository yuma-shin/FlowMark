import { useState } from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Popover } from '@/renderer/components/ui/popover'

function ControlledPopover() {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={<button type="button">開く</button>}
    >
      <div>パネル内容</div>
    </Popover>
  )
}

describe('Popover', () => {
  afterEach(() => {
    cleanup()
  })

  it('open=false のときパネルを表示しない', () => {
    render(<ControlledPopover />)
    expect(screen.queryByText('パネル内容')).not.toBeInTheDocument()
  })

  it('トリガーをクリックするとパネルを表示する', () => {
    render(<ControlledPopover />)
    fireEvent.click(screen.getByRole('button', { name: '開く' }))
    expect(screen.getByText('パネル内容')).toBeInTheDocument()
  })

  it('Escapeキーでパネルを閉じる', () => {
    render(<ControlledPopover />)
    fireEvent.click(screen.getByRole('button', { name: '開く' }))
    expect(screen.getByText('パネル内容')).toBeInTheDocument()

    fireEvent.keyDown(screen.getByText('パネル内容'), {
      key: 'Escape',
      code: 'Escape',
    })

    expect(screen.queryByText('パネル内容')).not.toBeInTheDocument()
  })

  it('パネル外をクリックすると閉じる', () => {
    render(
      <div>
        <div data-testid="outside">外側</div>
        <ControlledPopover />
      </div>
    )
    fireEvent.click(screen.getByRole('button', { name: '開く' }))
    expect(screen.getByText('パネル内容')).toBeInTheDocument()

    fireEvent.pointerDown(screen.getByTestId('outside'))

    expect(screen.queryByText('パネル内容')).not.toBeInTheDocument()
  })
})
