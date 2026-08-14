import type { GameState } from '../types/game'
import { resolveNaturalDeath } from './lifespanEngine'
import { advanceTimeDays } from './timeEngine'

export interface TimeProgressResult {
  state: GameState
  applied: boolean
  reason?: 'GAME_ENDED'
}

export function progressTime(state: GameState, days: number): TimeProgressResult {
  if (state.status !== 'playing') {
    return {
      state,
      applied: false,
      reason: 'GAME_ENDED',
    }
  }

  const advanced = advanceTimeDays(state, days)

  return {
    state: resolveNaturalDeath(advanced),
    applied: true,
  }
}
