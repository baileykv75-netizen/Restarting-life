import type { GameState, Realm } from '../types/game'
import { MONTHS_PER_YEAR } from './timeEngine'

const MAX_LIFESPAN_YEARS: Record<Exclude<Realm, 'golden_core'>, number> = {
  mortal: 80,
  qi: 120,
  foundation: 220,
}

export function getMaxLifespanMonths(realm: Realm): number | null {
  if (realm === 'golden_core') {
    return null
  }

  return MAX_LIFESPAN_YEARS[realm] * MONTHS_PER_YEAR
}

export function getRemainingLifespanMonths(state: GameState): number | null {
  const maxLifespanMonths = getMaxLifespanMonths(state.cultivation.realm)

  if (maxLifespanMonths === null) {
    return null
  }

  return Math.max(0, maxLifespanMonths - state.timeMonths)
}

export function resolveNaturalDeath(state: GameState): GameState {
  if (state.status !== 'playing') {
    return state
  }

  const maxLifespanMonths = getMaxLifespanMonths(state.cultivation.realm)

  if (maxLifespanMonths === null || state.timeMonths < maxLifespanMonths) {
    return state
  }

  return {
    ...state,
    status: 'dead',
    endReason: '寿元耗尽',
  }
}
