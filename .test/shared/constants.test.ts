import { describe, it, expect } from 'vitest'

describe('ENVIRONMENT', () => {
  it('IS_DEV プロパティが boolean 型である', async () => {
    const { ENVIRONMENT } = await import('@/shared/constants')
    expect(typeof ENVIRONMENT.IS_DEV).toBe('boolean')
  })
})
