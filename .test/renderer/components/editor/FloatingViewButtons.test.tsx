import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { FloatingViewButtons } from '@/renderer/components/editor/FloatingViewButtons'

describe('FloatingViewButtons', () => {
  afterEach(() => {
    cleanup()
  })

  it('各ボタンをクリックすると onLayoutModeChange が対応するモードで呼ばれる', () => {
    const onLayoutModeChange = vi.fn()
    render(
      <FloatingViewButtons
        layoutMode="split"
        onLayoutModeChange={onLayoutModeChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Editor Only' }))
    expect(onLayoutModeChange).toHaveBeenCalledWith('editor')

    fireEvent.click(screen.getByRole('button', { name: 'Split View' }))
    expect(onLayoutModeChange).toHaveBeenCalledWith('split')

    fireEvent.click(screen.getByRole('button', { name: 'Preview Only' }))
    expect(onLayoutModeChange).toHaveBeenCalledWith('preview')
  })
})
