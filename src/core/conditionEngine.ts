import type { Condition } from '../types/event'
import type { GameState } from '../types/game'
import { getEffectiveStat } from './effectiveStats'
import { getAgeParts } from './timeEngine'

function assertNever(value: never): never {
  throw new Error(`Unsupported condition: ${JSON.stringify(value)}`)
}

export function matchesCondition(state: GameState, condition: Condition): boolean {
  const ageYears = getAgeParts(state.identity.birthDay, state.worldDay).years

  switch (condition.type) {
    case 'ageMin': return ageYears >= condition.years
    case 'ageMax': return ageYears <= condition.years
    case 'realm': return state.cultivation.realm === condition.realm
    case 'stageMin': return state.cultivation.stage >= condition.stage
    case 'stageMax': return state.cultivation.stage <= condition.stage
    case 'statMin': return getEffectiveStat(state, condition.stat) >= condition.value
    case 'statMax': return getEffectiveStat(state, condition.stat) <= condition.value
    case 'hasTag': return state.tags.includes(condition.tag)
    case 'notTag': return !state.tags.includes(condition.tag)
    case 'flagEquals': return state.flags[condition.key] === condition.value
    case 'flagMissing': return !(condition.key in state.flags)
    case 'faction': return state.identity.faction === condition.faction
    case 'relationshipMin': return (state.relationships[condition.id] ?? 0) >= condition.value
    case 'resourceMin': return state.resources[condition.resource] >= condition.value
    default: return assertNever(condition)
  }
}

export function matchesAllConditions(
  state: GameState,
  conditions: readonly Condition[] | undefined,
): boolean {
  return conditions?.every((condition) => matchesCondition(state, condition)) ?? true
}
