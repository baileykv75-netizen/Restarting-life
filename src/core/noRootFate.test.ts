import { describe, expect, it } from 'vitest'
import { FORMAL_EVENTS } from '../data/events/formalEvents'
import type { GameState } from '../types/game'
import { canAttemptBreakthrough, resolveBreakthroughAttempt, startBreakthrough } from './breakthroughEngine'
import { calculateCultivationGain } from './cultivationEngine'
import { createEventCatalog, resolveEventChoice, startEventById } from './eventEngine'
import { createInitialGameState } from './gameState'
import { DAYS_PER_YEAR } from './timeEngine'

const catalog = createEventCatalog(FORMAL_EVENTS)

describe('no-root fate chain', () => {
  it('turns the preset rare chain into a real playable cultivation route', () => {
    const base = createInitialGameState({ runSeed: 'no-root-fate' })
    let state: GameState = {
      ...base,
      rngState: 1,
      worldDay: 30 * DAYS_PER_YEAR,
      identity: { ...base.identity, spiritRootId: 'none' },
      tags: ['no_spirit_root', 'spirit_root:none'],
      flags: {
        no_root_fate_seed: true,
        no_root_dream_seen: true,
      },
    }

    state = startEventById(state, catalog, 'chain_no_root_cliff_pill')
    state = resolveEventChoice(state, catalog, 'swallow')

    expect(state.identity.spiritRootId).toBe('none')
    expect(state.tags).toContain('has_spirit_root')
    expect(state.tags).toContain('spirit_root:reformed')
    expect(state.tags).not.toContain('no_spirit_root')
    expect(state.flags.reformed_spirit_root_multiplier).toBe(0.7)
    expect(state.flags.has_cultivation_method).toBe(true)
    expect(state.identity.faction).toBe('loose')
    expect(canAttemptBreakthrough(state)).toBe(true)

    state = startBreakthrough(state, catalog)
    const breakthrough = resolveBreakthroughAttempt(state, catalog)
    expect(breakthrough.success).toBe(true)
    state = breakthrough.state

    expect(state.cultivation.realm).toBe('qi')
    expect(calculateCultivationGain(state)).toBeGreaterThan(0)
  })
})
