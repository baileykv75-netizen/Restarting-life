import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './gameState'
import {
  getEffectiveMaxLifespanYears,
  getLifespanBreakdown,
  getMaxLifespanDays,
  getRemainingLifespanDays,
  resolveNaturalDeath,
} from './lifespanEngine'
import { DAYS_PER_YEAR } from './timeEngine'

describe('lifespan engine', () => {
  it('uses the C19 finite lifespan table', () => {
    expect(getMaxLifespanDays('mortal')).toBe(80 * DAYS_PER_YEAR)
    expect(getMaxLifespanDays('qi')).toBe(120 * DAYS_PER_YEAR)
    expect(getMaxLifespanDays('foundation')).toBe(220 * DAYS_PER_YEAR)
    expect(getMaxLifespanDays('golden_core')).toBe(450 * DAYS_PER_YEAR)
  })

  it('derives effective lifespan from realm, effects and permanent penalties', () => {
    const base = createInitialGameState({ runSeed: 'lifespan-breakdown' })
    const state = {
      ...base,
      cultivation: { ...base.cultivation, realm: 'foundation' as const, stage: 2 },
      lifespan: {
        appliedEffectKeys: ['lifespan_effect:yanyuan_dan', 'lifespan_effect:century_spirit_ginseng'],
        permanentPenaltyKeys: ['lifespan_penalty:yinsui_ningcha_entry'],
      },
    }
    expect(getLifespanBreakdown(state)).toEqual({ baseYears: 220, bonusYears: 25, penaltyYears: 10, effectiveYears: 235 })
    expect(getEffectiveMaxLifespanYears(state)).toBe(235)
  })

  it('kills a character exactly at the effective lifespan boundary', () => {
    const base = createInitialGameState({ runSeed: 'lifespan-boundary' })
    const state = { ...base, worldDay: base.identity.birthDay + 80 * DAYS_PER_YEAR }
    const resolved = resolveNaturalDeath(state)
    expect(resolved.status).toBe('dead')
    expect(resolved.endReason).toBe('寿元耗尽')
    expect(getRemainingLifespanDays(resolved)).toBe(0)
  })
})
