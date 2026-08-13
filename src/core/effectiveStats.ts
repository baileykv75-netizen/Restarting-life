import type { StatKey } from '../types/content'
import type { GameState } from '../types/game'

export function getRealmStatBonus(state: GameState, stat: StatKey): number {
  if (stat !== 'spiritSense') return 0
  const { realm, stage } = state.cultivation
  if (realm === 'mortal') return 0
  if (realm === 'qi') return Math.max(1, Math.min(9, stage))
  if (realm === 'foundation') return stage <= 1 ? 14 : stage === 2 ? 18 : 22
  return 30
}

export function getEffectiveStat(state: GameState, stat: StatKey): number {
  return state.stats[stat] + getRealmStatBonus(state, stat)
}
