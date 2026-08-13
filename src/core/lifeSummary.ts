import type { GameState } from '../types/game'
import type { DebugLogEntry, LifeRecord, LifeSummary } from '../types/persistence'
import { getGameStateDigest } from './stateDigest'
import { MONTHS_PER_YEAR } from './timeEngine'

function getLifeTitle(state: GameState): string {
  if (state.status === 'won' || state.cultivation.realm === 'golden_core') return '金丹真人'
  if (state.cultivation.realm === 'foundation') return '筑基修士'
  if (state.cultivation.realm === 'qi') return '炼气行者'
  return '凡尘一世'
}

function getLargestOpportunity(state: GameState): string {
  if (state.tags.includes('ancient_cave_legacy')) return '古修遗府'
  if (state.flags.master_legacy_received === true) return '师门传承'
  if (state.tags.includes('spirit_root:reformed')) return '无灵根改命'
  if (state.tags.includes('ghost_market_fragment')) return '夜半鬼市残页'
  if (state.tags.includes('li_qing_ally')) return '李青善缘'
  return '未留下明确的大机缘'
}

function getRegret(state: GameState): string {
  if (state.status === 'won') return '此世已结成金丹'
  if (state.flags.no_root_fate_missed === true) return '曾与一线改命机缘擦肩而过'
  if (state.flags.no_root_fate_refused === true) return '最终没有踏出逆天改命的那一步'
  if (
    state.cultivation.realm === 'mortal' &&
    state.tags.includes('has_spirit_root') &&
    state.flags.has_cultivation_method !== true
  ) return '身具灵根，却未真正踏入仙途'
  return '未能在寿元尽前结成金丹'
}

export function createLifeSummary(state: GameState): LifeSummary {
  if (state.status === 'playing') throw new Error('Cannot summarize a life that is still playing')
  return {
    title: getLifeTitle(state),
    finalRealm: state.cultivation.realm,
    ageYears: Math.floor(state.timeMonths / MONTHS_PER_YEAR),
    ageMonths: state.timeMonths % MONTHS_PER_YEAR,
    outcome: state.status,
    endReason: state.endReason ?? '未知结局',
    largestOpportunity: getLargestOpportunity(state),
    regret: getRegret(state),
  }
}

export function createLifeRecord(
  state: GameState,
  debugLog: readonly DebugLogEntry[],
  sequence: number,
): LifeRecord {
  return {
    sequence,
    runId: state.runId,
    runSeed: state.runSeed,
    stateDigest: getGameStateDigest(state),
    identity: { ...state.identity, talentIds: [...state.identity.talentIds] },
    stats: { ...state.stats },
    resources: { ...state.resources },
    cultivation: { ...state.cultivation },
    eventHistory: [...state.events.history],
    summary: createLifeSummary(state),
    debugLog: debugLog.map((entry) => ({ ...entry, effectTypes: [...entry.effectTypes] })),
  }
}
