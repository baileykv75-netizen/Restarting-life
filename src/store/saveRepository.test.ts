import { describe, expect, it } from 'vitest'
import { createEmptyPersistentGame, startNewRun } from '../core/persistentGameEngine'
import { digestText, stableStringify } from '../core/stateDigest'
import { DAYS_PER_MONTH } from '../core/timeEngine'
import type {
  GameSession,
  LegacyGameSessionV1,
  LegacyGameSessionV2,
  LegacyLifeRecordV1,
  LegacyPersistentGameV1,
  TransitionalPersistentGameV2,
  TransitionalPersistentGameV3,
} from '../types/persistence'
import {
  deletePersistentGame,
  LEGACY_SAVE_KEY,
  loadPersistentGame,
  SAVE_KEY,
  savePersistentGame,
  V2_SAVE_KEY,
  type StorageLike,
} from './saveRepository'

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

function toLegacyV2Session(session: GameSession): LegacyGameSessionV2 {
  const { lifeStage: _lifeStage, world: _world, knowledge: _knowledge, identity, ...restState } = session.state
  const { physiqueIds: _physiqueIds, ...legacyIdentity } = identity
  return {
    state: {
      ...restState,
      schemaVersion: 2,
      identity: { ...legacyIdentity, talentIds: [...legacyIdentity.talentIds] },
      stats: { ...session.state.stats },
      resources: { ...session.state.resources },
      cultivation: { ...session.state.cultivation },
      tags: [...session.state.tags],
      flags: { ...session.state.flags },
      relationships: { ...session.state.relationships },
      events: {
        ...session.state.events,
        queue: [...session.state.events.queue],
        history: [...session.state.events.history],
      },
      chronicle: session.state.chronicle.map((entry) => ({
        ...entry,
        changes: entry.changes.map((change) => ({ ...change })),
      })),
    },
    debugLog: session.debugLog.map((entry) => ({
      ...entry,
      command: { ...entry.command },
      effectTypes: [...entry.effectTypes],
    })),
    pendingResult: session.pendingResult,
    pendingAction: session.pendingAction,
  }
}

