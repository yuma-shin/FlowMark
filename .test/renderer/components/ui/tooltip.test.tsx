import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SimpleTooltip } from '@/renderer/components/ui/tooltip'

describe('SimpleTooltip', () => {
  afterEach(() => {
    cleanup()
  })

  it('ホバーするとツールチップが表示される', async () => {
    render(
      <SimpleTooltip content="保存する" delay={0}>
        <button type="button">保存</button>
      </SimpleTooltip>
    )

    fireEvent.mouseEnter(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByText('保存する')).toBeInTheDocument()
  })

  it('ホバーが外れるとツールチップが非表示になる', async () => {
    render(
      <SimpleTooltip content="保存する" delay={0}>
        <button type="button">保存</button>
      </SimpleTooltip>
    )

    const trigger = screen.getByRole('button', { name: '保存' })
    fireEvent.mouseEnter(trigger)
    await screen.findByText('保存する')

    fireEvent.mouseLeave(trigger)

    expect(screen.queryByText('保存する')).not.toBeInTheDocument()
  })
})
