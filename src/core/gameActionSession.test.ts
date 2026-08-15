import { describe, expect, it } from 'vitest'
import { applyPersistentCommand, createEmptyPersistentGame, startNewRun } from './persistentGameEngine'
import { verifySessionReplay } from './replayEngine'
import { createGameSession, executeSessionGameAction } from './sessionEngine'
import { DAYS_PER_YEAR } from './timeEngine'

describe('GameAction session dispatch', () => {
  it('records V2 GameAction commands in the existing debug/replay path', () => {
    const session = createGameSession({ runSeed: 'game-action-replay' })
    const result = executeSessionGameAction(session, {
      type: 'SET_LOCATION_KNOWLEDGE',
      locationId: 'blackwind_mountain',
      status: 'rumored',
    })
    expect(result.applied).toBe(true)
    expect(result.session.state.knowledge.locations.blackwind_mountain).toBe('rumored')
    expect(result.session.debugLog).toHaveLength(1)
    expect(result.session.debugLog[0].command).toEqual({ type: 'game-action', action: { type: 'SET_LOCATION_KNOWLEDGE', locationId: 'blackwind_mountain', status: 'rumored' } })
    expect(result.session.debugLog[0].effectTypes).toEqual(['game-action:SET_LOCATION_KNOWLEDGE'])
    expect(verifySessionReplay(result.session)).toBe(true)
  })

  it('does not log a rejected GameAction command', () => {
    const session = createGameSession({ runSeed: 'game-action-rejected' })
    const result = executeSessionGameAction(session, { type: 'ADVANCE_TIME', days: 0 })
    expect(result.applied).toBe(false)
    expect(result.reason).toBe('INVALID_TIME')
    expect(result.session.debugLog).toHaveLength(0)
  })

  it('lets the existing persistence lifecycle archive natural death from a GameAction', () => {
    const persistent = startNewRun(createEmptyPersistentGame(), { runSeed: 'game-action-death' })
    const session = persistent.currentSession!
    const nearDeath = { ...persistent, currentSession: { ...session, state: { ...session.state, worldDay: session.state.identity.birthDay + 80 * DAYS_PER_YEAR - 1, cultivation: { realm: 'mortal' as const, stage: 0 } } } }
    const result = applyPersistentCommand(nearDeath, { type: 'game-action', action: { type: 'ADVANCE_TIME', days: 1 } })
    expect(result.applied).toBe(true)
    expect(result.persistent.phase).toBe('ended')
    expect(result.persistent.currentSession?.state.status).toBe('dead')
    expect(result.persistent.archives).toHaveLength(1)
    expect(result.persistent.archives[0].summary.endReason).toBe('寿元耗尽')
  })
})
