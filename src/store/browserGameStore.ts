import type { SessionCommand } from '../types/command'
import type { PersistentGame } from '../types/persistence'
import { applyPersistentCommand, createEmptyPersistentGame, startNewRun } from '../core/persistentGameEngine'
import { deletePersistentGame, loadPersistentGame, savePersistentGame, type StorageLike } from './saveRepository'

export function loadGame(storage: StorageLike): PersistentGame {
  return loadPersistentGame(storage) ?? createEmptyPersistentGame()
}

export function startAndSaveRun(storage: StorageLike, persistent: PersistentGame, now: number): PersistentGame {
  const next = startNewRun(persistent, {
    runSeed: `life-${persistent.meta.totalRuns + 1}-${now.toString(36)}`,
  })
  savePersistentGame(storage, next)
  return next
}

export function commandAndSave(storage: StorageLike, persistent: PersistentGame, command: SessionCommand) {
  const result = applyPersistentCommand(persistent, command)
  if (result.applied) savePersistentGame(storage, result.persistent)
  return result
}

export function clearGame(storage: StorageLike): PersistentGame {
  deletePersistentGame(storage)
  return createEmptyPersistentGame()
}
