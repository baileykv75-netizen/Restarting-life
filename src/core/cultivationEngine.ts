import type { GameState } from '../types/game'
import { resolveNaturalDeath } from './lifespanEngine'
import { advanceTimeMonths, MONTHS_PER_YEAR } from './timeEngine'

export const BASIC_CULTIVATION_MONTHS = MONTHS_PER_YEAR
export const BASIC_CULTIVATION_GAIN = 55

export type CultivationBlockReason =
  | 'GAME_ENDED'
  | 'NOT_A_CULTIVATOR'
  | 'REALM_COMPLETE'

export interface CultivationResult {
  state: GameState
  applied: boolean
  reason?: CultivationBlockReason
}

export function performBasicCultivation(state: GameState): CultivationResult {
  if (state.status !== 'playing') {
    return {
      state,
      applied: false,
      reason: 'GAME_ENDED',
    }
  }

  if (state.cultivation.realm === 'mortal') {
    return {
      state,
      applied: false,
      reason: 'NOT_A_CULTIVATOR',
    }
  }

  if (state.cultivation.realm === 'golden_core') {
    return {
      state,
      applied: false,
      reason: 'REALM_COMPLETE',
    }
  }

  const advanced = advanceTimeMonths(state, BASIC_CULTIVATION_MONTHS)
  const withCultivationGain: GameState = {
    ...advanced,
    resources: {
      ...advanced.resources,
      cultivation: advanced.resources.cultivation + BASIC_CULTIVATION_GAIN,
    },
  }

  return {
    state: resolveNaturalDeath(withCultivationGain),
    applied: true,
  }
}
