import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MarkdownToolbar } from '@/renderer/components/editor/MarkdownToolbar'

function renderToolbar(overrides: Partial<Parameters<typeof MarkdownToolbar>[0]> = {}) {
  const props = {
    onApplyFormat: vi.fn(),
    onApplyList: vi.fn(),
    onApplyHeading: vi.fn(),
    onApplyQuote: vi.fn(),
    onApplyCheckbox: vi.fn(),
    onApplyTable: vi.fn(),
    showColorPalette: false,
    showAlertPalette: false,
    showHeadingPalette: false,
    showTablePicker: false,
    onToggleColorPalette: vi.fn(),
    onToggleAlertPalette: vi.fn(),
    onToggleHeadingPalette: vi.fn(),
    onToggleTablePicker: vi.fn(),
    onApplyColor: vi.fn(),
    onApplyAlert: vi.fn(),
    ...overrides,
  }
  render(<MarkdownToolbar {...props} />)
  return props
}

describe('MarkdownToolbar', () => {
  afterEach(() => {
    cleanup()
  })

  it('太字ボタンをクリックすると onApplyFormat("**") が呼ばれる', () => {
    const props = renderToolbar()
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
    expect(props.onApplyFormat).toHaveBeenCalledWith('**')
  })

  it('引用ボタンをクリックすると onApplyQuote が呼ばれる', () => {
    const props = renderToolbar()
    fireEvent.click(screen.getByRole('button', { name: 'Quote' }))
    expect(props.onApplyQuote).toHaveBeenCalledTimes(1)
  })

  it('見出しボタンをクリックすると onToggleHeadingPalette が呼ばれ、パレットから選択すると onApplyHeading が呼ばれる', () => {
    const props = renderToolbar({ showHeadingPalette: true })
    fireEvent.click(screen.getByRole('button', { name: 'Heading' }))
    expect(props.onToggleHeadingPalette).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTitle('見出し2'))
    expect(props.onApplyHeading).toHaveBeenCalledWith(2)
  })

  it('画像挿入中は画像ボタンが disabled になる', () => {
    renderToolbar({ onImageInsert: vi.fn(), isImageInserting: true })
    expect(screen.getByRole('button', { name: 'Insert Image' })).toBeDisabled()
  })
})
