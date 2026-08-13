import { getSpiritRootById } from '../data/spiritRoots'
import {
  FOUNDATION_EARLY_TO_MIDDLE_THRESHOLD,
  FOUNDATION_MIDDLE_TO_LATE_THRESHOLD,
  QI_LAYER_THRESHOLD,
  REALM_CULTIVATION_FACTOR,
} from '../data/realms'
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
  gain?: number
  reason?: CultivationBlockReason
}

export function getEffectiveSpiritRootMultiplier(state: GameState): number {
  const root = getSpiritRootById(state.identity.spiritRootId)
  if (root && root.cultivationMultiplier > 0) {
    return root.cultivationMultiplier
  }

  const reformedMultiplier = state.flags.reformed_spirit_root_multiplier
  if (
    typeof reformedMultiplier === 'number' &&
    Number.isFinite(reformedMultiplier) &&
    reformedMultiplier > 0
  ) {
    return reformedMultiplier
  }

  return 0
}

export function calculateCultivationGain(state: GameState): number {
  const realmFactor = REALM_CULTIVATION_FACTOR[state.cultivation.realm]
  const rootFactor = getEffectiveSpiritRootMultiplier(state)

  if (rootFactor <= 0 || realmFactor <= 0) {
    return 0
  }

  const attributeFactor =
    1 + (state.stats.constitution + state.stats.comprehension - 10) * 0.03

  return Math.max(
    0,
    Math.round(BASIC_CULTIVATION_GAIN * attributeFactor * rootFactor * realmFactor),
  )
}

export function applyAutomaticStageProgression(state: GameState): GameState {
  if (state.status !== 'playing') {
    return state
  }

  let stage = state.cultivation.stage
  let cultivation = state.resources.cultivation

  if (state.cultivation.realm === 'qi') {
    while (stage < 9 && cultivation >= QI_LAYER_THRESHOLD) {
      cultivation -= QI_LAYER_THRESHOLD
      stage += 1
    }
  } else if (state.cultivation.realm === 'foundation') {
    if (stage === 1 && cultivation >= FOUNDATION_EARLY_TO_MIDDLE_THRESHOLD) {
      cultivation -= FOUNDATION_EARLY_TO_MIDDLE_THRESHOLD
      stage = 2
    }

    if (stage === 2 && cultivation >= FOUNDATION_MIDDLE_TO_LATE_THRESHOLD) {
      cultivation -= FOUNDATION_MIDDLE_TO_LATE_THRESHOLD
      stage = 3
    }
  }

  if (
    stage === state.cultivation.stage &&
    cultivation === state.resources.cultivation
  ) {
    return state
  }

  return {
    ...state,
    cultivation: { ...state.cultivation, stage },
    resources: { ...state.resources, cultivation },
  }
}

export function performBasicCultivation(state: GameState): CultivationResult {
  if (state.status !== 'playing') {
    return { state, applied: false, reason: 'GAME_ENDED' }
  }

  if (state.cultivation.realm === 'mortal') {
    return { state, applied: false, reason: 'NOT_A_CULTIVATOR' }
  }

  if (state.cultivation.realm === 'golden_core') {
    return { state, applied: false, reason: 'REALM_COMPLETE' }
  }

  const gain = calculateCultivationGain(state)
  const advanced = advanceTimeMonths(state, BASIC_CULTIVATION_MONTHS)
  const withGain: GameState = {
    ...advanced,
    resources: {
      ...advanced.resources,
      cultivation: advanced.resources.cultivation + gain,
    },
  }
  const progressed = applyAutomaticStageProgression(withGain)

  return {
    state: resolveNaturalDeath(progressed),
    applied: true,
    gain,
  }
}
