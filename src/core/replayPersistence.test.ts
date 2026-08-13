import { describe, expect, it } from 'vitest'
import type { PersistentGame } from '../types/persistence'
import { getAvailableChoices } from './eventEngine'
import {
  applyPersistentCommand,
  createEmptyPersistentGame,
  startNewRun,
} from './persistentGameEngine'
import { verifySessionReplay } from './replayEngine'
import {
  createGameSession,
  executeSessionAction,
  executeSessionChoice,
  FORMAL_EVENT_CATALOG,
} from './sessionEngine'

describe('stage-6 replay and archives', () => {
  it('records successful operations and replays them to the same state', () => {
    let session = createGameSession({ runSeed: 'session-replay' })
    const action = executeSessionAction(session, 'explore')
    expect(action.applied).toBe(true)
    session = action.session

    expect(session.debugLog).toHaveLength(1)
    expect(session.debugLog[0].seq).toBe(1)
    expect(session.debugLog[0].rngBefore).toBeTypeOf('number')
    expect(session.debugLog[0].stateDigestBefore).not.toBe(
      session.debugLog[0].stateDigestAfter,
    )

    const eventId = session.state.events.currentEventId
    expect(eventId).not.toBeNull()
    const event = FORMAL_EVENT_CATALOG.get(eventId!)
    expect(event).toBeDefined()
    const choice = getAvailableChoices(session.state, event!)[0]
    expect(choice).toBeDefined()

    const choiceResult = executeSessionChoice(session, choice.id)
    expect(choiceResult.applied).toBe(true)
    session = choiceResult.session
    expect(session.debugLog).toHaveLength(2)
    expect(verifySessionReplay(session)).toBe(true)
  })

  it('does not record an invalid operation', () => {
    const session = createGameSession({ runSeed: 'invalid-operation' })
    const result = executeSessionAction(session, 'cultivate')
    expect(result.applied).toBe(false)
    expect(result.session.debugLog).toEqual([])
  })

  it('archives a finished life exactly once and keeps the archive across reincarnation', () => {
    let persistent = startNewRun(createEmptyPersistentGame(), {
      runSeed: 'archive-life',
    })
    const current = persistent.currentSession!
    const prepared: PersistentGame = {
      ...persistent,
      currentSession: {
        ...current,
        state: {
          ...current.state,
          timeMonths: 80 * 12 - 6,
          identity: { ...current.state.identity, spiritRootId: 'none' },
          tags: ['no_spirit_root', 'spirit_root:none'],
        },
      },
    }

    const ended = applyPersistentCommand(prepared, {
      type: 'action',
      action: 'livelihood',
    })
    expect(ended.applied).toBe(true)
    expect(ended.persistent.currentSession?.state.status).toBe('dead')
    expect(ended.persistent.archives).toHaveLength(1)
    expect(ended.persistent.archives[0].summary.outcome).toBe('dead')

    const rejected = applyPersistentCommand(ended.persistent, {
      type: 'action',
      action: 'explore',
    })
    expect(rejected.applied).toBe(false)
    expect(rejected.persistent.archives).toHaveLength(1)

    const nextLife = startNewRun(ended.persistent, { runSeed: 'archive-life-2' })
    expect(nextLife.meta.totalRuns).toBe(2)
    expect(nextLife.archives).toHaveLength(1)
    expect(nextLife.currentSession?.state.runSeed).toBe('archive-life-2')
  })
})
