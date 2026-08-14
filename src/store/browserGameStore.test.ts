import { describe, expect, it } from 'vitest'
import { DAYS_PER_YEAR } from '../core/timeEngine'
import type { StorageLike } from './saveRepository'
import { commandAndSave, loadGame, startAndSaveRun } from './browserGameStore'

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

describe('browser game store', () => {
  it('loads an empty V3 game at the birth-selection phase', () => {
    const storage = new MemoryStorage()
    const empty = loadGame(storage)

    expect(empty.schemaVersion).toBe(3)
    expect(empty.phase).toBe('birth-selection')
    expect(empty.currentSession).toBeNull()
  })

  it('starts the current legacy-compatible life flow and persists it as phase life', () => {
    const storage = new MemoryStorage()
    const empty = loadGame(storage)
    const next = startAndSaveRun(storage, empty, 123456)

    expect(next.meta.totalRuns).toBe(1)
    expect(next.phase).toBe('life')
    expect(next.currentSession?.state.worldDay).toBe(16 * DAYS_PER_YEAR)
    expect(loadGame(storage)).toEqual(next)
  })

  it('persists only a completed accepted operation', () => {
    const storage = new MemoryStorage()
    const started = startAndSaveRun(storage, loadGame(storage), 222222)
    const result = commandAndSave(storage, started, { type: 'action', action: 'explore' })

    expect(result.applied).toBe(true)
    expect(result.persistent.phase).toBe('life')
    expect(loadGame(storage)).toEqual(result.persistent)
  })

  it('switches the persistent phase to ended when an accepted action ends the life', () => {
    const storage = new MemoryStorage()
    const started = startAndSaveRun(storage, loadGame(storage), 333333)
    const session = started.currentSession!
    const nearNaturalDeath = {
      ...started,
      currentSession: {
        ...session,
        state: {
          ...session.state,
          worldDay: session.state.identity.birthDay + 80 * DAYS_PER_YEAR - 1,
          cultivation: { realm: 'mortal' as const, stage: 0 },
        },
      },
    }

    const result = commandAndSave(storage, nearNaturalDeath, { type: 'action', action: 'explore' })

    expect(result.applied).toBe(true)
    expect(result.persistent.phase).toBe('ended')
    expect(result.persistent.currentSession?.state.status).toBe('dead')
    expect(loadGame(storage)).toEqual(result.persistent)
  })
})
