import { describe, expect, it } from 'vitest'
import { FORMAL_EVENTS } from '../data/events/formalEvents'
import type { GameState } from '../types/game'
import { performPlayerAction } from './actionEngine'
import { createEventCatalog } from './eventEngine'
import { createInitialGameState } from './gameState'
import { DAYS_PER_YEAR } from './timeEngine'

const catalog = createEventCatalog(FORMAL_EVENTS)

describe('actionEngine', () => {
  it('resolves livelihood in a seeded 30–60 day range instead of a fixed half year', () => {
    const base = createInitialGameState({ runSeed: 'livelihood-duration' })
    const first = performPlayerAction(base, 'livelihood', FORMAL_EVENTS, catalog)
    const second = performPlayerAction(base, 'livelihood', FORMAL_EVENTS, catalog)

    expect(first.applied).toBe(true)
    expect(first.elapsedDays).toBeGreaterThanOrEqual(30)
    expect(first.elapsedDays).toBeLessThanOrEqual(60)
    expect(first.elapsedDays).not.toBe(180)
    expect(second.elapsedDays).toBe(first.elapsedDays)
    expect(second.state).toEqual(first.state)
    expect(first.state.events.currentEventId).not.toBeNull()
  })

  it('resolves exploration in a shorter seeded 8–20 day range', () => {
    const base = createInitialGameState({ runSeed: 'explore-duration' })
    const result = performPlayerAction(base, 'explore', FORMAL_EVENTS, catalog)

    expect(result.applied).toBe(true)
    expect(result.elapsedDays).toBeGreaterThanOrEqual(8)
    expect(result.elapsedDays).toBeLessThanOrEqual(20)
    expect(result.state.worldDay - base.worldDay).toBe(result.elapsedDays)
    expect(result.state.events.currentEventId).not.toBeNull()
  })

  it('keeps cultivation on its authored one-year duration until activity redesign', () => {
    const base = createInitialGameState({ runSeed: 'cultivation-event' })
    const state: GameState = {
      ...base,
      rngState: 1,
      identity: { ...base.identity, spiritRootId: 'special' },
      cultivation: { realm: 'qi', stage: 1 },
    }

    const result = performPlayerAction(state, 'cultivate', FORMAL_EVENTS, catalog)

    expect(result.applied).toBe(true)
    expect(result.elapsedDays).toBe(DAYS_PER_YEAR)
    expect(result.state.worldDay).toBe(DAYS_PER_YEAR)
    expect(result.state.events.currentEventId).not.toBeNull()
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
