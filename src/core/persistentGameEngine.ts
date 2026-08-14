import type { SessionCommand } from '../types/command'
import type { PersistentGame } from '../types/persistence'
import { createLifeRecord } from './lifeSummary'
import type { CreateGameStateOptions } from './gameState'
import { createGameSession, executeSessionCommand } from './sessionEngine'

export function createEmptyPersistentGame(): PersistentGame {
  return {
    schemaVersion: 3,
    phase: 'birth-selection',
    currentSession: null,
    archives: [],
    meta: { totalRuns: 0 },
  }
}

export function startNewRun(
  persistent: PersistentGame,
  options: CreateGameStateOptions,
): PersistentGame {
  if (persistent.currentSession?.state.status === 'playing') {
    throw new Error('Cannot replace an active run')
  }

  return {
    ...persistent,
    phase: 'life',
    currentSession: createGameSession(options),
    meta: {
      ...persistent.meta,
      totalRuns: persistent.meta.totalRuns + 1,
    },
  }
}

export function applyPersistentCommand(
  persistent: PersistentGame,
  command: SessionCommand,
): { persistent: PersistentGame; applied: boolean; reason?: string } {
  const currentSession = persistent.currentSession
  if (!currentSession) {
    return { persistent, applied: false, reason: 'NO_CURRENT_RUN' }
  }

  const result = executeSessionCommand(currentSession, command)
  if (!result.applied) {
    return { persistent, applied: false, reason: result.reason }
  }

  let archives = persistent.archives
  if (
    result.session.state.status !== 'playing' &&
    !archives.some((record) => record.runId === result.session.state.runId)
  ) {
    archives = [
      ...archives,
      createLifeRecord(
        result.session.state,
        result.session.debugLog,
        archives.length + 1,
      ),
    ]
  }

  return {
    persistent: {
      ...persistent,
      phase: result.session.state.status === 'playing' ? 'life' : 'ended',
      currentSession: result.session,
      archives,
    },
    applied: true,
  }
}
