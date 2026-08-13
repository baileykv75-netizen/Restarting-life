import { describe, expect, it } from 'vitest'
import { FORMAL_EVENTS } from '../data/events/formalEvents'
import { performPlayerAction, getAvailableActions } from './actionEngine'
import { createEventCatalog, resolveEventChoice } from './eventEngine'
import { createInitialGameState } from './gameState'

const catalog = createEventCatalog(FORMAL_EVENTS)

describe('actionEngine', () => {
  it('uses livelihood to find the first immortal opportunity and unlock breakthrough', () => {
    const base = createInitialGameState({ runSeed: 'immortal-opportunity' })
    let state = {
      ...base,
      timeMonths: 18 * 12,
      identity: { ...base.identity, spiritRootId: 'special' },
      tags: ['has_spirit_root', 'spirit_root:special'],
    }

    state = performPlayerAction(
      state,
      'livelihood',
      FORMAL_EVENTS,
      catalog,
    ).state

    expect(state.timeMonths).toBe(18 * 12 + 6)
    expect(state.events.currentEventId).toBe('mortal_immortal_encounter')

    state = resolveEventChoice(state, catalog, 'join_qingyun')
    expect(state.identity.faction).toBe('qingyun')
    expect(state.flags.has_cultivation_method).toBe(true)
    expect(getAvailableActions(state)).toContain('breakthrough')
  })

  it('blocks normal actions while an event is active', () => {
    const base = createInitialGameState({ runSeed: 'active-event' })
    const state = {
      ...base,
      events: { ...base.events, currentEventId: 'some_event' },
    }

    const result = performPlayerAction(
      state,
      'explore',
      FORMAL_EVENTS,
      catalog,
    )
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('EVENT_ACTIVE')
  })
})
