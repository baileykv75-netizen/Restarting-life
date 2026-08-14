import { describe, expect, it } from 'vitest'
import { createLifeRecord } from '../core/lifeSummary'
import { createEmptyPersistentGame, startNewRun } from '../core/persistentGameEngine'
import { digestText, stableStringify } from '../core/stateDigest'
import type { LegacyPersistentGameV1 } from '../types/persistence'
import {
  deletePersistentGame,
  LEGACY_SAVE_KEY,
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

function writeLegacySave(storage: StorageLike, payload: LegacyPersistentGameV1): void {
  storage.setItem(LEGACY_SAVE_KEY, JSON.stringify({
    schemaVersion: 1,
    checksum: digestText(stableStringify(payload)),
    payload,
  }))
}

describe('save repository', () => {
  it('round-trips one complete V2 game snapshot', () => {
    const storage = new MemoryStorage()
    const persistent = startNewRun(createEmptyPersistentGame(), { runSeed: 'save-roundtrip' })
    expect(persistent.schemaVersion).toBe(2)

    savePersistentGame(storage, persistent)
    expect(loadPersistentGame(storage)).toEqual(persistent)
  })

  it('detects a modified V2 saved payload', () => {
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

  it('migrates an active V1 life into a legacy archive instead of reinterpreting it', () => {
    const storage = new MemoryStorage()
    const started = startNewRun(createEmptyPersistentGame(), { runSeed: 'legacy-active' })
    const legacy: LegacyPersistentGameV1 = {
      schemaVersion: 1,
      currentSession: started.currentSession,
      archives: [],
      meta: { totalRuns: 1 },
    }
    writeLegacySave(storage, legacy)

    const migrated = loadPersistentGame(storage)
    expect(migrated?.schemaVersion).toBe(2)
    expect(migrated?.currentSession).toBeNull()
    expect(migrated?.archives).toHaveLength(1)
    expect(migrated?.archives[0].runSeed).toBe('legacy-active')
    expect(migrated?.archives[0].summary.outcome).toBe('migrated')
    expect(migrated?.archives[0].legacy).toEqual({
      sourceSchemaVersion: 1,
      migrationReason: 'v2_schema_upgrade',
      activeAtMigration: true,
    })

    expect(storage.getItem(SAVE_KEY)).not.toBeNull()
    expect(storage.getItem(LEGACY_SAVE_KEY)).not.toBeNull()
    expect(loadPersistentGame(storage)).toEqual(migrated)
  })

  it('preserves completed V1 archives and marks them as legacy records', () => {
    const storage = new MemoryStorage()
    const started = startNewRun(createEmptyPersistentGame(), { runSeed: 'legacy-archive' })
    const session = started.currentSession!
    const deadState = { ...session.state, status: 'dead' as const, endReason: '测试结局' }
    const record = createLifeRecord(deadState, session.debugLog, 1)
    const legacy: LegacyPersistentGameV1 = {
      schemaVersion: 1,
      currentSession: null,
      archives: [record],
      meta: { totalRuns: 1 },
    }
    writeLegacySave(storage, legacy)

    const migrated = loadPersistentGame(storage)
    expect(migrated?.archives).toHaveLength(1)
    expect(migrated?.archives[0].summary.endReason).toBe('测试结局')
    expect(migrated?.archives[0].legacy?.activeAtMigration).toBe(false)
  })

  it('returns null for no save and removes both V2 and legacy slots', () => {
    const storage = new MemoryStorage()
    expect(loadPersistentGame(storage)).toBeNull()

    savePersistentGame(storage, createEmptyPersistentGame())
    writeLegacySave(storage, {
      schemaVersion: 1,
      currentSession: null,
      archives: [],
      meta: { totalRuns: 0 },
    })

    deletePersistentGame(storage)
    expect(storage.getItem(SAVE_KEY)).toBeNull()
    expect(storage.getItem(LEGACY_SAVE_KEY)).toBeNull()
    expect(loadPersistentGame(storage)).toBeNull()
  })
})
