import { describe, expect, it } from 'vitest'
import { createEmptyPersistentGame, startNewRun } from '../core/persistentGameEngine'
import { digestText, stableStringify } from '../core/stateDigest'
import { DAYS_PER_MONTH } from '../core/timeEngine'
import type {
  GameSession,
  LegacyGameSessionV1,
  LegacyLifeRecordV1,
  LegacyPersistentGameV1,
} from '../types/persistence'
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

function toLegacySession(session: GameSession): LegacyGameSessionV1 {
  const { worldDay, identity, ...restState } = session.state
  const { birthDay: _birthDay, ...legacyIdentity } = identity
  return {
    state: {
      ...restState,
      schemaVersion: 1,
      timeMonths: Math.floor(worldDay / DAYS_PER_MONTH),
      identity: legacyIdentity,
    },
    debugLog: session.debugLog.map((entry) => ({
      seq: entry.seq,
      command: { ...entry.command },
      timeMonthsBefore: Math.floor(entry.worldDayBefore / DAYS_PER_MONTH),
      timeMonthsAfter: Math.floor(entry.worldDayAfter / DAYS_PER_MONTH),
      eventIdBefore: entry.eventIdBefore,
      eventIdAfter: entry.eventIdAfter,
      rngBefore: entry.rngBefore,
      rngAfter: entry.rngAfter,
      effectTypes: [...entry.effectTypes],
      stateDigestBefore: entry.stateDigestBefore,
      stateDigestAfter: entry.stateDigestAfter,
    })),
    pendingResult: null,
    pendingAction: null,
  }
}

function writeLegacySave(storage: StorageLike, payload: LegacyPersistentGameV1): void {
  storage.setItem(LEGACY_SAVE_KEY, JSON.stringify({
    schemaVersion: 1,
    checksum: digestText(stableStringify(payload)),
    payload,
  }))
}

function makeLegacyRecord(session: LegacyGameSessionV1): LegacyLifeRecordV1 {
  const state = { ...session.state, status: 'dead' as const, endReason: '测试结局' }
  return {
    sequence: 1,
    runId: state.runId,
    runSeed: state.runSeed,
    stateDigest: digestText(stableStringify(state)),
    identity: { ...state.identity, talentIds: [...state.identity.talentIds] },
    stats: { ...state.stats },
    resources: { ...state.resources },
    cultivation: { ...state.cultivation },
    eventHistory: [...state.events.history],
    summary: {
      title: '凡尘一世',
      finalRealm: state.cultivation.realm,
      ageYears: Math.floor(state.timeMonths / 12),
      ageMonths: state.timeMonths % 12,
      outcome: 'dead',
      endReason: '测试结局',
      largestOpportunity: '测试',
      regret: '测试',
    },
    debugLog: session.debugLog,
  }
}

describe('save repository', () => {
  it('round-trips one complete V2 day-clock game snapshot', () => {
    const storage = new MemoryStorage()
    const persistent = startNewRun(createEmptyPersistentGame(), { runSeed: 'save-roundtrip' })
    expect(persistent.schemaVersion).toBe(2)
    expect(persistent.currentSession?.state.schemaVersion).toBe(2)

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
    const legacySession = toLegacySession(started.currentSession!)
    const legacy: LegacyPersistentGameV1 = {
      schemaVersion: 1,
      currentSession: legacySession,
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
    expect(migrated?.archives[0].identity.birthDay).toBe(0)
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
    const legacySession = toLegacySession(started.currentSession!)
    const legacy: LegacyPersistentGameV1 = {
      schemaVersion: 1,
      currentSession: null,
      archives: [makeLegacyRecord(legacySession)],
      meta: { totalRuns: 1 },
    }
    writeLegacySave(storage, legacy)

    const migrated = loadPersistentGame(storage)
    expect(migrated?.archives).toHaveLength(1)
    expect(migrated?.archives[0].summary.endReason).toBe('测试结局')
    expect(migrated?.archives[0].legacy?.activeAtMigration).toBe(false)
  })

  it('normalizes the transitional Stage 1 V2 envelope that still contains a month-clock session', () => {
    const storage = new MemoryStorage()
    const started = startNewRun(createEmptyPersistentGame(), { runSeed: 'transitional-v2' })
    const legacySession = toLegacySession(started.currentSession!)
    const payload = {
      schemaVersion: 2 as const,
      currentSession: legacySession,
      archives: [],
      meta: { totalRuns: 1 },
    }
    storage.setItem(SAVE_KEY, JSON.stringify({
      schemaVersion: 2,
      checksum: digestText(stableStringify(payload)),
      payload,
    }))

    const normalized = loadPersistentGame(storage)
    expect(normalized?.currentSession).toBeNull()
    expect(normalized?.archives[0].runSeed).toBe('transitional-v2')
    expect(normalized?.archives[0].summary.outcome).toBe('migrated')
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
