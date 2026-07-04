import { describe, it, expect, afterEach } from 'vitest'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { createBlockquoteDecorationExtension } from '@/renderer/lib/codemirror/blockquoteDecoration'

// ─── Task 1.3: createBlockquoteDecorationExtension (実際のEditorViewへの反映) ──

let view: EditorView | undefined

afterEach(() => {
  view?.destroy()
  view = undefined
})

function mount(doc: string) {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  const state = EditorState.create({
    doc,
    extensions: [markdown(), createBlockquoteDecorationExtension()],
  })
  view = new EditorView({ state, parent })
  return {
    view,
    lineClasses: () =>
      Array.from(parent.querySelectorAll('.cm-line')).map(
        l => l.className
      ),
  }
}

describe('createBlockquoteDecorationExtension', () => {
  it('Alertマーカー行に種別クラスとマーカー行クラスを付与する', () => {
    const { lineClasses } = mount('> [!TIP]\n> content\n\nplain')
    const classes = lineClasses()
    expect(classes[0]).toContain('cm-blockquote-tip')
    expect(classes[0]).toContain('cm-blockquote-marker-line')
    expect(classes[1]).toContain('cm-blockquote-tip')
    expect(classes[1]).not.toContain('cm-blockquote-marker-line')
    expect(classes[3]).not.toContain('cm-blockquote-line')
  })

  it('ドキュメント変更でAlert種別変更に追従する', () => {
    const { view: editorView, lineClasses } = mount('> [!TIP]')
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: '> [!CAUTION]' },
    })
    const classes = lineClasses()
    expect(classes[0]).toContain('cm-blockquote-caution')
    expect(classes[0]).not.toContain('cm-blockquote-tip')
  })

  it('Alertマーカーを削除するとdefault装飾に戻る', () => {
    const { view: editorView, lineClasses } = mount('> [!TIP]')
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: '> plain' },
    })
    const classes = lineClasses()
    expect(classes[0]).toContain('cm-blockquote-default')
    expect(classes[0]).not.toContain('cm-blockquote-tip')
  })
})
