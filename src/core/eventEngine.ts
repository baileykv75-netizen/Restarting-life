import type { EventCategory, EventChoice, GameEvent } from '../types/event'
import type { GameState } from '../types/game'
import { matchesAllConditions } from './conditionEngine'
import { applyEffects } from './effectEngine'
import { weightedPick } from './rng'

export type EventCatalog = ReadonlyMap<string, GameEvent>

function markEventActive(state: GameState, event: GameEvent): GameState {
  return {
    ...state,
    events: {
      ...state.events,
      currentEventId: event.id,
      history: [...state.events.history, event.id],
    },
  }
}

function countOccurrences(history: readonly string[], eventId: string): number {
  return history.reduce((count, id) => count + (id === eventId ? 1 : 0), 0)
}

function isCoolingDown(state: GameState, event: GameEvent): boolean {
  const cooldown = event.cooldown ?? (event.once ? 0 : 6)
  if (cooldown <= 0) return false
  return state.events.history.slice(-cooldown).includes(event.id)
}

export function createEventCatalog(events: readonly GameEvent[]): EventCatalog {
  const catalog = new Map<string, GameEvent>()

  for (const event of events) {
    if (catalog.has(event.id)) throw new Error(`Duplicate event id: ${event.id}`)
    if (!Number.isFinite(event.weight) || event.weight <= 0) {
      throw new Error(`Event weight must be positive: ${event.id}`)
    }
    if (event.choices.length === 0) {
      throw new Error(`Event must contain at least one choice: ${event.id}`)
    }
    if (event.cooldown !== undefined && (!Number.isSafeInteger(event.cooldown) || event.cooldown < 0)) {
      throw new Error(`Event cooldown must be a non-negative integer: ${event.id}`)
    }
    if (event.maxOccurrences !== undefined && (!Number.isSafeInteger(event.maxOccurrences) || event.maxOccurrences <= 0)) {
      throw new Error(`Event maxOccurrences must be a positive integer: ${event.id}`)
    }

    const choiceIds = new Set<string>()
    for (const choice of event.choices) {
      if (choiceIds.has(choice.id)) {
        throw new Error(`Duplicate choice id in ${event.id}: ${choice.id}`)
      }
      choiceIds.add(choice.id)
    }
    catalog.set(event.id, event)
  }

  for (const event of events) {
    for (const choice of event.choices) {
      if (choice.nextEventId && !catalog.has(choice.nextEventId)) {
        throw new Error(`Unknown nextEventId in ${event.id}/${choice.id}: ${choice.nextEventId}`)
      }
      for (const effect of choice.effects) {
        if (effect.type === 'queueEvent' && !catalog.has(effect.eventId)) {
          throw new Error(`Unknown queueEvent target in ${event.id}/${choice.id}: ${effect.eventId}`)
        }
      }
    }
  }

  return catalog
}

export function getEligibleEvents(
  state: GameState,
  events: readonly GameEvent[],
  category?: EventCategory,
): GameEvent[] {
  if (state.status !== 'playing') return []

  return events.filter((event) => {
    if (category && event.category !== category) return false

    const occurred = countOccurrences(state.events.history, event.id)
    const maxOccurrences = event.once ? 1 : event.maxOccurrences
    if (maxOccurrences !== undefined && occurred >= maxOccurrences) return false
    if (isCoolingDown(state, event)) return false

    return matchesAllConditions(state, event.conditions)
  })
}

export function drawEvent(
  state: GameState,
  events: readonly GameEvent[],
  category?: EventCategory,
): { state: GameState; event: GameEvent | null } {
  if (state.status !== 'playing') return { state, event: null }
  if (state.events.currentEventId !== null) {
    throw new Error('Cannot draw an event while another event is active')
  }

  const eligible = getEligibleEvents(state, events, category)
  if (eligible.length === 0) return { state, event: null }

  const roll = weightedPick(state.rngState, eligible)
  const nextState = markEventActive({ ...state, rngState: roll.nextState }, roll.item)
  return { state: nextState, event: roll.item }
}

export function startEventById(
  state: GameState,
  catalog: EventCatalog,
  eventId: string,
): GameState {
  if (state.status !== 'playing') return state
  if (state.events.currentEventId !== null) {
    throw new Error('Cannot start an event while another event is active')
  }

  const event = catalog.get(eventId)
  if (!event) throw new Error(`Unknown event id: ${eventId}`)
  if (event.once && state.events.history.includes(event.id)) {
    throw new Error(`Once event already occurred: ${event.id}`)
  }
  return markEventActive(state, event)
}

export function getAvailableChoices(state: GameState, event: GameEvent): EventChoice[] {
  return event.choices.filter((choice) => matchesAllConditions(state, choice.conditions))
}

function activateNextQueuedEvent(state: GameState, catalog: EventCatalog): GameState {
  let nextState = state

  while (nextState.status === 'playing' && nextState.events.queue.length > 0) {
    const [eventId, ...remainingQueue] = nextState.events.queue
    const event = catalog.get(eventId)
    if (!event) throw new Error(`Unknown queued event id: ${eventId}`)

    nextState = {
      ...nextState,
      events: { ...nextState.events, queue: remainingQueue },
    }

    if (event.once && nextState.events.history.includes(event.id)) continue
    return markEventActive(nextState, event)
  }

  return nextState
}

export function resolveEventChoice(
  state: GameState,
  catalog: EventCatalog,
  choiceId: string,
): GameState {
  if (state.status !== 'playing') return state

  const currentEventId = state.events.currentEventId
  if (!currentEventId) throw new Error('No active event to resolve')

  const event = catalog.get(currentEventId)
  if (!event) throw new Error(`Active event is missing from catalog: ${currentEventId}`)

  const choice = event.choices.find((candidate) => candidate.id === choiceId)
  if (!choice || !matchesAllConditions(state, choice.conditions)) {
    throw new Error(`Choice is not available: ${choiceId}`)
  }

  if (event.category === 'breakthrough' && choice.id === 'attempt') {
    throw new Error('Breakthrough attempt must be resolved by breakthroughEngine')
  }

  let nextState: GameState = {
    ...state,
    events: { ...state.events, currentEventId: null },
  }

  nextState = applyEffects(nextState, choice.effects, {
    allowSetRealm: event.category === 'breakthrough',
  })

  if (nextState.status !== 'playing') return nextState

  if (choice.nextEventId) {
    nextState = {
      ...nextState,
      events: {
        ...nextState.events,
        queue: [choice.nextEventId, ...nextState.events.queue],
      },
    }
  }

  return activateNextQueuedEvent(nextState, catalog)
}
