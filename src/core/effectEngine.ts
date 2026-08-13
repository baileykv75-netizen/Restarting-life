import type { Effect } from '../types/event'
import type { GameState } from '../types/game'
import { resolveNaturalDeath } from './lifespanEngine'
import { advanceTimeMonths } from './timeEngine'

export interface EffectContext {
  allowSetRealm?: boolean
}

function assertNever(value: never): never {
  throw new Error(`Unsupported effect: ${JSON.stringify(value)}`)
}

function clampRelationship(value: number): number {
  return Math.max(-100, Math.min(100, value))
}

function clearPendingEvents(state: GameState): GameState {
  return {
    ...state,
    events: {
      ...state.events,
      currentEventId: null,
      queue: [],
    },
  }
}

export function applyEffect(
  state: GameState,
  effect: Effect,
  context: EffectContext = {},
): GameState {
  if (state.status !== 'playing') {
    return state
  }

  switch (effect.type) {
    case 'addStat':
      return {
        ...state,
        stats: {
          ...state.stats,
          [effect.stat]: Math.max(1, state.stats[effect.stat] + effect.amount),
        },
      }
    case 'addSpiritStones':
      return {
        ...state,
        resources: {
          ...state.resources,
          spiritStones: Math.max(0, state.resources.spiritStones + effect.amount),
        },
      }
    case 'addCultivation':
      return {
        ...state,
        resources: {
          ...state.resources,
          cultivation: Math.max(0, state.resources.cultivation + effect.amount),
        },
      }
    case 'addTag':
      return state.tags.includes(effect.tag)
        ? state
        : { ...state, tags: [...state.tags, effect.tag] }
    case 'removeTag':
      return { ...state, tags: state.tags.filter((tag) => tag !== effect.tag) }
    case 'setFlag':
      return {
        ...state,
        flags: { ...state.flags, [effect.key]: effect.value },
      }
    case 'addRelationship':
      return {
        ...state,
        relationships: {
          ...state.relationships,
          [effect.id]: clampRelationship(
            (state.relationships[effect.id] ?? 0) + effect.amount,
          ),
        },
      }
    case 'advanceTime': {
      const advanced = resolveNaturalDeath(advanceTimeMonths(state, effect.months))
      return advanced.status === 'playing' ? advanced : clearPendingEvents(advanced)
    }
    case 'queueEvent':
      return {
        ...state,
        events: {
          ...state.events,
          queue: [...state.events.queue, effect.eventId],
        },
      }
    case 'killPlayer':
      return clearPendingEvents({
        ...state,
        status: 'dead',
        endReason: effect.reason,
      })
    case 'changeFaction':
      return {
        ...state,
        identity: { ...state.identity, faction: effect.faction },
      }
    case 'setRealm': {
      if (!context.allowSetRealm) {
        throw new Error('setRealm effect requires breakthrough permission')
      }
      if (!Number.isSafeInteger(effect.stage) || effect.stage < 0) {
        throw new RangeError('realm stage must be a non-negative safe integer')
      }

      const nextState: GameState = {
        ...state,
        cultivation: { realm: effect.realm, stage: effect.stage },
      }

      if (effect.realm !== 'golden_core') {
        return nextState
      }

      return clearPendingEvents({
        ...nextState,
        status: 'won',
        endReason: '结成金丹',
      })
    }
    default:
      return assertNever(effect)
  }
}

export function applyEffects(
  state: GameState,
  effects: readonly Effect[],
  context: EffectContext = {},
): GameState {
  let nextState = state

  for (const effect of effects) {
    nextState = applyEffect(nextState, effect, context)
    if (nextState.status !== 'playing') {
      break
    }
  }

  return nextState
}
