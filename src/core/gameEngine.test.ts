import { describe, expect, it } from 'vitest'
import { progressTime } from './gameEngine'
import { createInitialGameState } from './gameState'
import { DAYS_PER_YEAR } from './timeEngine'

describe('game engine time loop', () => {
  it('can deterministically progress a dummy mortal until natural death', () => {
    let state = createInitialGameState({ runSeed: 'full-mortal-life' })

    for (let year = 0; year < 79; year += 1) {
      state = progressTime(state, DAYS_PER_YEAR).state
    }

    expect(state.status).toBe('playing')
    expect(state.worldDay).toBe(79 * DAYS_PER_YEAR)

    state = progressTime(state, DAYS_PER_YEAR).state

    expect(state.status).toBe('dead')
    expect(state.endReason).toBe('寿元耗尽')
    expect(state.worldDay).toBe(80 * DAYS_PER_YEAR)
  })

  it('does not advance a finished run', () => {
    const base = createInitialGameState({ runSeed: 'finished-run' })
    const deadState = {
      ...base,
      status: 'dead' as const,
      endReason: '寿元耗尽',
    }

    const result = progressTime(deadState, DAYS_PER_YEAR)

    expect(result.applied).toBe(false)
    expect(result.reason).toBe('GAME_ENDED')
    expect(result.state).toBe(deadState)
  })
})
