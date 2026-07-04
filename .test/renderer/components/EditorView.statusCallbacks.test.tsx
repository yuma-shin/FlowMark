import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, waitFor, fireEvent } from '@testing-library/react'
import { EditorView } from '@/renderer/components/EditorView'

afterEach(() => {
  cleanup()
})

function noop() {}

describe('EditorView のカーソル/選択コールバック', () => {
  it('editorモードでカーソルを移動するとonCursorChangeへ現在位置が通知される', async () => {
    const onCursorChange = vi.fn()
    render(
      <EditorView
        content={'Hello\nWorld'}
        layoutMode="editor"
        onChange={noop}
        onCursorChange={onCursorChange}
        onLayoutModeChange={noop}
      />
    )

    const content = document.querySelector('.cm-content') as HTMLElement
    content.focus()
    fireEvent.keyDown(content, { key: 'ArrowRight', code: 'ArrowRight' })
    fireEvent.keyDown(content, { key: 'ArrowRight', code: 'ArrowRight' })
    fireEvent.keyDown(content, { key: 'ArrowRight', code: 'ArrowRight' })

    await waitFor(() => {
      expect(onCursorChange).toHaveBeenCalled()
    })
    const lastCall =
      onCursorChange.mock.calls[onCursorChange.mock.calls.length - 1]
    expect(lastCall[0]).toEqual({ line: 1, column: 4 })
  })

  it('splitモードでも同様にカーソル位置が通知される', async () => {
    const onCursorChange = vi.fn()
    render(
      <EditorView
        content={'Hello\nWorld'}
        layoutMode="split"
        onChange={noop}
        onCursorChange={onCursorChange}
        onLayoutModeChange={noop}
      />
    )

    const content = document.querySelector('.cm-content') as HTMLElement
    content.focus()
    fireEvent.keyDown(content, { key: 'ArrowRight', code: 'ArrowRight' })
    fireEvent.keyDown(content, { key: 'ArrowRight', code: 'ArrowRight' })
    fireEvent.keyDown(content, { key: 'ArrowRight', code: 'ArrowRight' })

    await waitFor(() => {
      expect(onCursorChange).toHaveBeenCalled()
    })
  })

  it('previewモードではCodeMirrorが存在せずonCursorChange(null)が通知される', async () => {
    const onCursorChange = vi.fn()
    const onSelectionStatsChange = vi.fn()
    render(
      <EditorView
        content={'Hello world'}
        layoutMode="preview"
        onChange={noop}
        onCursorChange={onCursorChange}
        onLayoutModeChange={noop}
        onSelectionStatsChange={onSelectionStatsChange}
      />
    )

    await waitFor(() => {
      expect(onCursorChange).toHaveBeenCalledWith(null)
      expect(onSelectionStatsChange).toHaveBeenCalledWith(null)
    })
  })
})
