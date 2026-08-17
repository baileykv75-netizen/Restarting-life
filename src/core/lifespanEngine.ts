import { BASE_LIFESPAN_YEARS, getLifespanEffectByItemId, getLifespanEffectByKey, getLifespanPenaltyByKey } from '../data/lifespan'
import type { GameState, Realm } from '../types/game'
import type { ResolvedOutcome } from '../types/persistence'
import { getInventoryQuantity, removeItem } from './inventoryEngine'
import { DAYS_PER_YEAR } from './timeEngine'

export interface LifespanBreakdown {
  baseYears: number
  bonusYears: number
  penaltyYears: number
  effectiveYears: number
}

export interface LifespanMutationResult {
  state: GameState
  applied: boolean
  completed: boolean
  reason?: string
  outcome?: ResolvedOutcome
}

export function getBaseMaxLifespanYears(realm: Realm): number {
  return BASE_LIFESPAN_YEARS[realm]
}

export function getMaxLifespanDays(realm: Realm): number {
  return getBaseMaxLifespanYears(realm) * DAYS_PER_YEAR
}

export function getLifespanBreakdown(state: GameState): LifespanBreakdown {
  const baseYears = getBaseMaxLifespanYears(state.cultivation.realm)
  const bonusYears = (state.lifespan?.appliedEffectKeys ?? []).reduce((sum, key) => sum + (getLifespanEffectByKey(key)?.years ?? 0), 0)
  const penaltyYears = (state.lifespan?.permanentPenaltyKeys ?? []).reduce((sum, key) => sum + (getLifespanPenaltyByKey(key)?.years ?? 0), 0)
  return {
    baseYears,
    bonusYears,
    penaltyYears,
    effectiveYears: Math.max(0, baseYears + bonusYears - penaltyYears),
  }
}

export function getEffectiveMaxLifespanYears(state: GameState): number {
  return getLifespanBreakdown(state).effectiveYears
}

export function getEffectiveMaxLifespanDays(state: GameState): number {
  return getEffectiveMaxLifespanYears(state) * DAYS_PER_YEAR
}

export function getRemainingLifespanDays(state: GameState): number {
  const ageDays = state.worldDay - state.identity.birthDay
  return Math.max(0, getEffectiveMaxLifespanDays(state) - ageDays)
}

export function resolveNaturalDeath(state: GameState): GameState {
  if (state.status !== 'playing') return state
  const ageDays = state.worldDay - state.identity.birthDay
  if (ageDays < getEffectiveMaxLifespanDays(state)) return state
  return { ...state, status: 'dead', endReason: '寿元耗尽' }
}

function materializeLifespan(state: GameState): NonNullable<GameState['lifespan']> {
  return state.lifespan
    ? {
        appliedEffectKeys: [...state.lifespan.appliedEffectKeys],
        permanentPenaltyKeys: [...state.lifespan.permanentPenaltyKeys],
      }
    : { appliedEffectKeys: [], permanentPenaltyKeys: [] }
}

export function hasLifespanEffect(state: GameState, effectKey: string): boolean {
  return (state.lifespan?.appliedEffectKeys ?? []).includes(effectKey)
}

export function hasLifespanPenalty(state: GameState, penaltyKey: string): boolean {
  return (state.lifespan?.permanentPenaltyKeys ?? []).includes(penaltyKey)
}

export function applyPermanentLifespanPenalty(state: GameState, penaltyKey: string): GameState {
  const definition = getLifespanPenaltyByKey(penaltyKey)
  if (!definition || hasLifespanPenalty(state, penaltyKey)) return state
  const lifespan = materializeLifespan(state)
  const next: GameState = {
    ...state,
    lifespan: {
      ...lifespan,
      permanentPenaltyKeys: [...lifespan.permanentPenaltyKeys, penaltyKey],
    },
  }
  return resolveNaturalDeath(next)
}

function appendLifespanChronicle(state: GameState, itemName: string, years: number): GameState {
  return {
    ...state,
    chronicle: [...state.chronicle, {
      id: `${state.runId}:lifespan:${state.worldDay}:${state.chronicle.length + 1}`,
      startDay: state.worldDay,
      endDay: state.worldDay,
      title: `服用${itemName}`,
      sceneText: `你使用了${itemName}，寿元上限增加${years}年。`,
      narrative: `你使用了${itemName}，寿元上限增加${years}年。`,
      changes: [{ label: '最大寿元', value: `+${years}年`, tone: 'positive' }],
      importance: 'notable',
      sourceType: 'activity',
      sourceId: 'lifespan-item',
      locationId: state.world.currentLocationId ?? undefined,
    }],
  }
}

export function resolveUseLifespanItem(state: GameState, itemId: string): LifespanMutationResult {
  if (state.status !== 'playing') return { state, applied: false, completed: false, reason: 'GAME_ENDED' }
  if (state.lifeStage !== 'adult') return { state, applied: false, completed: false, reason: 'LIFESPAN_ITEM_REQUIRES_ADULT' }
  if (state.secretRealm?.sunkenVeinChamber.active) return { state, applied: false, completed: false, reason: 'SECRET_REALM_ACTIVE' }
  if (state.events.currentEventId !== null) return { state, applied: false, completed: false, reason: 'EVENT_PENDING' }
  const effect = getLifespanEffectByItemId(itemId)
  if (!effect) return { state, applied: false, completed: false, reason: 'NOT_LIFESPAN_ITEM' }
  if (hasLifespanEffect(state, effect.effectKey)) return { state, applied: false, completed: false, reason: 'LIFESPAN_EFFECT_ALREADY_APPLIED' }
  if (getInventoryQuantity(state, itemId) < 1) return { state, applied: false, completed: false, reason: 'LIFESPAN_ITEM_NOT_OWNED' }

  const removed = removeItem(state, itemId, 1)
  if (!removed.applied) return { state, applied: false, completed: false, reason: removed.reason ?? 'LIFESPAN_ITEM_CONSUME_FAILED' }
  const lifespan = materializeLifespan(removed.state)
  let next: GameState = {
    ...removed.state,
    lifespan: {
      ...lifespan,
      appliedEffectKeys: [...lifespan.appliedEffectKeys, effect.effectKey],
    },
  }
  next = appendLifespanChronicle(next, effect.name, effect.years)
  return {
    state: next,
    applied: true,
    completed: true,
    outcome: {
      title: `使用${effect.name}`,
      narrative: `你使用了${effect.name}，最大寿元增加${effect.years}年。`,
      changes: [{ label: '最大寿元', value: `+${effect.years}年`, tone: 'positive' }],
      consequence: `当前最大寿元为 ${getEffectiveMaxLifespanYears(next)} 年；同一延寿效果不会再次生效。`,
    },
  }
}
