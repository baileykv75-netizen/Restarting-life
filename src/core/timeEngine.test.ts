import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './gameState'
import { advanceTimeMonths, getAgeParts } from './timeEngine'

describe('time engine', () => {
  it('uses integer months as the only stored time unit', () => {
    const state = createInitialGameState({ runSeed: 'time-test' })
    const advanced = advanceTimeMonths(state, 18)

    expect(advanced.timeMonths).toBe(18)
    expect(getAgeParts(advanced.timeMonths)).toEqual({ years: 1, months: 6 })
  })

  it('rejects negative and fractional durations', () => {
    const state = createInitialGameState({ runSeed: 'invalid-time' })

    expect(() => advanceTimeMonths(state, -1)).toThrow()
    expect(() => advanceTimeMonths(state, 0.5)).toThrow()
  })
})
