import type { BeastId } from '../types/beast'
import type { GameState } from '../types/game'
import { getBeastPopulationKey } from './beastEngine'

const PRESSURE_WEIGHT: Readonly<Record<0 | 1 | 2 | 3, number>> = {
  0: 0,
  1: 0.5,
  2: 1,
  3: 1.5,
}

/**
 * R22 authoritative encounter-weight selector for ordinary populations.
 * Missing ecology/population state means the canonical untouched baseline=2.
 * R23 may consume this value when region danger and encounter composition are wired.
 */
export function getOrdinaryBeastEncounterWeightMultiplier(
  state: GameState,
  locationId: string,
  beastId: BeastId,
): number {
  const key = getBeastPopulationKey(locationId, beastId)
  const pressure = state.beastEcology?.populations[key]?.pressure ?? 2
  return PRESSURE_WEIGHT[pressure]
}
