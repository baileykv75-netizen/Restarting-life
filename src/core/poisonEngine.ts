import { getPoisonDefinition } from '../data/poisons'
import type { ChronicleEntry } from '../types/chronicle'
import type { GameState } from '../types/game'
import type { PoisonCondition, PoisonFamily } from '../types/poison'

export interface PoisonMutationResult {
  state: GameState
  applied: boolean
  reason?: string
}

function rejected(state: GameState, reason: string): PoisonMutationResult {
  return { state, applied: false, reason }
}

export function getActivePoisonConditions(state: GameState): PoisonCondition[] {
  return Object.values(state.poison?.conditions ?? {})
}

export function getActivePoison(state: GameState, family: PoisonFamily): PoisonCondition | null {
  return state.poison?.conditions[family] ?? null
}

export function hasActivePoison(state: GameState): boolean {
  return getActivePoisonConditions(state).length > 0
}

export function hasMildPoison(state: GameState): boolean {
  return getActivePoisonConditions(state).some((condition) => condition.severity === 'mild')
}

export function hasSeriousPoison(state: GameState): boolean {
  return getActivePoisonConditions(state).some((condition) => condition.severity === 'serious')
}

export function getNextPoisonMilestoneDay(state: GameState): number | null {
  const active = getActivePoisonConditions(state)
  if (active.length === 0) return null
  return Math.min(...active.map((condition) => condition.nextWorsenDay))
}

export function resolveApplyPoisonCondition(state: GameState, family: PoisonFamily): PoisonMutationResult {
  if (state.status !== 'playing') return rejected(state, 'GAME_ENDED')
  const definition = getPoisonDefinition(family)
  const current = getActivePoison(state, family)
  if (!current) {
    const condition: PoisonCondition = {
      family,
      severity: 'mild',
      appliedDay: state.worldDay,
      nextWorsenDay: state.worldDay + definition.worsenDays,
    }
    return {
      state: {
        ...state,
        poison: { conditions: { ...(state.poison?.conditions ?? {}), [family]: condition } },
      },
      applied: true,
    }
  }
  if (current.severity === 'serious') {
    return { state, applied: true }
  }
  const condition: PoisonCondition = {
    ...current,
    severity: 'serious',
    nextWorsenDay: state.worldDay + definition.worsenDays,
  }
  return {
    state: {
      ...state,
      poison: { conditions: { ...(state.poison?.conditions ?? {}), [family]: condition } },
    },
    applied: true,
  }
}

export function removePoisonCondition(state: GameState, family: PoisonFamily): GameState {
  if (!state.poison?.conditions[family]) return state
  const conditions = { ...state.poison.conditions }
  delete conditions[family]
  if (Object.keys(conditions).length > 0) return { ...state, poison: { conditions } }
  const next = { ...state }
  delete next.poison
  return next
}

export function downgradeSeriousPoison(state: GameState, family: PoisonFamily): GameState {
  const current = getActivePoison(state, family)
  if (!current || current.severity !== 'serious') return state
  const definition = getPoisonDefinition(family)
  return {
    ...state,
    poison: {
      conditions: {
        ...(state.poison?.conditions ?? {}),
        [family]: {
          ...current,
          severity: 'mild',
          nextWorsenDay: state.worldDay + definition.worsenDays,
        },
      },
    },
  }
}

function poisonDeathChronicle(state: GameState, condition: PoisonCondition): ChronicleEntry {
  const definition = getPoisonDefinition(condition.family)
  const narrative = `${definition.name}长期未能清除，毒性最终发作。`
  return {
    id: `${state.runId}:poison-death:${condition.family}:${state.worldDay}:${state.chronicle.length + 1}`,
    startDay: state.worldDay,
    endDay: state.worldDay,
    title: '毒发身亡',
    sceneText: narrative,
    narrative,
    changes: [{ label: '状态', value: '死亡', tone: 'negative' }],
    importance: 'major',
    sourceType: 'activity',
    sourceId: `poison:${condition.family}`,
    locationId: state.world.currentLocationId ?? undefined,
  }
}

export function resolvePoisonMilestonesAtCurrentDay(state: GameState): GameState {
  if (state.status !== 'playing' || !state.poison) return state
  let next = state
  const due = getActivePoisonConditions(next)
    .filter((condition) => condition.nextWorsenDay <= next.worldDay)
    .sort((a, b) => a.nextWorsenDay - b.nextWorsenDay || a.family.localeCompare(b.family))

  for (const condition of due) {
    if (next.status !== 'playing') break
    const current = getActivePoison(next, condition.family)
    if (!current || current.nextWorsenDay > next.worldDay) continue
    if (current.severity === 'mild') {
      const definition = getPoisonDefinition(current.family)
      next = {
        ...next,
        poison: {
          conditions: {
            ...(next.poison?.conditions ?? {}),
            [current.family]: {
              ...current,
              severity: 'serious',
              nextWorsenDay: current.nextWorsenDay + definition.worsenDays,
            },
          },
        },
      }
      continue
    }

    const definition = getPoisonDefinition(current.family)
    next = {
      ...next,
      status: 'dead',
      endReason: `${definition.name}长期未处理，最终毒发身亡。`,
      chronicle: [...next.chronicle, poisonDeathChronicle(next, current)],
    }
  }
  return next
}
