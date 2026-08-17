import { describe, expect, it } from 'vitest'
import type { PersistentGame } from '../types/persistence'
import { applyGameAction } from './gameActionReducer'
import { createInitialGameState } from './gameState'
import { applyPersistentCommand } from './persistentGameEngine'

function activeCombatGame(): PersistentGame {
  const base = createInitialGameState({ runSeed: 'r20-command-guard' })
  const adult = { ...base, lifeStage: 'adult' as const }
  const started = applyGameAction(adult, { type: 'START_COMBAT', opponentId: 'greenback-wolf', source: 'field' })
  if (!started.applied || !started.state.combat) throw new Error(started.reason)
  return {
    schemaVersion: 3,
    phase: 'life',
    currentSession: { state: started.state, debugLog: [], pendingResult: null, pendingAction: null },
    pendingBirthSelection: null,
    archives: [],
    meta: { totalRuns: 1 },
  }
}

describe('R20 persistent command combat guard', () => {
  it('blocks non-combat SessionCommands while a formal battle is active', () => {
    const game = activeCombatGame()
    const travel = applyPersistentCommand(game, { type: 'travel', destinationId: 'qingstone_town' })
    expect(travel.applied).toBe(false)
    expect(travel.reason).toBe('COMBAT_ACTIVE')
    expect(travel.persistent).toBe(game)
  })

  it('allows the active combat action path through the same persistent command boundary', () => {
    const game = activeCombatGame()
    const result = applyPersistentCommand(game, { type: 'game-action', action: { type: 'COMBAT_ACTION', action: { type: 'basic' } } })
    expect(result.applied).toBe(true)
    expect(result.persistent.currentSession?.debugLog).toHaveLength(1)
  })
})
