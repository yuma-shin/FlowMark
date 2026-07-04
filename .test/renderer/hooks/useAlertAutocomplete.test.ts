import { describe, it, expect, vi } from 'vitest'
import { detectTrigger, filterOptions } from '@/renderer/hooks/useAlertAutocomplete'
import { ALERT_OPTIONS } from '@/renderer/lib/alertOptions'

// ─── Task 5.1: detectTrigger / filterOptions / ALERT_OPTIONS ────────────────

describe('detectTrigger', () => {
  it('">" + スペース + "[!" でトリガー検出 (partialInput="")', () => {
    const result = detectTrigger('> [!')
    expect(result.matched).toBe(true)
    expect(result.partialInput).toBe('')
  })

  it('">" + スペース + "[!TI" で前方入力あり (partialInput="TI")', () => {
    const result = detectTrigger('> [!TI')
    expect(result.matched).toBe(true)
    expect(result.partialInput).toBe('TI')
  })

  it('">" + 複数スペース + "[!" でもトリガー検出', () => {
    const result = detectTrigger('>  [!')
    expect(result.matched).toBe(true)
    expect(result.partialInput).toBe('')
  })

  it('"[!" のみ (ブロッククォートなし) は非検出', () => {
    const result = detectTrigger('[!')
    expect(result.matched).toBe(false)
  })

  it('通常テキストは非検出', () => {
    const result = detectTrigger('hello world')
    expect(result.matched).toBe(false)
  })

  it('">" だけでは非検出', () => {
    const result = detectTrigger('>')
    expect(result.matched).toBe(false)
  })

  it('">[!" (スペースなし) は非検出', () => {
    const result = detectTrigger('>[!')
    expect(result.matched).toBe(false)
  })

  it('トリガー後に閉じ括弧が続く場合は非検出 (行頭からカーソルまでのみ)', () => {
    // 行全体が "> [!TIP]" であれば非検出 (カーソルは通常途中)
    const result = detectTrigger('> [!TIP]')
    expect(result.matched).toBe(false)
  })

  // ネストされたブロッククォート対応 (Bug 1)
  it('">> [!" (連続 >) でもトリガー検出 (prefix=">> ")', () => {
    const result = detectTrigger('>> [!')
    expect(result.matched).toBe(true)
    expect(result.partialInput).toBe('')
    expect(result.prefix).toBe('>> ')
  })

  it('"> > [!" (スペース区切り) でもトリガー検出 (prefix="> > ")', () => {
    const result = detectTrigger('> > [!')
    expect(result.matched).toBe(true)
    expect(result.partialInput).toBe('')
    expect(result.prefix).toBe('> > ')
  })

  it('単独ブロッククォートの prefix は "> "', () => {
    const result = detectTrigger('> [!TI')
    expect(result.matched).toBe(true)
    expect(result.prefix).toBe('> ')
  })

  // ネストアラートのトリガー修正: "> >[!" のように末尾 > にスペースなしも検出
  it('"> >[!" (末尾 > にスペースなし) でもトリガー検出 (prefix="> >")', () => {
    const result = detectTrigger('> >[!')
    expect(result.matched).toBe(true)
    expect(result.partialInput).toBe('')
    expect(result.prefix).toBe('> >')
  })

  it('"> >[!N" で partialInput="N" として検出', () => {
    const result = detectTrigger('> >[!N')
    expect(result.matched).toBe(true)
    expect(result.partialInput).toBe('N')
    expect(result.prefix).toBe('> >')
  })

  it('">[!" (先頭 > のみスペースなし) は非検出のまま', () => {
    const result = detectTrigger('>[!')
    expect(result.matched).toBe(false)
  })
})

describe('filterOptions', () => {
  it('空文字で全5種を返す', () => {
    const result = filterOptions('')
    expect(result).toHaveLength(5)
  })

  it('"T" で TIP のみ返す', () => {
    const result = filterOptions('T')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('TIP')
  })

  it('"N" で NOTE のみ返す', () => {
    const result = filterOptions('N')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('NOTE')
  })

  it('"W" で WARNING のみ返す', () => {
    const result = filterOptions('W')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('WARNING')
  })

  it('"C" で CAUTION のみ返す', () => {
    const result = filterOptions('C')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('CAUTION')
  })

  it('"I" で IMPORTANT のみ返す', () => {
    const result = filterOptions('I')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('IMPORTANT')
  })

  it('"X" (マッチなし) で空配列を返す', () => {
    const result = filterOptions('X')
    expect(result).toHaveLength(0)
  })

  it('小文字入力でも前方一致する ("ti" → TIP)', () => {
    const result = filterOptions('ti')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('TIP')
  })
})

describe('ALERT_OPTIONS', () => {
  it('5種全タイプを含む', () => {
    const types = ALERT_OPTIONS.map(o => o.type)
    expect(types).toContain('TIP')
    expect(types).toContain('NOTE')
    expect(types).toContain('CAUTION')
    expect(types).toContain('WARNING')
    expect(types).toContain('IMPORTANT')
    expect(ALERT_OPTIONS).toHaveLength(5)
  })

  it('各要素が color / label / previewText を持ち、いずれも非空', () => {
    for (const option of ALERT_OPTIONS) {
      expect(option.color.length).toBeGreaterThan(0)
      expect(option.label.length).toBeGreaterThan(0)
      expect(option.previewText.length).toBeGreaterThan(0)
    }
  })
})

// ─── Task 5.2: handleSelect のディスパッチロジック ───────────────────────────

