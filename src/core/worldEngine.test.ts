import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './gameState'
import { DAYS_PER_YEAR } from './timeEngine'
import { advanceWorldTime } from './worldEngine'

describe('worldEngine', () => {
  it('advances a living world by the requested number of days', () => {
    const state = createInitialGameState({ runSeed: 'world-advance' })
    const result = advanceWorldTime(state, 17)
    expect(result.elapsedDays).toBe(17)
    expect(result.state.worldDay).toBe(17)
  })

  it('resolves natural death through the same world-time entry point', () => {
    const base = createInitialGameState({ runSeed: 'world-death' })
    const state = {
      ...base,
      worldDay: base.identity.birthDay + 80 * DAYS_PER_YEAR - 1,
    }
    const result = advanceWorldTime(state, 1)
    expect(result.state.status).toBe('dead')
    expect(result.state.endReason).toBe('寿元耗尽')
  })

  it('does not advance a finished life', () => {
    const base = createInitialGameState({ runSeed: 'world-finished' })
    const state = { ...base, status: 'dead' as const, endReason: '测试' }
    const result = advanceWorldTime(state, 100)
    expect(result.state).toBe(state)
    expect(result.elapsedDays).toBe(0)
  })
})
