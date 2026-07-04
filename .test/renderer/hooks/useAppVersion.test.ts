import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAppVersion } from '@/renderer/hooks/useAppVersion'

const mockGetVersion = vi.fn()

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: () => mockGetVersion(),
}))

describe('useAppVersion', () => {
  beforeEach(() => {
    mockGetVersion.mockReset()
  })

  it('取得成功時はバージョン文字列を返す', async () => {
    mockGetVersion.mockResolvedValue('2.1.0')
    const { result } = renderHook(() => useAppVersion())

    await waitFor(() => {
      expect(result.current).toBe('2.1.0')
    })
  })

  it('取得失敗時はnullのまま維持しconsole.errorでログを出力する', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    mockGetVersion.mockRejectedValue(new Error('failed'))

    const { result } = renderHook(() => useAppVersion())

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
    expect(result.current).toBeNull()
    consoleErrorSpy.mockRestore()
  })
})
