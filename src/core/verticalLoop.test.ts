import { describe, expect, it } from 'vitest'
import { FORMAL_EVENTS } from '../data/events/formalEvents'
import { performPlayerAction } from './actionEngine'
import { resolveBreakthroughAttempt } from './breakthroughEngine'
import { createEventCatalog, resolveEventChoice } from './eventEngine'
import { createInitialGameState } from './gameState'

const catalog = createEventCatalog(FORMAL_EVENTS)

function cultivateUntil(
  input: ReturnType<typeof createInitialGameState>,
  predicate: (state: ReturnType<typeof createInitialGameState>) => boolean,
) {
  let state = input
  let steps = 0

  while (!predicate(state)) {
    const result = performPlayerAction(
      state,
      'cultivate',
      FORMAL_EVENTS,
      catalog,
    )
    expect(result.applied).toBe(true)
    state = result.state
    steps += 1
    if (steps > 100) {
      throw new Error('Cultivation integration loop exceeded safety limit')
    }
  }

  return state
}

describe('stage-4 vertical gameplay loop', () => {
  it('can run one deterministic life from mortal opportunity to golden core', () => {
    const base = createInitialGameState({ runSeed: 'vertical-golden-core' })
    let state = {
      ...base,
      timeMonths: 18 * 12,
      rngState: 1,
      identity: { ...base.identity, spiritRootId: 'special' },
      tags: ['has_spirit_root', 'spirit_root:special'],
    }

    state = performPlayerAction(
      state,
      'livelihood',
      FORMAL_EVENTS,
      catalog,
    ).state
    expect(state.events.currentEventId).toBe('mortal_immortal_encounter')

    state = resolveEventChoice(state, catalog, 'join_qingyun')
    expect(state.identity.faction).toBe('qingyun')

    state = performPlayerAction(
      state,
      'breakthrough',
      FORMAL_EVENTS,
      catalog,
    ).state
    let breakthrough = resolveBreakthroughAttempt(state, catalog)
    expect(breakthrough.success).toBe(true)
    state = breakthrough.state
    expect(state.cultivation.realm).toBe('qi')

    state = cultivateUntil(
      state,
      (current) =>
        current.cultivation.realm === 'qi' &&
        current.cultivation.stage === 9 &&
        current.resources.cultivation >= 100,
    )

    state = performPlayerAction(
      state,
      'breakthrough',
      FORMAL_EVENTS,
      catalog,
    ).state
    breakthrough = resolveBreakthroughAttempt(state, catalog)
    expect(breakthrough.success).toBe(false)
    state = breakthrough.state

    state = cultivateUntil(
      state,
      (current) => current.resources.cultivation >= 100,
    )
    state = performPlayerAction(
      state,
      'breakthrough',
      FORMAL_EVENTS,
      catalog,
    ).state
    breakthrough = resolveBreakthroughAttempt(state, catalog)
    expect(breakthrough.success).toBe(true)
    state = breakthrough.state
    expect(state.cultivation.realm).toBe('foundation')
    expect(state.cultivation.stage).toBe(1)

    state = cultivateUntil(
      state,
      (current) =>
        current.cultivation.realm === 'foundation' &&
        current.cultivation.stage === 3 &&
        current.resources.cultivation >= 500,
    )

    state = performPlayerAction(
      state,
      'breakthrough',
      FORMAL_EVENTS,
      catalog,
    ).state
    breakthrough = resolveBreakthroughAttempt(state, catalog)
    expect(breakthrough.success).toBe(false)
    state = breakthrough.state

    state = cultivateUntil(
      state,
      (current) => current.resources.cultivation >= 500,
    )
    state = performPlayerAction(
      state,
      'breakthrough',
      FORMAL_EVENTS,
      catalog,
    ).state
    breakthrough = resolveBreakthroughAttempt(state, catalog)
    expect(breakthrough.success).toBe(true)
    state = breakthrough.state

    expect(state.status).toBe('won')
    expect(state.cultivation.realm).toBe('golden_core')
    expect(state.endReason).toBe('结成金丹')
    expect(state.events.currentEventId).toBeNull()
  })

  it('can run a normal no-root life into lifespan death without post-death events', () => {
    const base = createInitialGameState({ runSeed: 'vertical-natural-death' })
    const state = {
      ...base,
      timeMonths: 80 * 12 - 6,
      identity: { ...base.identity, spiritRootId: 'none' },
      tags: ['no_spirit_root', 'spirit_root:none'],
    }

    const result = performPlayerAction(
      state,
      'livelihood',
      FORMAL_EVENTS,
      catalog,
    )

    expect(result.applied).toBe(true)
    expect(result.state.status).toBe('dead')
    expect(result.state.endReason).toBe('寿元耗尽')
    expect(result.state.events.currentEventId).toBeNull()
    expect(result.state.events.history).toEqual([])
  })
})
