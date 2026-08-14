import { getActionDuration } from '../data/actionDurations'
import type { EventCategory, GameEvent } from '../types/event'
import type { GameState } from '../types/game'
import type { PlayerAction } from '../types/command'
import { canAttemptBreakthrough, startBreakthrough } from './breakthroughEngine'
import { performBasicCultivation } from './cultivationEngine'
import { resolveDuration } from './durationEngine'
import type { EventCatalog } from './eventEngine'
import { drawEvent } from './eventEngine'
import { advanceWorldTime } from './worldEngine'

export type { PlayerAction } from '../types/command'

export type ActionBlockReason =
  | 'GAME_ENDED'
  | 'EVENT_ACTIVE'
  | 'NOT_A_CULTIVATOR'
  | 'BREAKTHROUGH_UNAVAILABLE'

export interface ActionResult {
  state: GameState
  applied: boolean
  elapsedDays?: number
  reason?: ActionBlockReason
}

/**
 * V2 migration boundary: `duration -> drawEvent(category)` is a V1.2 legacy
 * main-loop responsibility. Keep it stable while the old UI is still live,
 * but do not extend it into V2 exploration, location, sect, or world logic.
 * V2 activities must eventually be derived from current location + character
 * state + knowledge, with EventEngine used only when that context triggers one.
 */
function drawAfterDuration(
  state: GameState,
  action: PlayerAction,
  events: readonly GameEvent[],
  category: EventCategory,
): ActionResult {
  const duration = getActionDuration(action)
  if (!duration) throw new Error(`Missing duration for action: ${action}`)

  const resolved = resolveDuration(duration, state.rngState)
  const withResolvedRng: GameState = {
    ...state,
    rngState: resolved.rngState,
  }
  const progressed = advanceWorldTime(withResolvedRng, resolved.days).state

  if (progressed.status !== 'playing') {
    return { state: progressed, applied: true, elapsedDays: resolved.days }
  }

  return {
    state: drawEvent(progressed, events, category).state,
    applied: true,
    elapsedDays: resolved.days,
  }
}

/**
 * V2 migration boundary: this list is the V1.2 four-action shell, not the
 * future V2 activity discovery API. Do not add new V2 world actions here just
 * to make them visible in the legacy ActionPanel.
 */
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
      return { state: result.state, applied: true, elapsedDays: result.elapsedDays }
    }

    return {
      state: drawEvent(result.state, events, 'cultivation').state,
      applied: true,
      elapsedDays: result.elapsedDays,
    }
  }

  if (action === 'breakthrough') {
    if (!canAttemptBreakthrough(state)) {
      return { state, applied: false, reason: 'BREAKTHROUGH_UNAVAILABLE' }
    }

    return { state: startBreakthrough(state, catalog), applied: true, elapsedDays: 0 }
  }

  if (action === 'explore') {
    return drawAfterDuration(state, action, events, 'exploration')
  }

  const livelihoodCategory: EventCategory =
    state.identity.faction === 'qingyun' ? 'sect' : 'mortal'

  return drawAfterDuration(state, action, events, livelihoodCategory)
}
