import { describe, expect, it } from 'vitest'
import { FORMAL_EVENTS } from '../data/events/formalEvents'
import type { GameEvent } from '../types/event'
import type { GameState } from '../types/game'
import { performPlayerAction } from './actionEngine'
import { resolveBreakthroughAttempt } from './breakthroughEngine'
import { createEventCatalog, resolveEventChoice } from './eventEngine'
import { createInitialGameState } from './gameState'
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from './timeEngine'

const CORE_LOOP_IDS = new Set([
  'mortal_immortal_encounter',
  'breakthrough_qi_entry',
  'breakthrough_foundation',
  'breakthrough_golden_core',
])
const CORE_LOOP_EVENTS: readonly GameEvent[] = FORMAL_EVENTS.filter((event) =>
  CORE_LOOP_IDS.has(event.id),
)
const catalog = createEventCatalog(CORE_LOOP_EVENTS)

function cultivateUntil(
  input: GameState,
  predicate: (state: GameState) => boolean,
): GameState {
  let state = input
  let steps = 0

  while (!predicate(state)) {
    const result = performPlayerAction(state, 'cultivate', CORE_LOOP_EVENTS, catalog)
    expect(result.applied).toBe(true)
    state = result.state
    steps += 1
    if (steps > 100) {
      throw new Error('Cultivation integration loop exceeded safety limit')
    }
  }

  return state
}

describe('stage-4 vertical gameplay regression loop', () => {
  it('still runs one deterministic life from mortal opportunity to golden core', () => {
    const base = createInitialGameState({ runSeed: 'vertical-golden-core' })
    let state: GameState = {
      ...base,
      worldDay: 18 * DAYS_PER_YEAR,
      rngState: 1,
      identity: { ...base.identity, spiritRootId: 'special' },
      tags: ['has_spirit_root', 'spirit_root:special'],
    }

    state = performPlayerAction(state, 'livelihood', CORE_LOOP_EVENTS, catalog).state
    expect(state.events.currentEventId).toBe('mortal_immortal_encounter')

    state = resolveEventChoice(state, catalog, 'join_qingyun')
    state = performPlayerAction(state, 'breakthrough', CORE_LOOP_EVENTS, catalog).state
    let breakthrough = resolveBreakthroughAttempt(state, catalog)
    expect(breakthrough.success).toBe(true)
    state = breakthrough.state

    state = cultivateUntil(
      state,
      (current) =>
        current.cultivation.realm === 'qi' &&
        current.cultivation.stage === 9 &&
        current.resources.cultivation >= 100,
    )

    state = performPlayerAction(state, 'breakthrough', CORE_LOOP_EVENTS, catalog).state
    breakthrough = resolveBreakthroughAttempt(state, catalog)
    expect(breakthrough.success).toBe(false)
    state = breakthrough.state

    state = cultivateUntil(state, (current) => current.resources.cultivation >= 100)
    state = performPlayerAction(state, 'breakthrough', CORE_LOOP_EVENTS, catalog).state
    breakthrough = resolveBreakthroughAttempt(state, catalog)
    expect(breakthrough.success).toBe(true)
    state = breakthrough.state

    state = cultivateUntil(
      state,
      (current) =>
        current.cultivation.realm === 'foundation' &&
        current.cultivation.stage === 3 &&
        current.resources.cultivation >= 500,
    )

    state = performPlayerAction(state, 'breakthrough', CORE_LOOP_EVENTS, catalog).state
    breakthrough = resolveBreakthroughAttempt(state, catalog)
    expect(breakthrough.success).toBe(false)
    state = breakthrough.state

    state = cultivateUntil(state, (current) => current.resources.cultivation >= 500)
    state = performPlayerAction(state, 'breakthrough', CORE_LOOP_EVENTS, catalog).state
    breakthrough = resolveBreakthroughAttempt(state, catalog)
    expect(breakthrough.success).toBe(true)
    state = breakthrough.state

    expect(state.status).toBe('won')
    expect(state.cultivation.realm).toBe('golden_core')
    expect(state.endReason).toBe('结成金丹')
    expect(state.events.currentEventId).toBeNull()
  })

  it('still runs a normal no-root life into lifespan death without post-death events', () => {
    const base = createInitialGameState({ runSeed: 'vertical-natural-death' })
    const state: GameState = {
      ...base,
      worldDay: base.identity.birthDay + 80 * DAYS_PER_YEAR - 6 * DAYS_PER_MONTH,
      identity: { ...base.identity, spiritRootId: 'none' },
      tags: ['no_spirit_root', 'spirit_root:none'],
    }

    const result = performPlayerAction(state, 'livelihood', CORE_LOOP_EVENTS, catalog)

    expect(result.applied).toBe(true)
    expect(result.state.status).toBe('dead')
    expect(result.state.endReason).toBe('寿元耗尽')
    expect(result.state.events.currentEventId).toBeNull()
    expect(result.state.events.history).toEqual([])
  })
})
