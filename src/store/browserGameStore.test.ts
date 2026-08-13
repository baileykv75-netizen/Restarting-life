import { describe, expect, it } from 'vitest'
import type { StorageLike } from './saveRepository'
import { commandAndSave, loadGame, startAndSaveRun } from './browserGameStore'

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

describe('browser game store', () => {
  it('starts at age sixteen and persists the whole new run', () => {
    const storage = new MemoryStorage()
    const empty = loadGame(storage)
    const next = startAndSaveRun(storage, empty, 123456)

    expect(next.meta.totalRuns).toBe(1)
    expect(next.currentSession?.state.timeMonths).toBe(16 * 12)
    expect(loadGame(storage)).toEqual(next)
  })

  it('persists only a completed accepted operation', () => {
    const storage = new MemoryStorage()
    const started = startAndSaveRun(storage, loadGame(storage), 222222)
    const result = commandAndSave(storage, started, { type: 'action', action: 'explore' })

    expect(result.applied).toBe(true)
    expect(loadGame(storage)).toEqual(result.persistent)
  })
})
