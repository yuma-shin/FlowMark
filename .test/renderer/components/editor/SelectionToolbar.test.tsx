import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SelectionToolbar } from '@/renderer/components/editor/SelectionToolbar'

function renderToolbar(overrides: Partial<Parameters<typeof SelectionToolbar>[0]> = {}) {
  const props = {
    position: { top: 10, left: 20 },
    onApplyFormat: vi.fn(),
    onApplyList: vi.fn(),
    onApplyQuote: vi.fn(),
    onApplyCheckbox: vi.fn(),
    onApplyColor: vi.fn(),
    onApplyAlert: vi.fn(),
    ...overrides,
  }
  render(<SelectionToolbar {...props} />)
  return props
}

describe('SelectionToolbar', () => {
  afterEach(() => {
    cleanup()
  })

  it('太字ボタンをクリックすると onApplyFormat("**") が呼ばれる', () => {
    const props = renderToolbar()
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
    expect(props.onApplyFormat).toHaveBeenCalledWith('**')
  })

  it('チェックボックスボタンをクリックすると onApplyCheckbox が呼ばれる', () => {
    const props = renderToolbar()
    fireEvent.click(screen.getByRole('button', { name: 'Checkbox' }))
    expect(props.onApplyCheckbox).toHaveBeenCalledTimes(1)
  })

  it('カラーボタンをクリックするとパレットが表示され、選択で onApplyColor が呼ばれる', () => {
    const props = renderToolbar()
    fireEvent.click(screen.getByRole('button', { name: 'Text Color' }))
    fireEvent.click(screen.getByTitle('Red'))
    expect(props.onApplyColor).toHaveBeenCalledWith('#EF4444')
  })
})
