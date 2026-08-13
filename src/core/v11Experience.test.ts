import { describe, expect, it } from 'vitest'
import type { GameEvent } from '../types/event'
import { createInitialGameState } from './gameState'
import { getEligibleEvents } from './eventEngine'

describe('V1.1 event variety', () => {
  it('prevents immediate repetition of ordinary events', () => {
    const event: GameEvent = {
      id: 'repeatable', category: 'exploration', title: 'repeatable', text: 'repeatable', weight: 1,
      choices: [{ id: 'ok', text: 'ok', effects: [] }],
    }
    const state = createInitialGameState({ runSeed: 'cooldown-check' })
    const recent = { ...state, events: { ...state.events, history: ['repeatable', 'a', 'b'] } }
    const old = { ...state, events: { ...state.events, history: ['repeatable', 'a', 'b', 'c', 'd', 'e', 'f'] } }
    expect(getEligibleEvents(recent, [event], 'exploration')).toHaveLength(0)
    expect(getEligibleEvents(old, [event], 'exploration')).toHaveLength(1)
  })
})
