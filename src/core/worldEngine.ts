import type { GameState } from '../types/game'
import { resolveBeastEcologyRecovery } from './beastEngine'
import { resolveNaturalDeath } from './lifespanEngine'
import { getNextPoisonMilestoneDay, hasActivePoison, resolvePoisonMilestonesAtCurrentDay } from './poisonEngine'
import { advanceTimeDays } from './timeEngine'

export interface WorldAdvanceResult {
  state: GameState
  elapsedDays: number
}

function settleWorldDaySystems(state: GameState): GameState {
  return resolveBeastEcologyRecovery(state)
}

export function advanceWorldTime(state: GameState, days: number): WorldAdvanceResult {
  if (state.status !== 'playing') return { state, elapsedDays: 0 }

  // Preserve the exact pre-R21 path for old health states while allowing R22
  // ecology to aggregate from the same authoritative worldDay afterwards.
  if (!hasActivePoison(state)) {
    const advanced = resolveNaturalDeath(advanceTimeDays(state, days))
    return { state: settleWorldDaySystems(advanced), elapsedDays: days }
  }

  let current = state
  let remaining = days
  let elapsedDays = 0

  while (remaining > 0 && current.status === 'playing') {
    const milestoneDay = getNextPoisonMilestoneDay(current)
    const targetDay = current.worldDay + remaining
    if (milestoneDay === null || milestoneDay > targetDay) {
      current = resolveNaturalDeath(advanceTimeDays(current, remaining))
      elapsedDays += remaining
      remaining = 0
      break
    }

    const stepDays = Math.max(0, milestoneDay - current.worldDay)
    if (stepDays > 0) {
      current = resolveNaturalDeath(advanceTimeDays(current, stepDays))
      elapsedDays += stepDays
      remaining -= stepDays
      if (current.status !== 'playing') break
    }

    current = resolvePoisonMilestonesAtCurrentDay(current)
    if (current.status !== 'playing') break
  }

  return { state: settleWorldDaySystems(current), elapsedDays }
}
