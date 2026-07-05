import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from '@/renderer/components/ui/skeleton'

describe('Skeleton', () => {
  it('既定でシマーアニメーションクラスと縮小モーション対応クラスの両方が付与される', () => {
    const { container } = render(<Skeleton />)
    const el = container.firstElementChild as HTMLElement

    expect(el.className).toMatch(/animate-\[skeleton-shimmer/)
    expect(el.className).toMatch(/motion-reduce:animate-none/)
  })

  it('角丸のブロック要素として描画され、classNameで寸法を上書きできる', () => {
    const { container } = render(<Skeleton className="h-4 w-24" />)
    const el = container.firstElementChild as HTMLElement

    expect(el.className).toMatch(/rounded/)
    expect(el.className).toMatch(/h-4/)
    expect(el.className).toMatch(/w-24/)
  })
})
