import { describe, expect, it } from 'vitest'
import { createEmptyPersistentGame, startNewRun } from '../core/persistentGameEngine'
import {
  deletePersistentGame,
  loadPersistentGame,
  SAVE_KEY,
  savePersistentGame,
  type StorageLike,
} from './saveRepository'

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

describe('save repository', () => {
  it('round-trips one complete game snapshot', () => {
    const storage = new MemoryStorage()
    const persistent = startNewRun(createEmptyPersistentGame(), { runSeed: 'save-roundtrip' })
    savePersistentGame(storage, persistent)
    expect(loadPersistentGame(storage)).toEqual(persistent)
  })

  it('detects a modified saved payload', () => {
    const storage = new MemoryStorage()
    const persistent = startNewRun(createEmptyPersistentGame(), { runSeed: 'save-checksum' })
    savePersistentGame(storage, persistent)
    const raw = storage.getItem(SAVE_KEY)
    expect(raw).not.toBeNull()
    const envelope = JSON.parse(raw!) as { checksum: string; payload: { meta: { totalRuns: number } } }
    envelope.payload.meta.totalRuns += 1
    storage.setItem(SAVE_KEY, JSON.stringify(envelope))
    expect(() => loadPersistentGame(storage)).toThrow('Save checksum mismatch')
  })

  it('returns null for no save and removes an existing save', () => {
    const storage = new MemoryStorage()
    expect(loadPersistentGame(storage)).toBeNull()
    savePersistentGame(storage, createEmptyPersistentGame())
    deletePersistentGame(storage)
    expect(loadPersistentGame(storage)).toBeNull()
  })
})
