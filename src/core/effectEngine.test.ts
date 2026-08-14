import { describe, expect, it } from 'vitest'
import type { GameState } from '../types/game'
import { applyEffects } from './effectEngine'
import { createInitialGameState } from './gameState'
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from './timeEngine'

describe('effectEngine', () => {
  it('clamps resources, stats and relationships at their safety boundaries', () => {
    const state = createInitialGameState({ runSeed: 'effect-safety' })
    const result = applyEffects(state, [
      { type: 'addSpiritStones', amount: -10 },
      { type: 'addCultivation', amount: -10 },
      { type: 'addStat', stat: 'constitution', amount: -99 },
      { type: 'addRelationship', id: 'elder', amount: 999 },
    ])

    expect(result.resources.spiritStones).toBe(0)
    expect(result.resources.cultivation).toBe(0)
    expect(result.stats.constitution).toBe(1)
    expect(result.relationships.elder).toBe(100)
  })

  it('applies automatic small-stage progression to cultivation gained from events', () => {
    const base = createInitialGameState({ runSeed: 'event-cultivation' })
    const state: GameState = {
      ...base,
      cultivation: { realm: 'qi', stage: 1 },
      resources: { ...base.resources, cultivation: 90 },
    }

    const result = applyEffects(state, [{ type: 'addCultivation', amount: 25 }])
    expect(result.cultivation.stage).toBe(2)
    expect(result.resources.cultivation).toBe(15)
  })

  it('stops remaining effects immediately when time advancement causes natural death', () => {
    const base = createInitialGameState({ runSeed: 'old-age' })
    const state = {
      ...base,
      worldDay: base.identity.birthDay + 80 * DAYS_PER_YEAR - DAYS_PER_MONTH,
    }
    const result = applyEffects(state, [
      { type: 'advanceTime', days: DAYS_PER_MONTH },
      { type: 'addSpiritStones', amount: 99 },
    ])

    expect(result.status).toBe('dead')
    expect(result.endReason).toBe('寿元耗尽')
    expect(result.resources.spiritStones).toBe(0)
    expect(result.events.queue).toEqual([])
  })

  it('protects setRealm behind breakthrough permission and marks golden core as victory', () => {
    const state = createInitialGameState({ runSeed: 'realm-guard' })

    expect(() => applyEffects(state, [{ type: 'setRealm', realm: 'qi', stage: 1 }])).toThrow(
      'setRealm effect requires breakthrough permission',
    )

    const result = applyEffects(
      state,
      [{ type: 'setRealm', realm: 'golden_core', stage: 0 }],
      { allowSetRealm: true },
    )

    expect(result.status).toBe('won')
    expect(result.endReason).toBe('结成金丹')
  })
})
