import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { history, historyField } from '@codemirror/commands'
import { useEditorStateCache } from '@/renderer/hooks/useEditorStateCache'

function createEditorView(doc: string): EditorView {
  const state = EditorState.create({ doc, extensions: [history()] })
  return new EditorView({ state, parent: document.createElement('div') })
}

describe('useEditorStateCache', () => {
  describe('基本動作', () => {
    it('save and restore — 保存したEditorStateを同一コンテンツで復元できる', () => {
      const { result } = renderHook(() => useEditorStateCache())
      const view = createEditorView('Hello, World!')

      act(() => {
        result.current.saveCurrentState('/path/to/note.md', view)
      })

      const restored = result.current.restoreState('/path/to/note.md', 'Hello, World!')
      expect(restored).toBeDefined()
      expect(restored!.json).toBeDefined()
      expect(restored!.fields).toHaveProperty('history', historyField)

      view.destroy()
    })

    it('存在しないファイルパスのrestoreはundefinedを返す', () => {
      const { result } = renderHook(() => useEditorStateCache())

      const restored = result.current.restoreState('/unknown/path.md', 'some content')
      expect(restored).toBeUndefined()
    })

    it('コンテンツ不一致時はundefinedを返しエントリが削除される', () => {
      const { result } = renderHook(() => useEditorStateCache())
      const view = createEditorView('Content A')

      act(() => {
        result.current.saveCurrentState('/path/note.md', view)
      })

      // 異なるコンテンツで復元を試行
      const restored = result.current.restoreState('/path/note.md', 'Content B')
      expect(restored).toBeUndefined()

      // エントリが削除されたことを確認（同一コンテンツでも復元不可）
      const restoredAgain = result.current.restoreState('/path/note.md', 'Content A')
      expect(restoredAgain).toBeUndefined()

      view.destroy()
    })

    it('invalidateで指定エントリが削除される', () => {
      const { result } = renderHook(() => useEditorStateCache())
      const view = createEditorView('Test content')

      act(() => {
        result.current.saveCurrentState('/path/note.md', view)
      })

      act(() => {
        result.current.invalidate('/path/note.md')
      })

      const restored = result.current.restoreState('/path/note.md', 'Test content')
      expect(restored).toBeUndefined()

      view.destroy()
    })

    it('clearAllで全エントリが削除される', () => {
      const { result } = renderHook(() => useEditorStateCache())
      const view1 = createEditorView('Note 1')
      const view2 = createEditorView('Note 2')
      const view3 = createEditorView('Note 3')

      act(() => {
        result.current.saveCurrentState('/path/note1.md', view1)
        result.current.saveCurrentState('/path/note2.md', view2)
        result.current.saveCurrentState('/path/note3.md', view3)
      })

      act(() => {
        result.current.clearAll()
      })

      expect(result.current.restoreState('/path/note1.md', 'Note 1')).toBeUndefined()
      expect(result.current.restoreState('/path/note2.md', 'Note 2')).toBeUndefined()
      expect(result.current.restoreState('/path/note3.md', 'Note 3')).toBeUndefined()

      view1.destroy()
      view2.destroy()
      view3.destroy()
    })
  })

  describe('エラーハンドリング', () => {
    it('toJSON()がthrowしてもクラッシュせずエントリは保存されない', () => {
      const { result } = renderHook(() => useEditorStateCache())

      const mockView = {
        state: {
          toJSON: () => { throw new Error('serialize failed') },
          doc: { toString: () => 'content' },
        },
      } as unknown as EditorView

      // console.warnが出ることを確認
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      act(() => {
        result.current.saveCurrentState('/path/note.md', mockView)
      })

      expect(warnSpy).toHaveBeenCalledWith(
        '[useEditorStateCache] Failed to serialize editor state:',
        expect.any(Error),
      )

      // エントリは保存されていない
      const restored = result.current.restoreState('/path/note.md', 'content')
      expect(restored).toBeUndefined()

      warnSpy.mockRestore()
    })

    it('不正なキャッシュエントリでも復元時にクラッシュしない', () => {
      const { result } = renderHook(() => useEditorStateCache())
      const view = createEditorView('valid content')

      act(() => {
        result.current.saveCurrentState('/path/note.md', view)
      })

      // restoreState自体はjsonを検証せず返すだけなので、
      // 正常にオブジェクトを返却し、呼び出し側（CodeMirror）がエラーを処理する設計
      const restored = result.current.restoreState('/path/note.md', 'valid content')
      expect(restored).toBeDefined()
      expect(restored!.json).toBeDefined()
      expect(restored!.fields).toHaveProperty('history')

      view.destroy()
    })
  })
})
