import { describe, expect, it } from 'vitest'
import { TEST_EVENTS } from '../data/events/testEvents'
import { createInitialGameState } from './gameState'
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from './timeEngine'
import {
  createEventCatalog,
  drawEvent,
  getAvailableChoices,
  getEligibleEvents,
  resolveEventChoice,
  startEventById,
} from './eventEngine'

const catalog = createEventCatalog(TEST_EVENTS)

function createAdultState(seed = 'event-seed') {
  return {
    ...createInitialGameState({ runSeed: seed }),
    worldDay: 18 * DAYS_PER_YEAR,
  }
}

describe('eventEngine', () => {
  it('validates the stage-3 catalog and locks the test event count', () => {
    expect(TEST_EVENTS).toHaveLength(8)
    expect(catalog.size).toBe(8)
  })

  it('filters by conditions, category and once history', () => {
    const state = createAdultState()
    const mortal = getEligibleEvents(state, TEST_EVENTS, 'mortal')

    expect(mortal.map((event) => event.id)).toContain('test_mountain_glimmer')
    expect(mortal.map((event) => event.id)).not.toContain('test_market_offer')

    const repeated = {
      ...state,
      events: { ...state.events, history: ['test_mountain_glimmer'] },
    }
    expect(getEligibleEvents(repeated, TEST_EVENTS, 'mortal').map((event) => event.id)).not.toContain('test_mountain_glimmer')
  })

  it('draws deterministically from the same state and seed', () => {
    const first = drawEvent(createAdultState('same-event-seed'), TEST_EVENTS, 'mortal')
    const second = drawEvent(createAdultState('same-event-seed'), TEST_EVENTS, 'mortal')

    expect(first.event?.id).toBe(second.event?.id)
    expect(first.state.rngState).toBe(second.state.rngState)
    expect(first.state.events.history).toEqual(second.state.events.history)
  })

  it('resolves a choice and preserves nextEventId priority over queued side events', () => {
    let state = createAdultState('chain-seed')
    state = startEventById(state, catalog, 'test_mountain_glimmer')

    const mountain = catalog.get('test_mountain_glimmer')
    expect(mountain).toBeDefined()
    expect(getAvailableChoices(state, mountain!).map((choice) => choice.id)).toContain('investigate')

    state = resolveEventChoice(state, catalog, 'investigate')
    expect(state.flags.test_saw_glimmer).toBe(true)
    expect(state.tags).toContain('test_cave_clue')
    expect(state.worldDay).toBe(18 * DAYS_PER_YEAR + DAYS_PER_MONTH)
    expect(state.events.currentEventId).toBe('test_cave_echo')

    state = resolveEventChoice(state, catalog, 'collect')
    expect(state.resources.spiritStones).toBe(3)
    expect(state.events.currentEventId).toBe('test_return_home')
    expect(state.events.queue).toEqual(['test_aftershock'])

    state = resolveEventChoice(state, catalog, 'rest')
    expect(state.events.currentEventId).toBe('test_aftershock')
    expect(state.events.queue).toEqual([])
  })

  it('rejects a choice whose condition is not satisfied', () => {
    const lowSense = {
      ...createAdultState('low-sense'),
      stats: { ...createAdultState('low-sense').stats, spiritSense: 4 },
    }
    const active = startEventById(lowSense, catalog, 'test_mountain_glimmer')

    expect(() => resolveEventChoice(active, catalog, 'investigate')).toThrow('Choice is not available: investigate')
  })

  it('stops effects and event chains immediately after death', () => {
    let state = createAdultState('fatal-seed')
    state = startEventById(state, catalog, 'test_fatal_trap')
    state = resolveEventChoice(state, catalog, 'fall')

    expect(state.status).toBe('dead')
    expect(state.endReason).toBe('测试陷阱')
    expect(state.resources.spiritStones).toBe(0)
    expect(state.events.currentEventId).toBeNull()
    expect(state.events.queue).toEqual([])
    expect(state.events.history).not.toContain('test_return_home')
  })
})
