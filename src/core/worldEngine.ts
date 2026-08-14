import type { GameState } from '../types/game'
import { resolveNaturalDeath } from './lifespanEngine'
import { advanceTimeDays } from './timeEngine'

export interface WorldAdvanceResult {
  state: GameState
  elapsedDays: number
}

/**
 * The only gameplay-facing entry point for advancing world time from V1.2
 * Stage 3 onward. Later stages attach mood/status expiry, knowledge expiry,
 * NPC milestones and world schedules here instead of creating parallel clocks.
 */
export function advanceWorldTime(state: GameState, days: number): WorldAdvanceResult {
  if (state.status !== 'playing') {
    return { state, elapsedDays: 0 }
  }

  const advanced = advanceTimeDays(state, days)
  return {
    state: resolveNaturalDeath(advanced),
    elapsedDays: days,
  }
}
