import type { GameState } from '../types/game'
import { advanceWorldTime } from './worldEngine'

export interface TimeProgressResult {
  state: GameState
  applied: boolean
  reason?: 'GAME_ENDED'
}

/**
 * Compatibility wrapper retained for existing callers/tests. From Stage 3,
 * all gameplay time advancement delegates to advanceWorldTime so future
 * world systems have one clock entry point.
 */
export function progressTime(state: GameState, days: number): TimeProgressResult {
  if (state.status !== 'playing') {
    return {
      state,
      applied: false,
      reason: 'GAME_ENDED',
    }
  }

  return {
    state: advanceWorldTime(state, days).state,
    applied: true,
  }
}
