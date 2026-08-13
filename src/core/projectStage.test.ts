import { describe, expect, it } from 'vitest'
import { PROJECT_STAGE } from './projectStage'

describe('phase 0 project skeleton', () => {
  it('exposes the expected development stage', () => {
    expect(PROJECT_STAGE).toBe('阶段 0：工程骨架')
  })
})
