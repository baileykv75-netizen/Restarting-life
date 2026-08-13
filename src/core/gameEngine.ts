import type { GameState } from '../types/game'
import { resolveNaturalDeath } from './lifespanEngine'
import { advanceTimeMonths } from './timeEngine'

export interface TimeProgressResult {
  state: GameState
  applied: boolean
  reason?: 'GAME_ENDED'
}

export function progressTime(state: GameState, months: number): TimeProgressResult {
  if (state.status !== 'playing') {
    return {
      state,
      applied: false,
      reason: 'GAME_ENDED',
    }
  }

  const advanced = advanceTimeMonths(state, months)

  return {
    state: resolveNaturalDeath(advanced),
    applied: true,
  }
}
