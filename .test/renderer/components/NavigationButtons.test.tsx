import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { NavigationButtons } from '@/renderer/components/NavigationButtons'

describe('NavigationButtons', () => {
  afterEach(() => {
    cleanup()
  })

  it('戻る・進む両方のボタンをaria-label付きで描画する', () => {
    render(
      <NavigationButtons
        canGoBack={true}
        canGoForward={true}
        onGoBack={vi.fn()}
        onGoForward={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Back' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Forward' }),
    ).toBeInTheDocument()
  })

  it('canGoBack=false のとき戻るボタンが disabled になる', () => {
    render(
      <NavigationButtons
        canGoBack={false}
        canGoForward={true}
        onGoBack={vi.fn()}
        onGoForward={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Back' }),
    ).toBeDisabled()
  })

  it('canGoForward=false のとき進むボタンが disabled になる', () => {
    render(
      <NavigationButtons
        canGoBack={true}
        canGoForward={false}
        onGoBack={vi.fn()}
        onGoForward={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Forward' }),
    ).toBeDisabled()
  })

  it('canGoBack=true のとき戻るボタンクリックで onGoBack が呼ばれる', () => {
    const onGoBack = vi.fn()
    render(
      <NavigationButtons
        canGoBack={true}
        canGoForward={true}
        onGoBack={onGoBack}
        onGoForward={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onGoBack).toHaveBeenCalledTimes(1)
  })

  it('canGoForward=true のとき進むボタンクリックで onGoForward が呼ばれる', () => {
    const onGoForward = vi.fn()
    render(
      <NavigationButtons
        canGoBack={true}
        canGoForward={true}
        onGoBack={vi.fn()}
        onGoForward={onGoForward}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Forward' }),
    )
    expect(onGoForward).toHaveBeenCalledTimes(1)
  })

  it('canGoBack=false のとき戻るボタンクリックで onGoBack が呼ばれない', () => {
    const onGoBack = vi.fn()
    render(
      <NavigationButtons
        canGoBack={false}
        canGoForward={true}
        onGoBack={onGoBack}
        onGoForward={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onGoBack).not.toHaveBeenCalled()
  })

  it('canGoForward=false のとき進むボタンクリックで onGoForward が呼ばれない', () => {
    const onGoForward = vi.fn()
    render(
      <NavigationButtons
        canGoBack={true}
        canGoForward={false}
        onGoBack={vi.fn()}
        onGoForward={onGoForward}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Forward' }),
    )
    expect(onGoForward).not.toHaveBeenCalled()
  })

  it('ホバー時にツールチップが表示される', async () => {
    render(
      <NavigationButtons
        canGoBack={true}
        canGoForward={true}
        onGoBack={vi.fn()}
        onGoForward={vi.fn()}
      />,
    )

    fireEvent.mouseEnter(
      screen.getByRole('button', { name: 'Back' }),
    )
    expect(await screen.findByText('Back')).toBeInTheDocument()
  })
})
