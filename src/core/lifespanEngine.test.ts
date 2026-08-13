import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './gameState'
import {
  getMaxLifespanMonths,
  getRemainingLifespanMonths,
  resolveNaturalDeath,
} from './lifespanEngine'

describe('lifespan engine', () => {
  it('uses the V1 lifespan table', () => {
    expect(getMaxLifespanMonths('mortal')).toBe(80 * 12)
    expect(getMaxLifespanMonths('qi')).toBe(120 * 12)
    expect(getMaxLifespanMonths('foundation')).toBe(220 * 12)
    expect(getMaxLifespanMonths('golden_core')).toBeNull()
  })

  it('kills a mortal exactly at the lifespan boundary', () => {
    const state = {
      ...createInitialGameState({ runSeed: 'lifespan-boundary' }),
      timeMonths: 80 * 12,
    }
    const resolved = resolveNaturalDeath(state)

    expect(resolved.status).toBe('dead')
    expect(resolved.endReason).toBe('寿元耗尽')
    expect(getRemainingLifespanMonths(resolved)).toBe(0)
  })
})