function toLegacySession(session: GameSession): LegacyGameSessionV1 {
  const v2 = toLegacyV2Session(session)
  const { worldDay, identity, ...restState } = v2.state
  const { birthDay: _birthDay, ...legacyIdentity } = identity
  return {
    state: {
      ...restState,
      schemaVersion: 1,
      timeMonths: Math.floor(worldDay / DAYS_PER_MONTH),
      identity: legacyIdentity,
    },
    debugLog: v2.debugLog.map((entry) => ({
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

function writeV2Save(storage: StorageLike, payload: TransitionalPersistentGameV2): void {
  storage.setItem(V2_SAVE_KEY, JSON.stringify({
    schemaVersion: 2,
    checksum: digestText(stableStringify(payload)),
    payload,
  }))
}

function writeTransitionalV3Save(storage: StorageLike, payload: TransitionalPersistentGameV3): void {
  storage.setItem(SAVE_KEY, JSON.stringify({
    schemaVersion: 3,
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
  it('round-trips one complete V3 persistence snapshot without losing R01 fields', () => {
    const storage = new MemoryStorage()
    const persistent = startNewRun(createEmptyPersistentGame(), { runSeed: 'save-roundtrip' })
    expect(persistent.schemaVersion).toBe(3)
    expect(persistent.phase).toBe('life')
    expect(persistent.currentSession?.state.schemaVersion).toBe(3)

    const state = persistent.currentSession!.state
    persistent.currentSession!.state = {
      ...state,
      identity: { ...state.identity, physiqueIds: ['test_physique'] },
      world: { currentLocationId: 'test_location' },
      knowledge: { locations: { rumor_place: 'rumored', known_place: 'discovered' } },
    }

    savePersistentGame(storage, persistent)
    const loaded = loadPersistentGame(storage)
    expect(loaded).toEqual(persistent)
    expect(loaded?.currentSession?.state.identity.physiqueIds).toEqual(['test_physique'])
    expect(loaded?.currentSession?.state.world.currentLocationId).toBe('test_location')
    expect(loaded?.currentSession?.state.knowledge.locations.known_place).toBe('discovered')
  })

  it('normalizes an R00.3 V3 envelope with an inner schema-2 active life in place', () => {
    const storage = new MemoryStorage()
    const current = startNewRun(createEmptyPersistentGame(), { runSeed: 'r003-active' })
    const legacySession = toLegacyV2Session(current.currentSession!)
    const payload: TransitionalPersistentGameV3 = {
      schemaVersion: 3,
      phase: 'life',
      currentSession: legacySession,
      archives: [],
      meta: { totalRuns: 1 },
    }
    writeTransitionalV3Save(storage, payload)

    const normalized = loadPersistentGame(storage)
    expect(normalized?.phase).toBe('life')
    expect(normalized?.currentSession?.state.schemaVersion).toBe(3)
    expect(normalized?.currentSession?.state.runSeed).toBe('r003-active')
    expect(normalized?.currentSession?.state.worldDay).toBe(legacySession.state.worldDay)
    expect(normalized?.currentSession?.state.lifeStage).toBe('legacy-adult')
    expect(normalized?.currentSession?.state.identity.physiqueIds).toEqual([])
    expect(normalized?.currentSession?.state.world.currentLocationId).toBeNull()
    expect(normalized?.currentSession?.state.knowledge.locations).toEqual({})
    expect(loadPersistentGame(storage)).toEqual(normalized)
  })

  it('detects a modified V3 saved payload', () => {
    const storage = new MemoryStorage()
    const persistent = startNewRun(createEmptyPersistentGame(), { runSeed: 'save-checksum' })
    savePersistentGame(storage, persistent)
    const raw = storage.getItem(SAVE_KEY)!
    const envelope = JSON.parse(raw) as { checksum: string; payload: { meta: { totalRuns: number } } }
    envelope.payload.meta.totalRuns += 1
    storage.setItem(SAVE_KEY, JSON.stringify(envelope))
    expect(() => loadPersistentGame(storage)).toThrow('Save checksum mismatch')
  })

  it('migrates an active V2 life into a legacy archive instead of continuing it in V3', () => {
    const storage = new MemoryStorage()
    const started = startNewRun(createEmptyPersistentGame(), { runSeed: 'v2-active' })
    const v2: TransitionalPersistentGameV2 = {
      schemaVersion: 2,
      currentSession: toLegacyV2Session(started.currentSession!),
      archives: [],
      meta: { totalRuns: 1 },
    }
    writeV2Save(storage, v2)

    const migrated = loadPersistentGame(storage)
    expect(migrated?.schemaVersion).toBe(3)
    expect(migrated?.phase).toBe('birth-selection')
    expect(migrated?.currentSession).toBeNull()
    expect(migrated?.archives).toHaveLength(1)
    expect(migrated?.archives[0].runSeed).toBe('v2-active')
    expect(migrated?.archives[0].summary.outcome).toBe('migrated')
    expect(migrated?.archives[0].identity.physiqueIds).toEqual([])
    expect(migrated?.archives[0].legacy).toEqual({
      sourceSchemaVersion: 2,
      migrationReason: 'v3_schema_upgrade',
      activeAtMigration: true,
    })
  })

  it('migrates an active V1 life through V2 and preserves its original legacy source', () => {
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
    expect(migrated?.schemaVersion).toBe(3)
    expect(migrated?.phase).toBe('birth-selection')
    expect(migrated?.archives).toHaveLength(1)
    expect(migrated?.archives[0].identity.birthDay).toBe(0)
    expect(migrated?.archives[0].identity.physiqueIds).toEqual([])
    expect(migrated?.archives[0].legacy).toEqual({
      sourceSchemaVersion: 1,
      migrationReason: 'v2_schema_upgrade',
      activeAtMigration: true,
    })
  })

  it('preserves completed V1 archives across the full migration chain', () => {
    const storage = new MemoryStorage()
    const started = startNewRun(createEmptyPersistentGame(), { runSeed: 'legacy-archive' })
    const legacySession = toLegacySession(started.currentSession!)
    writeLegacySave(storage, {
      schemaVersion: 1,
      currentSession: null,
      archives: [makeLegacyRecord(legacySession)],
      meta: { totalRuns: 1 },
    })

    const migrated = loadPersistentGame(storage)
    expect(migrated?.archives).toHaveLength(1)
    expect(migrated?.archives[0].summary.endReason).toBe('测试结局')
    expect(migrated?.archives[0].identity.physiqueIds).toEqual([])
    expect(migrated?.archives[0].legacy?.sourceSchemaVersion).toBe(1)
  })

  it('does not fall back to V2 when an existing V3 save fails checksum validation', () => {
    const storage = new MemoryStorage()
    const persistent = startNewRun(createEmptyPersistentGame(), { runSeed: 'corrupt-v3' })
    savePersistentGame(storage, persistent)
    writeV2Save(storage, {
      schemaVersion: 2,
      currentSession: toLegacyV2Session(persistent.currentSession!),
      archives: [],
      meta: { totalRuns: 1 },
    })

    const raw = storage.getItem(SAVE_KEY)!
    const envelope = JSON.parse(raw) as { checksum: string; payload: { phase: string } }
    envelope.payload.phase = 'ended'
    storage.setItem(SAVE_KEY, JSON.stringify(envelope))

    expect(() => loadPersistentGame(storage)).toThrow('Save checksum mismatch')
  })

  it('returns null for no save and explicit deletion removes V3, V2, and V1 slots', () => {
    const storage = new MemoryStorage()
    expect(loadPersistentGame(storage)).toBeNull()

    savePersistentGame(storage, createEmptyPersistentGame())
    writeV2Save(storage, { schemaVersion: 2, currentSession: null, archives: [], meta: { totalRuns: 0 } })
    writeLegacySave(storage, { schemaVersion: 1, currentSession: null, archives: [], meta: { totalRuns: 0 } })

    deletePersistentGame(storage)
    expect(storage.getItem(SAVE_KEY)).toBeNull()
    expect(storage.getItem(V2_SAVE_KEY)).toBeNull()
    expect(storage.getItem(LEGACY_SAVE_KEY)).toBeNull()
  })
})
