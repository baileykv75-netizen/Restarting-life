import type { EventCategory, GameEvent } from '../types/event'
import type { GameState } from '../types/game'
import { canAttemptBreakthrough, startBreakthrough } from './breakthroughEngine'
import { performBasicCultivation } from './cultivationEngine'
import type { EventCatalog } from './eventEngine'
import { drawEvent } from './eventEngine'
import { progressTime } from './gameEngine'
import { DAYS_PER_MONTH } from './timeEngine'

export type PlayerAction = 'cultivate' | 'explore' | 'livelihood' | 'breakthrough'

export type ActionBlockReason =
  | 'GAME_ENDED'
  | 'EVENT_ACTIVE'
  | 'NOT_A_CULTIVATOR'
  | 'BREAKTHROUGH_UNAVAILABLE'

export interface ActionResult {
  state: GameState
  applied: boolean
  reason?: ActionBlockReason
}

// Stage 2 only changes the internal clock. Stage 3 will remove this legacy
// fixed duration and replace it with per-activity Duration definitions.
const LEGACY_HALF_YEAR_DAYS = 6 * DAYS_PER_MONTH

function drawAfterTime(
  state: GameState,
  events: readonly GameEvent[],
  category: EventCategory,
): GameState {
  const progressed = progressTime(state, LEGACY_HALF_YEAR_DAYS).state
  if (progressed.status !== 'playing') {
    return progressed
  }

  return drawEvent(progressed, events, category).state
}

export function getAvailableActions(state: GameState): PlayerAction[] {
  if (state.status !== 'playing' || state.events.currentEventId !== null) {
    return []
  }

  const actions: PlayerAction[] = ['explore', 'livelihood']

  if (
    state.cultivation.realm === 'qi' ||
    state.cultivation.realm === 'foundation'
  ) {
    actions.unshift('cultivate')
  }

  if (canAttemptBreakthrough(state)) {
    actions.push('breakthrough')
  }

  return actions
}

export function performPlayerAction(
  state: GameState,
  action: PlayerAction,
  events: readonly GameEvent[],
  catalog: EventCatalog,
): ActionResult {
  if (state.status !== 'playing') {
    return { state, applied: false, reason: 'GAME_ENDED' }
  }

  if (state.events.currentEventId !== null) {
    return { state, applied: false, reason: 'EVENT_ACTIVE' }
  }

  if (action === 'cultivate') {
    const result = performBasicCultivation(state)
    if (!result.applied) {
      return {
        state: result.state,
        applied: false,
        reason:
          result.reason === 'NOT_A_CULTIVATOR'
            ? 'NOT_A_CULTIVATOR'
            : 'GAME_ENDED',
      }
    }

    if (result.state.status !== 'playing') {
      return { state: result.state, applied: true }
    }

    return {
      state: drawEvent(result.state, events, 'cultivation').state,
      applied: true,
    }
  }

  if (action === 'breakthrough') {
    if (!canAttemptBreakthrough(state)) {
      return { state, applied: false, reason: 'BREAKTHROUGH_UNAVAILABLE' }
    }

    return { state: startBreakthrough(state, catalog), applied: true }
  }

  if (action === 'explore') {
    return {
      state: drawAfterTime(state, events, 'exploration'),
      applied: true,
    }
  }

  const livelihoodCategory: EventCategory =
    state.identity.faction === 'qingyun' ? 'sect' : 'mortal'

  return {
    state: drawAfterTime(state, events, livelihoodCategory),
    applied: true,
  }
}
