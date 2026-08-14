import type { GameState } from '../types/game'
import { getRemainingLifespanDays } from '../core/lifespanEngine'
import { formatDuration, getAgeParts } from '../core/timeEngine'

export function formatAge(worldDay: number, birthDay = 0): string {
  const age = getAgeParts(birthDay, worldDay)
  if (age.months === 0 && age.days === 0) return `${age.years}岁`
  if (age.days === 0) return `${age.years}岁${age.months}个月`
  return `${age.years}岁${age.months}个月${age.days}日`
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
  const remaining = getRemainingLifespanDays(state)
  if (remaining === null) return '已越凡寿'
  return `约${formatDuration(remaining)}`
}
