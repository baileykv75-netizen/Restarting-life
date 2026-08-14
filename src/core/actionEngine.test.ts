import { describe, expect, it } from 'vitest'
import { FORMAL_EVENTS } from '../data/events/formalEvents'
import type { GameState } from '../types/game'
import { performPlayerAction, getAvailableActions } from './actionEngine'
import { createEventCatalog, resolveEventChoice } from './eventEngine'
import { createInitialGameState } from './gameState'
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from './timeEngine'

const catalog = createEventCatalog(FORMAL_EVENTS)

describe('actionEngine', () => {
  it('uses livelihood to find the first immortal opportunity and unlock breakthrough', () => {
    const base = createInitialGameState({ runSeed: 'immortal-opportunity' })
    let state: GameState = {
      ...base,
      rngState: 1,
      worldDay: 18 * DAYS_PER_YEAR,
      identity: { ...base.identity, spiritRootId: 'special' },
      tags: ['has_spirit_root', 'spirit_root:special'],
    }

    state = performPlayerAction(state, 'livelihood', FORMAL_EVENTS, catalog).state

    expect(state.worldDay).toBe(18 * DAYS_PER_YEAR + 6 * DAYS_PER_MONTH)
    expect(state.events.currentEventId).toBe('mortal_immortal_encounter')

    state = resolveEventChoice(state, catalog, 'join_qingyun')
    expect(state.identity.faction).toBe('qingyun')
    expect(state.flags.has_cultivation_method).toBe(true)
    expect(getAvailableActions(state)).toContain('breakthrough')
  })

  it('draws a cultivation event after a completed cultivation action', () => {
    const base = createInitialGameState({ runSeed: 'cultivation-event' })
    const state: GameState = {
      ...base,
      rngState: 1,
      identity: { ...base.identity, spiritRootId: 'special' },
      cultivation: { realm: 'qi', stage: 1 },
    }

    const result = performPlayerAction(state, 'cultivate', FORMAL_EVENTS, catalog)

    expect(result.applied).toBe(true)
    expect(result.state.worldDay).toBe(DAYS_PER_YEAR)
    expect(result.state.events.currentEventId).toBe('cultivation_steady_breathing')
  })

  it('blocks normal actions while an event is active', () => {
    const base = createInitialGameState({ runSeed: 'active-event' })
    const state: GameState = {
      ...base,
      events: { ...base.events, currentEventId: 'some_event' },
    }

    const result = performPlayerAction(state, 'explore', FORMAL_EVENTS, catalog)
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('EVENT_ACTIVE')
  })
})
