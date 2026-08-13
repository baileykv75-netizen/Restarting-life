import { describe, expect, it } from 'vitest'
import { progressTime } from './gameEngine'
import { createInitialGameState } from './gameState'

describe('stage-1 game engine loop', () => {
  it('can deterministically progress a dummy mortal until natural death', () => {
    let state = createInitialGameState({ runSeed: 'full-mortal-life' })

    for (let year = 0; year < 79; year += 1) {
      state = progressTime(state, 12).state
    }

    expect(state.status).toBe('playing')
    expect(state.timeMonths).toBe(79 * 12)

    state = progressTime(state, 12).state

    expect(state.status).toBe('dead')
    expect(state.endReason).toBe('寿元耗尽')
    expect(state.timeMonths).toBe(80 * 12)
  })

  it('does not advance a finished run', () => {
    const base = createInitialGameState({ runSeed: 'finished-run' })
    const deadState = {
      ...base,
      status: 'dead' as const,
      endReason: '寿元耗尽',
    }

    const result = progressTime(deadState, 12)

    expect(result.applied).toBe(false)
    expect(result.reason).toBe('GAME_ENDED')
    expect(result.state).toBe(deadState)
  })
})
