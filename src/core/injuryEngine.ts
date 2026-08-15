import type { GameState } from '../types/game'
import type { InjuryCondition, InjuryKind } from '../types/injury'
import type { ResolvedOutcome } from '../types/persistence'
import { formatDuration } from './timeEngine'
import { advanceWorldTime } from './worldEngine'

export type RecuperationDuration = 10 | 30
export const RECUPERATION_DURATIONS: readonly RecuperationDuration[] = [10, 30]

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

function isRecuperationDuration(days: number): days is RecuperationDuration {
  return RECUPERATION_DURATIONS.includes(days as RecuperationDuration)
}

export function resolveRecuperateDays(state: GameState, days: number): InjuryMutationResult {
  if (state.status !== 'playing') return { state, applied: false, completed: false, reason: 'GAME_ENDED' }
  if (!isRecuperationDuration(days)) return { state, applied: false, completed: false, reason: 'INVALID_RECUPERATION_DURATION' }
  if (state.secretRealm?.sunkenVeinChamber.active) return { state, applied: false, completed: false, reason: 'SECRET_REALM_ACTIVE' }
  if (state.events.currentEventId !== null) return { state, applied: false, completed: false, reason: 'EVENT_PENDING' }
  if (getActiveInjuries(state).length === 0) return { state, applied: false, completed: false, reason: 'NO_ACTIVE_INJURY' }

  const advanced = advanceWorldTime(state, days).state
  if (advanced.status !== 'playing') return { state: advanced, applied: true, completed: false }

  const remaining = getActiveInjuries(advanced)
  return {
    state: advanced,
    applied: true,
    completed: true,
    outcome: {
      title: `调养${formatDuration(days)}`,
      narrative: `你停下其他事务，用${formatDuration(days)}静养气血与经脉。`,
      changes: [{ label: '时间', value: `+${formatDuration(days)}`, tone: 'neutral' }],
      consequence: remaining.length === 0 ? '当前伤势已经自然恢复。' : '仍有伤势尚未恢复。',
    },
  }
}
