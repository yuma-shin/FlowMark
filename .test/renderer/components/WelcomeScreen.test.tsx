import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { WelcomeScreen } from '@/renderer/components/WelcomeScreen'

const mockSelectRootFolder = vi.fn()

vi.mock('@/renderer/lib/tauriApi', () => ({
  tauriApi: {
    markdown: {
      selectRootFolder: (...args: unknown[]) => mockSelectRootFolder(...args),
    },
  },
}))

describe('WelcomeScreen', () => {
  afterEach(() => {
    cleanup()
    mockSelectRootFolder.mockReset()
  })

  it('タイトルと案内文を表示する', () => {
    render(<WelcomeScreen onSelect={vi.fn()} />)
    expect(screen.getByText('Welcome to Notyra')).toBeInTheDocument()
    expect(
      screen.getByText('First, select a folder to save your notes')
    ).toBeInTheDocument()
  })

  it('フォルダ選択ボタンをクリックし、パスが返るとonSelectが呼ばれる', async () => {
    mockSelectRootFolder.mockResolvedValue('/notes')
    const onSelect = vi.fn()
    render(<WelcomeScreen onSelect={onSelect} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Select Folder and Start' })
    )

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith('/notes')
    })
  })

  it('フォルダ選択がキャンセルされた場合は onSelect を呼ばない', async () => {
    mockSelectRootFolder.mockResolvedValue(null)
    const onSelect = vi.fn()
    render(<WelcomeScreen onSelect={onSelect} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Select Folder and Start' })
    )

    await waitFor(() => {
      expect(mockSelectRootFolder).toHaveBeenCalledTimes(1)
    })
    expect(onSelect).not.toHaveBeenCalled()
  })
})
