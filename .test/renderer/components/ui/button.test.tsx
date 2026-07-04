import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Button } from '@/renderer/components/ui/button'

describe('Button', () => {
  afterEach(() => {
    cleanup()
  })

  it('children を描画する', () => {
    render(<Button>保存</Button>)
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
  })

  it('デフォルトで primary variant / md size のクラスを適用する', () => {
    render(<Button>保存</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-primary')
  })

  it('variant="destructive" のクラスを適用する', () => {
    render(<Button variant="destructive">削除</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('bg-destructive')
  })

  it('variant="destructive" の文字色はテーマ変数に依存せず白固定になる', () => {
    render(<Button variant="destructive">削除</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('text-white')
    expect(button.className).not.toContain('text-destructive-foreground')
  })

  it('variant="ghost" のクラスを適用する', () => {
    render(<Button variant="ghost">キャンセル</Button>)
    const button = screen.getByRole('button')
    expect(button.className).not.toContain('bg-primary')
  })

  it('size="icon" は正方形サイズのクラスを適用する', () => {
    render(<Button size="icon">×</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('size-8')
  })

  it('size="iconSm" はiconより一回り小さい正方形サイズのクラスを適用する', () => {
    render(<Button size="iconSm">×</Button>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('size-6')
  })

  it('disabled のとき disabled 属性が付与される', () => {
    render(<Button disabled>保存</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('onClick が呼ばれる', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>保存</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('className を追加できる', () => {
    render(<Button className="custom-class">保存</Button>)
    expect(screen.getByRole('button').className).toContain('custom-class')
  })
})
