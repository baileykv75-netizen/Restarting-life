import type { GameState } from '../types/game'

export const DAYS_PER_MONTH = 30
export const MONTHS_PER_YEAR = 12
export const DAYS_PER_YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR

export interface AgeParts {
  years: number
  months: number
  days: number
}

export interface CalendarDate {
  year: number
  month: number
  day: number
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export function assertValidWorldDay(day: number, label = 'worldDay'): void {
  if (!Number.isSafeInteger(day) || day < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer`)
  }
}

export function advanceTimeDays(state: GameState, days: number): GameState {
  assertValidWorldDay(days, 'days')

  if (state.status !== 'playing' || days === 0) {
    return state
  }

  const nextWorldDay = state.worldDay + days
  if (!Number.isSafeInteger(nextWorldDay)) {
    throw new RangeError('worldDay overflow')
  }

  return {
    ...state,
    worldDay: nextWorldDay,
  }
}

export function getAgeParts(birthDay: number, worldDay: number): AgeParts {
  assertValidWorldDay(birthDay, 'birthDay')
  assertValidWorldDay(worldDay)
  if (worldDay < birthDay) {
    throw new RangeError('worldDay must not be earlier than birthDay')
  }

  const ageDays = worldDay - birthDay
  const years = Math.floor(ageDays / DAYS_PER_YEAR)
  const remainingAfterYears = ageDays % DAYS_PER_YEAR
  const months = Math.floor(remainingAfterYears / DAYS_PER_MONTH)
  const days = remainingAfterYears % DAYS_PER_MONTH

  return { years, months, days }
}

export function getCalendarDate(worldDay: number): CalendarDate {
  assertValidWorldDay(worldDay)
  const year = Math.floor(worldDay / DAYS_PER_YEAR)
  const dayOfYear = worldDay % DAYS_PER_YEAR
  return {
    year,
    month: Math.floor(dayOfYear / DAYS_PER_MONTH) + 1,
    day: (dayOfYear % DAYS_PER_MONTH) + 1,
  }
}

export function getSeason(worldDay: number): Season {
  const { month } = getCalendarDate(worldDay)
  if (month <= 3) return 'spring'
  if (month <= 6) return 'summer'
  if (month <= 9) return 'autumn'
  return 'winter'
}

export function formatDuration(days: number): string {
  assertValidWorldDay(days, 'days')
  if (days === 0) return '0日'

  const years = Math.floor(days / DAYS_PER_YEAR)
  const remainingAfterYears = days % DAYS_PER_YEAR
  const months = Math.floor(remainingAfterYears / DAYS_PER_MONTH)
  const remainingDays = remainingAfterYears % DAYS_PER_MONTH
  const parts: string[] = []

  if (years > 0) parts.push(`${years}年`)
  if (months > 0) parts.push(`${months}个月`)
  if (remainingDays > 0) parts.push(`${remainingDays}日`)

  return parts.join('')
}
