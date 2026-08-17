import { getItemDefinition } from '../data/items'
import { getPoisonDefinition } from '../data/poisons'
import type { GameState } from '../types/game'
import type { InjuryCondition, InjuryKind } from '../types/injury'
import type { ResolvedOutcome } from '../types/persistence'
import { getInventoryQuantity, removeItem } from './inventoryEngine'
import {
  downgradeSeriousPoison,
  getActivePoison,
  hasActivePoison,
  removePoisonCondition,
} from './poisonEngine'
import { formatDuration } from './timeEngine'
import { advanceWorldTime } from './worldEngine'

export type RecuperationDuration = 10 | 30
export const RECUPERATION_DURATIONS: readonly RecuperationDuration[] = [10, 30]

const ZHIXUE_SAN_ID = 'zhixue_san'
const QINGDU_SAN_ID = 'qingdu_san'
const YANGMAI_DAN_ID = 'yangmai_dan'

export interface InjuryMutationResult {
  state: GameState
  applied: boolean
  completed: boolean
  reason?: string
  outcome?: ResolvedOutcome
}

export function isInjuryActive(condition: InjuryCondition, worldDay: number): boolean {
  return condition.recoveryDay > worldDay
}

export function getActiveInjuries(state: GameState): InjuryCondition[] {
  return (state.injuries?.conditions ?? []).filter((condition) => isInjuryActive(condition, state.worldDay))
}

export function hasActiveInjury(state: GameState, kind: InjuryKind): boolean {
  return getActiveInjuries(state).some((condition) => condition.kind === kind)
}

export function hasBlockingCultivationInjury(state: GameState): boolean {
  return hasActiveInjury(state, 'severe') || hasActiveInjury(state, 'meridian')
}

export function hasActiveLightInjury(state: GameState): boolean {
  return hasActiveInjury(state, 'light')
}

export function addInjuries(
  state: GameState,
  sourceId: string,
  entries: readonly { kind: InjuryKind; recoveryDays: number }[],
): GameState {
  if (entries.length === 0) return state
  const existing = state.injuries?.conditions ?? []
  const added = entries.map((entry, index): InjuryCondition => ({
    id: `${state.runId}:injury:${sourceId}:${entry.kind}:${state.worldDay}:${index + 1}`,
    kind: entry.kind,
    sourceId,
    startedDay: state.worldDay,
    recoveryDay: state.worldDay + entry.recoveryDays,
  }))
  return {
    ...state,
    injuries: { conditions: [...existing, ...added] },
  }
}

export function addOrExtendCombatSevereInjury(state: GameState, sourceId: string): GameState {
  const activeSevere = getActiveInjuries(state)
    .filter((condition) => condition.kind === 'severe')
    .sort((a, b) => b.recoveryDay - a.recoveryDay)[0]
  if (!activeSevere) return addInjuries(state, sourceId, [{ kind: 'severe', recoveryDays: 45 }])
  const cappedRecoveryDay = Math.min(state.worldDay + 90, activeSevere.recoveryDay + 15)
  if (cappedRecoveryDay === activeSevere.recoveryDay) return state
  return {
    ...state,
    injuries: {
      conditions: (state.injuries?.conditions ?? []).map((condition) =>
        condition.id === activeSevere.id ? { ...condition, recoveryDay: cappedRecoveryDay } : condition,
      ),
    },
  }
}

function isRecuperationDuration(days: number): days is RecuperationDuration {
  return RECUPERATION_DURATIONS.includes(days as RecuperationDuration)
}

export function resolveRecuperateDays(state: GameState, days: number): InjuryMutationResult {
  if (state.status !== 'playing') return { state, applied: false, completed: false, reason: 'GAME_ENDED' }
  if (!isRecuperationDuration(days)) return { state, applied: false, completed: false, reason: 'INVALID_RECUPERATION_DURATION' }
  if (state.secretRealm?.sunkenVeinChamber.active) return { state, applied: false, completed: false, reason: 'SECRET_REALM_ACTIVE' }
  if (state.events.currentEventId !== null) return { state, applied: false, completed: false, reason: 'EVENT_PENDING' }
  if (getActiveInjuries(state).length === 0 && !hasActivePoison(state)) return { state, applied: false, completed: false, reason: 'NO_ACTIVE_INJURY' }

  const advanced = advanceWorldTime(state, days).state
  if (advanced.status !== 'playing') return { state: advanced, applied: true, completed: false }

  const remainingInjuries = getActiveInjuries(advanced)
  const poisonStillActive = hasActivePoison(advanced)
  return {
    state: advanced,
    applied: true,
    completed: true,
    outcome: {
      title: `调养${formatDuration(days)}`,
      narrative: `你停下其他事务，用${formatDuration(days)}静养气血与经脉。`,
      changes: [{ label: '时间', value: `+${formatDuration(days)}`, tone: 'neutral' }],
      consequence: poisonStillActive
        ? '中毒不会因静养自行消失，毒性仍按世界时间继续发展。'
        : remainingInjuries.length === 0
          ? '当前伤势已经自然恢复。'
          : '仍有伤势尚未恢复。',
    },
  }
}

