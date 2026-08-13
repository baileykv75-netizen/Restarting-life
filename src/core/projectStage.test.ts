import { describe, expect, it } from 'vitest'
import { PROJECT_STAGE } from './projectStage'

describe('project development stage', () => {
  it('exposes the expected development stage', () => {
    expect(PROJECT_STAGE).toBe('阶段 4：完整修仙闭环')
  })
})
