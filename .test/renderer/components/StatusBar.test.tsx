import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import i18n from 'i18next'
import { StatusBar } from '@/renderer/components/StatusBar'

afterEach(() => {
  cleanup()
})

describe('StatusBar', () => {
  it('全てnullの場合は各項目にプレースホルダーを表示する', () => {
    render(
      <StatusBar cursor={null} selectionStats={null} stats={null} version={null} />
    )
    expect(screen.getByTestId('status-cursor')).toHaveTextContent('—')
    expect(screen.getByTestId('status-words')).toHaveTextContent('—')
    expect(screen.getByTestId('status-chars')).toHaveTextContent('—')
    expect(screen.getByTestId('status-lines')).toHaveTextContent('—')
    expect(screen.getByTestId('status-version')).toHaveTextContent('—')
  })

  it('カーソル位置・集計値・バージョンを表示する', () => {
    render(
      <StatusBar
        cursor={{ line: 3, column: 5 }}
        selectionStats={null}
        stats={{ charCount: 1024, wordCount: 184, lineCount: 63 }}
        version="2.1.0"
      />
    )
    expect(screen.getByTestId('status-cursor')).toHaveTextContent('3')
    expect(screen.getByTestId('status-cursor')).toHaveTextContent('5')
    expect(screen.getByTestId('status-words')).toHaveTextContent('184')
    expect(screen.getByTestId('status-chars')).toHaveTextContent('1024')
    expect(screen.getByTestId('status-lines')).toHaveTextContent('63')
    expect(screen.getByTestId('status-version')).toHaveTextContent('2.1.0')
  })

  it('選択範囲がある場合は文字数・語数を選択範囲の値に切り替え、行数は文書全体の値を維持する', () => {
    render(
      <StatusBar
        cursor={{ line: 1, column: 1 }}
        selectionStats={{ charCount: 11, wordCount: 2 }}
        stats={{ charCount: 1024, wordCount: 184, lineCount: 63 }}
        version="2.1.0"
      />
    )
    expect(screen.getByTestId('status-words')).toHaveTextContent('2')
    expect(screen.getByTestId('status-chars')).toHaveTextContent('11')
    expect(screen.getByTestId('status-lines')).toHaveTextContent('63')
  })

  it('言語切替時に項目ラベルが選択中の言語に追従する', async () => {
    const original = i18n.language
    try {
      await i18n.changeLanguage('en')
      render(
        <StatusBar
          cursor={{ line: 1, column: 1 }}
          selectionStats={null}
          stats={{ charCount: 10, wordCount: 2, lineCount: 1 }}
          version="2.1.0"
        />
      )
      expect(screen.getByTestId('status-words')).toHaveTextContent('2 words')
      expect(screen.getByTestId('status-chars')).toHaveTextContent('10 chars')
      expect(screen.getByTestId('status-lines')).toHaveTextContent('1 lines')
      cleanup()

      await i18n.changeLanguage('ja')
      render(
        <StatusBar
          cursor={{ line: 1, column: 1 }}
          selectionStats={null}
          stats={{ charCount: 10, wordCount: 2, lineCount: 1 }}
          version="2.1.0"
        />
      )
      expect(screen.getByTestId('status-words')).toHaveTextContent('2 語')
      expect(screen.getByTestId('status-chars')).toHaveTextContent('10 文字')
      expect(screen.getByTestId('status-lines')).toHaveTextContent('1 行')
    } finally {
      await i18n.changeLanguage(original)
    }
  })
})
