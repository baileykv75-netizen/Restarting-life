import type { GameState, Realm } from '../types/game'
import { DAYS_PER_YEAR } from './timeEngine'

const MAX_LIFESPAN_YEARS: Record<Exclude<Realm, 'golden_core'>, number> = {
  mortal: 80,
  qi: 120,
  foundation: 220,
}

export function getMaxLifespanDays(realm: Realm): number | null {
  if (realm === 'golden_core') {
    return null
  }

  return MAX_LIFESPAN_YEARS[realm] * DAYS_PER_YEAR
}

export function getRemainingLifespanDays(state: GameState): number | null {
  const maxLifespanDays = getMaxLifespanDays(state.cultivation.realm)

  if (maxLifespanDays === null) {
    return null
  }

  const ageDays = state.worldDay - state.identity.birthDay
  return Math.max(0, maxLifespanDays - ageDays)
}

export function resolveNaturalDeath(state: GameState): GameState {
  if (state.status !== 'playing') {
    return state
  }

  const maxLifespanDays = getMaxLifespanDays(state.cultivation.realm)
  const ageDays = state.worldDay - state.identity.birthDay

  if (maxLifespanDays === null || ageDays < maxLifespanDays) {
    return state
  }

  return {
    ...state,
    status: 'dead',
    endReason: '寿元耗尽',
  }
}
