import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const mockInvoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

// We need to reset the module-level cache between tests
// by re-importing the module fresh each time
let useSystemFonts: typeof import('@/renderer/hooks/useSystemFonts').useSystemFonts

describe('useSystemFonts', () => {
  beforeEach(async () => {
    mockInvoke.mockReset()
    // Reset module to clear cached state
    vi.resetModules()
    const mod = await import('@/renderer/hooks/useSystemFonts')
    useSystemFonts = mod.useSystemFonts
  })

  it('初回呼び出し時にlist_system_fontsをinvokeしフォント一覧を返す', async () => {
    const fonts = ['Arial', 'Calibri', 'Verdana']
    mockInvoke.mockResolvedValue(fonts)

    const { result } = renderHook(() => useSystemFonts())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.fonts).toEqual([])

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.fonts).toEqual(fonts)
    expect(result.current.error).toBeNull()
    expect(mockInvoke).toHaveBeenCalledWith('list_system_fonts')
    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })

  it('invoke失敗時にerror状態を設定する', async () => {
    mockInvoke.mockRejectedValue(new Error('Font enumeration failed'))

    const { result } = renderHook(() => useSystemFonts())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Font enumeration failed')
    expect(result.current.fonts).toEqual([])
  })

  it('非Errorオブジェクトのエラーも文字列として設定する', async () => {
    mockInvoke.mockRejectedValue('string error')

    const { result } = renderHook(() => useSystemFonts())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('string error')
  })

  it('キャッシュヒット時は再invokeしない', async () => {
    const fonts = ['Arial', 'Calibri']
    mockInvoke.mockResolvedValue(fonts)

    const { result: result1 } = renderHook(() => useSystemFonts())

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false)
    })

    // Second mount should use cached data
    const { result: result2 } = renderHook(() => useSystemFonts())

    expect(result2.current.fonts).toEqual(fonts)
    expect(result2.current.isLoading).toBe(false)
    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })

  it('refresh()がキャッシュをクリアし再フェッチする', async () => {
    const initialFonts = ['Arial', 'Calibri']
    const refreshedFonts = ['Arial', 'Calibri', 'NewFont']
    mockInvoke.mockResolvedValueOnce(initialFonts).mockResolvedValueOnce(refreshedFonts)

    const { result } = renderHook(() => useSystemFonts())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.fonts).toEqual(initialFonts)

    act(() => {
      result.current.refresh()
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.fonts).toEqual(refreshedFonts)
    expect(mockInvoke).toHaveBeenCalledTimes(2)
  })
})
