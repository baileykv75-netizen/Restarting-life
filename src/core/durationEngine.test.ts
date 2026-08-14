import { describe, expect, it } from 'vitest'
import { seedToState } from './rng'
import { resolveDuration } from './durationEngine'

describe('durationEngine', () => {
  it('resolves fixed durations without consuming RNG', () => {
    const rngState = seedToState('fixed-duration')
    const result = resolveDuration({ type: 'fixed', days: 12 }, rngState)
    expect(result).toEqual({ days: 12, rngState })
  })

  it('resolves a range deterministically from the same RNG state', () => {
    const rngState = seedToState('range-duration')
    const first = resolveDuration({ type: 'range', minDays: 8, maxDays: 20 }, rngState)
    const second = resolveDuration({ type: 'range', minDays: 8, maxDays: 20 }, rngState)

    expect(first).toEqual(second)
    expect(first.days).toBeGreaterThanOrEqual(8)
    expect(first.days).toBeLessThanOrEqual(20)
    expect(first.rngState).not.toBe(rngState)
  })

  it('rejects invalid fixed and ranged durations', () => {
    expect(() => resolveDuration({ type: 'fixed', days: -1 }, 1)).toThrow()
    expect(() => resolveDuration({ type: 'range', minDays: 20, maxDays: 8 }, 1)).toThrow()
    expect(() => resolveDuration({ type: 'range', minDays: 1.5, maxDays: 8 }, 1)).toThrow()
  })
})
