import { FORMAL_EVENTS } from '../data/events/formalEvents'
import type { PlayerAction, SessionCommand } from '../types/command'
import type { GameSession } from '../types/persistence'
import { performPlayerAction } from './actionEngine'
import { generateBirthState } from './birthEngine'
import { resolveBreakthroughAttempt } from './breakthroughEngine'
import {
  createEventCatalog,
  getAvailableChoices,
  resolveEventChoice,
} from './eventEngine'
import type { CreateGameStateOptions } from './gameState'
import { getGameStateDigest } from './stateDigest'

export const FORMAL_EVENT_CATALOG = createEventCatalog(FORMAL_EVENTS)

export interface SessionCommandResult {
  session: GameSession
  applied: boolean
  reason?: string
}

export function createGameSession(options: CreateGameStateOptions): GameSession {
  return {
    state: generateBirthState(options),
    debugLog: [],
  }
}

function getEffectTypes(session: GameSession, command: SessionCommand): string[] {
  if (command.type === 'action') return [`action:${command.action}`]

  const currentEventId = session.state.events.currentEventId
  if (!currentEventId) return ['choice:missing-event']

  const event = FORMAL_EVENT_CATALOG.get(currentEventId)
  if (!event) return ['choice:unknown-event']

  if (event.category === 'breakthrough' && command.choiceId === 'attempt') {
    return ['seededBreakthrough']
  }

  const choice = event.choices.find((candidate) => candidate.id === command.choiceId)
  return choice?.effects.map((effect) => effect.type) ?? []
}

export function executeSessionCommand(
  session: GameSession,
  command: SessionCommand,
): SessionCommandResult {
  const before = session.state
  const effectTypes = getEffectTypes(session, command)
  let nextState = before
  let applied = false
  let reason: string | undefined

  if (command.type === 'action') {
    const result = performPlayerAction(
      before,
      command.action,
      FORMAL_EVENTS,
      FORMAL_EVENT_CATALOG,
    )
    nextState = result.state
    applied = result.applied
    reason = result.reason
  } else {
    if (before.status !== 'playing') {
      return { session, applied: false, reason: 'GAME_ENDED' }
    }

    const eventId = before.events.currentEventId
    if (!eventId) return { session, applied: false, reason: 'NO_ACTIVE_EVENT' }

    const event = FORMAL_EVENT_CATALOG.get(eventId)
    if (!event) throw new Error(`Active formal event is missing: ${eventId}`)

    const choiceAvailable = getAvailableChoices(before, event).some(
      (choice) => choice.id === command.choiceId,
    )
    if (!choiceAvailable) {
      return { session, applied: false, reason: 'CHOICE_UNAVAILABLE' }
    }

    if (event.category === 'breakthrough' && command.choiceId === 'attempt') {
      nextState = resolveBreakthroughAttempt(before, FORMAL_EVENT_CATALOG).state
    } else {
      nextState = resolveEventChoice(before, FORMAL_EVENT_CATALOG, command.choiceId)
    }
    applied = true
  }

  if (!applied) return { session, applied: false, reason }

  const logEntry = {
    seq: session.debugLog.length + 1,
    command,
    timeMonthsBefore: before.timeMonths,
    timeMonthsAfter: nextState.timeMonths,
    eventIdBefore: before.events.currentEventId,
    eventIdAfter: nextState.events.currentEventId,
    rngBefore: before.rngState,
    rngAfter: nextState.rngState,
    effectTypes,
    stateDigestBefore: getGameStateDigest(before),
    stateDigestAfter: getGameStateDigest(nextState),
  }

  return {
    session: {
      state: nextState,
      debugLog: [...session.debugLog, logEntry],
    },
    applied: true,
  }
}

export function executeSessionAction(
  session: GameSession,
  action: PlayerAction,
): SessionCommandResult {
  return executeSessionCommand(session, { type: 'action', action })
}

export function executeSessionChoice(
  session: GameSession,
  choiceId: string,
): SessionCommandResult {
  return executeSessionCommand(session, { type: 'choice', choiceId })
}