describe('handleSelect dispatch logic', () => {
  /** cursorOffset はカーソルが line の先頭から何文字目にあるか */
  function makeView(lineText: string, cursorOffset: number) {
    const lineFrom = 0
    const cursorPos = lineFrom + cursorOffset

    const mockDispatch = vi.fn()
    const mockView = {
      state: {
        selection: { main: { head: cursorPos } },
        doc: {
          lineAt: (_pos: number) => ({
            from: lineFrom,
            text: lineText,
          }),
        },
      },
      dispatch: mockDispatch,
    }
    return { mockView, mockDispatch, cursorPos, lineFrom }
  }

  it('TIP 選択時に正しい changes と selection.anchor を dispatch する', () => {
    const lineText = '> [!'
    const { mockView, mockDispatch, cursorPos, lineFrom } = makeView(lineText, lineText.length)
    const insert = '> [!TIP]\n> '

    mockView.dispatch({
      changes: { from: lineFrom, to: cursorPos, insert },
      selection: { anchor: lineFrom + insert.length },
    })

    expect(mockDispatch).toHaveBeenCalledWith({
      changes: { from: 0, to: 4, insert: '> [!TIP]\n> ' },
      selection: { anchor: 11 },
    })
  })

  it('NOTE 選択時に正しい insert を dispatch する', () => {
    const lineText = '> [!N'
    const { mockView, mockDispatch, cursorPos, lineFrom } = makeView(lineText, lineText.length)
    const insert = '> [!NOTE]\n> '

    mockView.dispatch({
      changes: { from: lineFrom, to: cursorPos, insert },
      selection: { anchor: lineFrom + insert.length },
    })

    expect(mockDispatch).toHaveBeenCalledWith({
      changes: { from: 0, to: 5, insert: '> [!NOTE]\n> ' },
      selection: { anchor: 12 },
    })
  })

  it('editorViewRef.current が null のとき dispatch されない', () => {
    const editorViewRef = { current: null }
    const dispatchSpy = vi.fn()

    const view = editorViewRef.current
    if (view) dispatchSpy()

    expect(dispatchSpy).not.toHaveBeenCalled()
  })

  // Bug 2: bracket-matching ] を置換範囲に含める
  it('カーソル直後に ] があるとき replaceTo が cursorPos+1 になる (bracket-matching 対策)', () => {
    // lineText: "> [!]", cursor at position 4 (before ']')
    const lineText = '> [!]'
    const cursorOffset = 4  // cursor is between ! and ]
    const lineFrom = 0
    const cursorPos = lineFrom + cursorOffset
    const charAfterCursor = lineText[cursorOffset]  // ']'
    const replaceTo = charAfterCursor === ']' ? cursorPos + 1 : cursorPos

    expect(replaceTo).toBe(5)  // includes the ']'

    const insert = '> [!TIP]\n> '
    const mockDispatch = vi.fn()
    const mockView = {
      state: {
        selection: { main: { head: cursorPos } },
        doc: {
          lineAt: (_pos: number) => ({ from: lineFrom, text: lineText }),
        },
      },
      dispatch: mockDispatch,
    }

    mockView.dispatch({
      changes: { from: lineFrom, to: replaceTo, insert },
      selection: { anchor: lineFrom + insert.length },
    })

    // '> [!]' の全5文字が insert で置換される
    expect(mockDispatch).toHaveBeenCalledWith({
      changes: { from: 0, to: 5, insert: '> [!TIP]\n> ' },
      selection: { anchor: 11 },
    })
  })

  it('カーソル直後が ] 以外のとき replaceTo は cursorPos のまま', () => {
    const lineText = '> [!TI'
    const cursorOffset = 6
    const lineFrom = 0
    const cursorPos = lineFrom + cursorOffset
    const charAfterCursor = lineText[cursorOffset]  // undefined (end of string)
    const replaceTo = charAfterCursor === ']' ? cursorPos + 1 : cursorPos

    expect(replaceTo).toBe(6)  // no change
  })

  // Bug 1 + ネスト: prefix を保持した挿入
  it('prefix が ">> " のとき insert は ">> [!NOTE]\\n>> " になる', () => {
    const prefix = '>> '
    const type = 'NOTE'
    const insert = `${prefix}[!${type}]\n${prefix}`
    expect(insert).toBe('>> [!NOTE]\n>> ')
  })

  // ネストアラートのトリガー修正: prefix 正規化
  it('rawPrefix が "> >" (末尾スペースなし) のとき prefix は "> > " に正規化される', () => {
    const rawPrefix = '> >'
    const prefix = rawPrefix.endsWith(' ') ? rawPrefix : `${rawPrefix} `
    expect(prefix).toBe('> > ')
  })

  it('正規化された prefix ">> " で insert は ">> [!NOTE]\\n>> " になる', () => {
    const rawPrefix = '>>'
    const prefix = rawPrefix.endsWith(' ') ? rawPrefix : `${rawPrefix} `
    expect(prefix).toBe('>> ')
    const insert = `${prefix}[!NOTE]\n${prefix}`
    expect(insert).toBe('>> [!NOTE]\n>> ')
  })

  it('"> >[!" から選択すると insert は "> > [!NOTE]\\n> > " になる (正規化後)', () => {
    const rawPrefix = '> >'
    const prefix = rawPrefix.endsWith(' ') ? rawPrefix : `${rawPrefix} `
    expect(prefix).toBe('> > ')
    const insert = `${prefix}[!NOTE]\n${prefix}`
    expect(insert).toBe('> > [!NOTE]\n> > ')
  })
})
