import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './gameState'
import {
  getMaxLifespanDays,
  getRemainingLifespanDays,
  resolveNaturalDeath,
} from './lifespanEngine'
import { DAYS_PER_YEAR } from './timeEngine'

describe('lifespan engine', () => {
  it('uses the V1 lifespan table on the V1.2 day clock', () => {
    expect(getMaxLifespanDays('mortal')).toBe(80 * DAYS_PER_YEAR)
    expect(getMaxLifespanDays('qi')).toBe(120 * DAYS_PER_YEAR)
    expect(getMaxLifespanDays('foundation')).toBe(220 * DAYS_PER_YEAR)
    expect(getMaxLifespanDays('golden_core')).toBeNull()
  })

  it('kills a mortal exactly at the lifespan boundary', () => {
    const base = createInitialGameState({ runSeed: 'lifespan-boundary' })
    const state = {
      ...base,
      worldDay: base.identity.birthDay + 80 * DAYS_PER_YEAR,
    }
    const resolved = resolveNaturalDeath(state)

    expect(resolved.status).toBe('dead')
    expect(resolved.endReason).toBe('寿元耗尽')
    expect(getRemainingLifespanDays(resolved)).toBe(0)
  })
})
