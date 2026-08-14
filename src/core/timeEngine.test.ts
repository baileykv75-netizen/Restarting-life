import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './gameState'
import {
  advanceTimeDays,
  DAYS_PER_YEAR,
  formatDuration,
  getAgeParts,
  getCalendarDate,
  getSeason,
} from './timeEngine'

describe('time engine', () => {
  it('uses integer world days as the only stored rule time unit', () => {
    const state = createInitialGameState({ runSeed: 'time-test' })
    const advanced = advanceTimeDays(state, 540)

    expect(advanced.worldDay).toBe(540)
    expect(getAgeParts(0, advanced.worldDay)).toEqual({ years: 1, months: 6, days: 0 })
    expect(formatDuration(540)).toBe('1年6个月')
  })

  it('maps the 360-day calendar and seasons deterministically', () => {
    expect(getCalendarDate(0)).toEqual({ year: 0, month: 1, day: 1 })
    expect(getCalendarDate(DAYS_PER_YEAR - 1)).toEqual({ year: 0, month: 12, day: 30 })
    expect(getCalendarDate(DAYS_PER_YEAR)).toEqual({ year: 1, month: 1, day: 1 })
    expect(getSeason(0)).toBe('spring')
    expect(getSeason(90)).toBe('summer')
    expect(getSeason(180)).toBe('autumn')
    expect(getSeason(270)).toBe('winter')
  })

  it('rejects negative and fractional durations and impossible age ranges', () => {
    const state = createInitialGameState({ runSeed: 'invalid-time' })

    expect(() => advanceTimeDays(state, -1)).toThrow()
    expect(() => advanceTimeDays(state, 0.5)).toThrow()
    expect(() => getAgeParts(10, 9)).toThrow()
  })
})
