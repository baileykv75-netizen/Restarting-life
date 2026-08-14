import { describe, expect, it } from 'vitest'
import { FORMAL_EVENTS } from '../data/events/formalEvents'
import type { GameState } from '../types/game'
import { createEventCatalog, resolveEventChoice } from './eventEngine'
import {
  calculateBreakthroughChance,
  canAttemptBreakthrough,
  getBreakthroughRule,
  resolveBreakthroughAttempt,
  startBreakthrough,
} from './breakthroughEngine'
import { createInitialGameState } from './gameState'
import { DAYS_PER_MONTH } from './timeEngine'

const catalog = createEventCatalog(FORMAL_EVENTS)

function createQiCandidate(): GameState {
  const base = createInitialGameState({ runSeed: 'qi-candidate' })
  return {
    ...base,
    rngState: 1,
    identity: { ...base.identity, spiritRootId: 'special' },
    tags: ['has_spirit_root', 'spirit_root:special'],
    flags: { has_cultivation_method: true },
  }
}

describe('breakthroughEngine', () => {
  it('requires a real spirit root and cultivation method for qi entry', () => {
    const base = createInitialGameState({ runSeed: 'blocked' })
    expect(canAttemptBreakthrough(base)).toBe(false)

    const candidate = createQiCandidate()
    expect(canAttemptBreakthrough(candidate)).toBe(true)

    const rule = getBreakthroughRule(candidate)
    expect(rule?.id).toBe('qi_entry')
    expect(calculateBreakthroughChance(candidate, rule!)).toBe(0.6)
  })

  it('enters a breakthrough event before seeded resolution', () => {
    let state: GameState = createQiCandidate()
    state = startBreakthrough(state, catalog)

    expect(state.events.currentEventId).toBe('breakthrough_qi_entry')
    expect(() => resolveEventChoice(state, catalog, 'attempt')).toThrow(
      'Breakthrough attempt must be resolved by breakthroughEngine',
    )

    const result = resolveBreakthroughAttempt(state, catalog)
    expect(result.success).toBe(true)
    expect(result.roll).toBeLessThan(result.chance)
    expect(result.state.cultivation.realm).toBe('qi')
    expect(result.state.cultivation.stage).toBe(1)
    expect(result.state.worldDay).toBe(DAYS_PER_MONTH)
    expect(result.state.events.currentEventId).toBeNull()
  })

  it('applies deterministic failure costs and allows retry later', () => {
    const base = createInitialGameState({ runSeed: 'foundation-fail' })
    let state: GameState = {
      ...base,
      rngState: 67_634_689,
      cultivation: { realm: 'qi', stage: 9 },
      resources: { ...base.resources, cultivation: 100 },
    }

    state = startBreakthrough(state, catalog)
    const result = resolveBreakthroughAttempt(state, catalog)

    expect(result.success).toBe(false)
    expect(result.roll).toBeGreaterThan(result.chance)
    expect(result.state.cultivation.realm).toBe('qi')
    expect(result.state.cultivation.stage).toBe(9)
    expect(result.state.resources.cultivation).toBe(50)
    expect(result.state.stats.constitution).toBe(4)
    expect(result.state.worldDay).toBe(6 * DAYS_PER_MONTH)
    expect(result.state.events.currentEventId).toBeNull()
  })
})
