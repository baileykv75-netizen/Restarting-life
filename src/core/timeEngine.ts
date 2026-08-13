import type { GameState } from '../types/game'

export const MONTHS_PER_YEAR = 12

export interface AgeParts {
  years: number
  months: number
}

function assertValidMonths(months: number): void {
  if (!Number.isSafeInteger(months) || months < 0) {
    throw new RangeError('months must be a non-negative safe integer')
  }
}

export function advanceTimeMonths(state: GameState, months: number): GameState {
  assertValidMonths(months)

  if (state.status !== 'playing' || months === 0) {
    return state
  }

  return {
    ...state,
    timeMonths: state.timeMonths + months,
  }
}

export function getAgeParts(timeMonths: number): AgeParts {
  assertValidMonths(timeMonths)

  return {
    years: Math.floor(timeMonths / MONTHS_PER_YEAR),
    months: timeMonths % MONTHS_PER_YEAR,
  }
}
