import type { BeastId } from '../types/beast'
import type { CombatOpponentId } from '../types/combat'
import type { ExplorationDuration } from '../types/exploration'
import type { GameState } from '../types/game'
import { getOrdinaryBeastEncounterWeightMultiplier } from './beastEcologySelectors'
import { resolveCombatStart } from './combatEngine'
import { nextRandom, seedToState, weightedPick } from './rng'

interface WildernessEncounterCandidate {
  beastId: BeastId
  opponentId: CombatOpponentId
}

export interface WildernessEncounterResult {
  state: GameState
  encountered: boolean
  opponentId?: CombatOpponentId
  beastId?: BeastId
  chance: number
  reason?: string
}

const BASE_ENCOUNTER_CHANCE: Readonly<Record<ExplorationDuration, number>> = {
  1: 0.25,
  3: 0.5,
  10: 0.8,
}

/**
 * R22-FIX only wires ordinary beasts into the existing exploration loop.
 * Special/unique beasts stay out of random regional exploration so hidden
 * world truth is not leaked before their later explicit location/territory entry.
 */
const REGION_POOLS: Readonly<Record<string, readonly WildernessEncounterCandidate[]>> = {
  blackwind_mountain: [
    { beastId: 'greenback_wolf', opponentId: 'greenback-wolf' },
    { beastId: 'redtail_fox', opponentId: 'redtail-fox' },
    { beastId: 'ironhide_boar', opponentId: 'ironhide-boar' },
    { beastId: 'rock_armored_lizard', opponentId: 'adult-rock-lizard' },
  ],
  lingxi_valley: [
    { beastId: 'redtail_fox', opponentId: 'redtail-fox' },
    { beastId: 'bishui_snake', opponentId: 'bishui-snake' },
  ],
  beast_ridge: [
    { beastId: 'greenback_wolf', opponentId: 'greenback-wolf' },
    { beastId: 'red_maned_ape', opponentId: 'red-maned-ape' },
  ],
}

export function getOrdinaryWildernessEncounterPool(locationId: string): readonly WildernessEncounterCandidate[] {
  return REGION_POOLS[locationId] ?? []
}

function encounterSeed(state: GameState, locationId: string, previousExploredDays: number, days: ExplorationDuration): number {
  return seedToState(`${state.runSeed}:r22-fix:wilderness:${locationId}:${state.worldDay}:${previousExploredDays}:${days}`)
}

export function resolveWildernessEncounter(
  state: GameState,
  locationId: string,
  previousExploredDays: number,
  days: ExplorationDuration,
): WildernessEncounterResult {
  if (state.flags.wilderness_encounters_initialized !== true) {
    return { state, encountered: false, chance: 0, reason: 'WILDERNESS_ENCOUNTERS_NOT_INITIALIZED' }
  }
  if (state.combat) return { state, encountered: false, chance: 0, reason: 'COMBAT_ALREADY_ACTIVE' }
  if (state.pendingBeastLoot) return { state, encountered: false, chance: 0, reason: 'PENDING_BEAST_LOOT' }

  const pool = getOrdinaryWildernessEncounterPool(locationId)
  if (pool.length === 0) return { state, encountered: false, chance: 0, reason: 'NO_ORDINARY_BEAST_POOL' }

  const weighted = pool
    .map((candidate) => ({
      ...candidate,
      weight: getOrdinaryBeastEncounterWeightMultiplier(state, locationId, candidate.beastId),
    }))
    .filter((candidate) => candidate.weight > 0)

  if (weighted.length === 0) return { state, encountered: false, chance: 0, reason: 'ORDINARY_BEASTS_DEPLETED' }

  const totalWeight = weighted.reduce((sum, candidate) => sum + candidate.weight, 0)
  const relativePresence = totalWeight / pool.length
  const chance = Math.min(0.95, BASE_ENCOUNTER_CHANCE[days] * relativePresence)
  const chanceRoll = nextRandom(encounterSeed(state, locationId, previousExploredDays, days))
  if (chanceRoll.value >= chance) return { state, encountered: false, chance }

  const picked = weightedPick(chanceRoll.nextState, weighted)
  const started = resolveCombatStart(state, picked.item.opponentId, 'field', [], 'ordinary')
  if (!started.applied) {
    return {
      state,
      encountered: false,
      chance,
      beastId: picked.item.beastId,
      opponentId: picked.item.opponentId,
      reason: started.reason ?? 'WILDERNESS_COMBAT_START_FAILED',
    }
  }
  return {
    state: started.state,
    encountered: true,
    chance,
    beastId: picked.item.beastId,
    opponentId: picked.item.opponentId,
  }
}
