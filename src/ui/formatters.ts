import type { GameState } from '../types/game'
import { getRemainingLifespanMonths } from '../core/lifespanEngine'
import { MONTHS_PER_YEAR } from '../core/timeEngine'

export function formatAge(timeMonths: number): string {
  const years = Math.floor(timeMonths / MONTHS_PER_YEAR)
  const months = timeMonths % MONTHS_PER_YEAR
  return months === 0 ? `${years}岁` : `${years}岁${months}个月`
}

export function formatRealm(state: GameState): string {
  if (state.cultivation.realm === 'mortal') return '凡人'
  if (state.cultivation.realm === 'qi') return `炼气${state.cultivation.stage}层`
  if (state.cultivation.realm === 'golden_core') return '金丹'
  const stage = state.cultivation.stage === 1 ? '前期' : state.cultivation.stage === 2 ? '中期' : '后期'
  return `筑基${stage}`
}

export function formatFaction(state: GameState): string {
  if (state.identity.faction === 'qingyun') return '青云宗'
  if (state.identity.faction === 'loose') return '散修'
  return '凡人'
}

export function formatRemainingLifespan(state: GameState): string {
  const remaining = getRemainingLifespanMonths(state)
  if (remaining === null) return '已越凡寿'
  const years = Math.floor(remaining / MONTHS_PER_YEAR)
  const months = remaining % MONTHS_PER_YEAR
  return months === 0 ? `约${years}年` : `约${years}年${months}个月`
}
