import type { SessionCommand } from '../types/command'
import type { PersistentGame } from '../types/persistence'
import { encodeSelectedBirthRunSeed, generateBirthCandidates } from './birthEngine'
import { createLifeRecord } from './lifeSummary'
import type { CreateGameStateOptions } from './gameState'
import { createGameSession, executeSessionCommand } from './sessionEngine'

export function createEmptyPersistentGame(): PersistentGame {
  return {
    schemaVersion: 3,
    phase: 'birth-selection',
    currentSession: null,
    pendingBirthSelection: null,
    archives: [],
    meta: { totalRuns: 0 },
  }
}

/** Legacy-compatible direct session start used by old replay/tests during migration. */
export function startNewRun(persistent: PersistentGame, options: CreateGameStateOptions): PersistentGame {
  if (persistent.currentSession?.state.status === 'playing') throw new Error('Cannot replace an active run')
  return {
    ...persistent,
    phase: 'life',
    currentSession: createGameSession(options),
    pendingBirthSelection: null,
    meta: { ...persistent.meta, totalRuns: persistent.meta.totalRuns + 1 },
  }
}

export function beginBirthSelection(persistent: PersistentGame, options: CreateGameStateOptions): PersistentGame {
  if (persistent.phase === 'birth-selection' && persistent.pendingBirthSelection) return persistent
  if (persistent.currentSession?.state.status === 'playing') throw new Error('Cannot replace an active run')
  const pendingBirthSelection = generateBirthCandidates(options)
  return {
    ...persistent,
    phase: 'birth-selection',
    currentSession: null,
    pendingBirthSelection,
    meta: { ...persistent.meta, totalRuns: persistent.meta.totalRuns + 1 },
  }
}

export function chooseBirthCandidate(persistent: PersistentGame, candidateId: string): PersistentGame {
  if (persistent.phase !== 'birth-selection' || !persistent.pendingBirthSelection || persistent.currentSession) {
    throw new Error('No pending birth selection is available')
  }
  const candidate = persistent.pendingBirthSelection.candidates.find((item) => item.id === candidateId)
  if (!candidate) throw new Error('Birth candidate is not part of the current life')

  const currentSession = createGameSession({
    runSeed: encodeSelectedBirthRunSeed(persistent.pendingBirthSelection.runSeed, candidate.index),
    runId: persistent.pendingBirthSelection.runId,
  })
  if (
    currentSession.state.identity.backgroundId !== candidate.backgroundId ||
    currentSession.state.identity.spiritRootId !== candidate.spiritRootId ||
    currentSession.state.identity.name !== candidate.name
  ) {
    throw new Error('Birth candidate replay mismatch')
  }

  return { ...persistent, phase: 'life', currentSession, pendingBirthSelection: null }
}

export function applyPersistentCommand(
  persistent: PersistentGame,
  command: SessionCommand,
): { persistent: PersistentGame; applied: boolean; reason?: string } {
  const currentSession = persistent.currentSession
  if (!currentSession) return { persistent, applied: false, reason: 'NO_CURRENT_RUN' }

  const result = executeSessionCommand(currentSession, command)
  if (!result.applied) return { persistent, applied: false, reason: result.reason }

  let archives = persistent.archives
  if (result.session.state.status !== 'playing' && !archives.some((record) => record.runId === result.session.state.runId)) {
    archives = [...archives, createLifeRecord(result.session.state, result.session.debugLog, archives.length + 1)]
  }

  return {
    persistent: {
      ...persistent,
      phase: result.session.state.status === 'playing' ? 'life' : 'ended',
      currentSession: result.session,
      pendingBirthSelection: null,
      archives,
    },
    applied: true,
  }
}
