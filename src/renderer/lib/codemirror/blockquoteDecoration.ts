import { syntaxTree } from '@codemirror/language'
import { Decoration, ViewPlugin } from '@codemirror/view'
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import type { EditorState, Extension } from '@codemirror/state'

export type BlockquoteLineKind =
  | 'default'
  | 'note'
  | 'tip'
  | 'important'
  | 'warning'
  | 'caution'

export interface BlockquoteLineDecoration {
  kind: BlockquoteLineKind
  isMarkerLine: boolean
}

const ALERT_MARKER_PATTERN = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/

export function detectAlertMarker(
  firstContentLine: string
): BlockquoteLineKind {
  const match = ALERT_MARKER_PATTERN.exec(firstContentLine.trim().toUpperCase())
  return match ? (match[1].toLowerCase() as BlockquoteLineKind) : 'default'
}

function stripQuoteMarker(lineText: string): string {
  return lineText.replace(/^>\s?/, '')
}

export function classifyBlockquoteLines(
  state: EditorState
): Map<number, BlockquoteLineDecoration> {
  const result = new Map<number, BlockquoteLineDecoration>()

  syntaxTree(state).iterate({
    enter: node => {
      if (node.name !== 'Blockquote') return

      const firstLine = state.doc.lineAt(node.from)
      const lastLine = state.doc.lineAt(node.to)
      const contentText = stripQuoteMarker(
        firstLine.text.slice(node.from - firstLine.from)
      )
      const kind = detectAlertMarker(contentText)

      // 子孫のBlockquoteノードが後から上書きするため、最も内側の種別が残る
      for (let lineNo = firstLine.number; lineNo <= lastLine.number; lineNo++) {
        result.set(lineNo, { kind, isMarkerLine: lineNo === firstLine.number })
      }
    },
  })

  return result
}

function kindClass(kind: BlockquoteLineKind): string {
  return `cm-blockquote-${kind}`
}

function buildDecorations(view: EditorView): DecorationSet {
  const classification = classifyBlockquoteLines(view.state)
  const builder = new RangeSetBuilder<Decoration>()

  for (const { from, to } of view.visibleRanges) {
    let pos = from
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos)
      const decoration = classification.get(line.number)
      if (decoration) {
        const classes = ['cm-blockquote-line', kindClass(decoration.kind)]
        if (decoration.isMarkerLine) classes.push('cm-blockquote-marker-line')
        builder.add(
          line.from,
          line.from,
          Decoration.line({ class: classes.join(' ') })
        )
      }
      pos = line.to + 1
    }
  }

  return builder.finish()
}

export function createBlockquoteDecorationExtension(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view)
        }
      }
    },
    {
      decorations: instance => instance.decorations,
    }
  )
}