function treatmentRejected(state: GameState, reason: string): InjuryMutationResult {
  return { state, applied: false, completed: false, reason }
}

function markInjuryTreatment(
  state: GameState,
  injuryId: string,
  treatmentKey: string,
  reduceDays: number,
): GameState {
  return {
    ...state,
    injuries: {
      conditions: (state.injuries?.conditions ?? []).map((condition) =>
        condition.id === injuryId
          ? {
              ...condition,
              recoveryDay: Math.max(state.worldDay, condition.recoveryDay - reduceDays),
              treatmentKeys: [...(condition.treatmentKeys ?? []), treatmentKey],
            }
          : condition,
      ),
    },
  }
}

function treatmentOutcome(itemName: string, effect: string): ResolvedOutcome {
  return {
    title: `使用${itemName}`,
    narrative: effect,
    changes: [{ label: itemName, value: '-1', tone: 'negative' }],
    consequence: null,
  }
}

export function resolveUseTreatmentItem(state: GameState, itemId: string, injuryId?: string): InjuryMutationResult {
  if (state.status !== 'playing') return treatmentRejected(state, 'GAME_ENDED')
  if (state.combat) return treatmentRejected(state, 'COMBAT_ACTIVE')
  if (!state.inventory) return treatmentRejected(state, 'INVENTORY_NOT_INITIALIZED')
  if (![ZHIXUE_SAN_ID, QINGDU_SAN_ID, YANGMAI_DAN_ID].includes(itemId)) return treatmentRejected(state, 'ITEM_NOT_TREATMENT')
  if (getInventoryQuantity(state, itemId) < 1) return treatmentRejected(state, 'TREATMENT_ITEM_NOT_OWNED')

  const itemName = getItemDefinition(itemId)?.name ?? itemId
  let treated = state
  let effect = ''

  if (itemId === QINGDU_SAN_ID) {
    const poison = getActivePoison(state, 'bishui_venom')
    if (!poison) return treatmentRejected(state, 'NO_TREATABLE_POISON')
    if (!getPoisonDefinition(poison.family).treatableByQingduSan) return treatmentRejected(state, 'POISON_NOT_TREATABLE_BY_QINGDU')
    if (poison.severity === 'mild') {
      treated = removePoisonCondition(state, poison.family)
      effect = '药力压下残留毒性，这次低阶蛇毒已经清除。'
    } else {
      treated = downgradeSeriousPoison(state, poison.family)
      effect = '药力暂时压住了严重毒性，状态降为轻度中毒；新的恶化期限从今日重新计算十日。'
    }
  } else {
    if (!injuryId) return treatmentRejected(state, 'TREATMENT_REQUIRES_INJURY_TARGET')
    const injury = getActiveInjuries(state).find((condition) => condition.id === injuryId)
    if (!injury) return treatmentRejected(state, 'INJURY_TARGET_NOT_ACTIVE')
    const treatmentKey = itemId
    if (injury.treatmentKeys?.includes(treatmentKey)) return treatmentRejected(state, 'INJURY_ALREADY_TREATED_BY_ITEM')

    if (itemId === ZHIXUE_SAN_ID) {
      if (injury.kind !== 'light' && injury.kind !== 'severe') return treatmentRejected(state, 'ZHIXUE_SAN_REQUIRES_EXTERNAL_INJURY')
      const reduction = injury.kind === 'light' ? 7 : 5
      treated = markInjuryTreatment(state, injury.id, treatmentKey, reduction)
      effect = injury.kind === 'light'
        ? '你处理了普通外伤，预计恢复时间缩短七日。'
        : '你先把明显外伤稳定下来，重伤恢复时间缩短五日；更深的损伤仍需时间恢复。'
    } else {
      if (injury.kind !== 'meridian') return treatmentRejected(state, 'YANGMAI_DAN_REQUIRES_MERIDIAN_INJURY')
      treated = markInjuryTreatment(state, injury.id, treatmentKey, 30)
      effect = '养脉丹开始修复受损经脉，预计恢复时间缩短三十日。'
    }
  }

  const removed = removeItem(treated, itemId, 1)
  if (!removed.applied) return treatmentRejected(state, removed.reason ?? 'TREATMENT_ITEM_CONSUME_FAILED')
  return { state: removed.state, applied: true, completed: true, outcome: treatmentOutcome(itemName, effect) }
}
