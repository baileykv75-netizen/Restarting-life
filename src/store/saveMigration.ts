import { digestText, stableStringify } from '../core/stateDigest'
import { DAYS_PER_MONTH, DAYS_PER_YEAR, MONTHS_PER_YEAR } from '../core/timeEngine'
import type { GameState } from '../types/game'
import type {
  DebugLogEntry,
  GameSession,
  LegacyDebugLogEntryV1,
  LegacyGameSessionV1,
  LegacyGameSessionV2,
  LegacyLifeRecordV1,
  LegacyLifeRecordV2,
  LegacyPersistentGameV1,
  LifeRecord,
  NormalizedPersistentGameV2,
  PersistentGame,
  TransitionalPersistentGameV2,
  TransitionalPersistentGameV3,
} from '../types/persistence'

function cloneCurrentDebugLog(entries: readonly DebugLogEntry[]): DebugLogEntry[] {
  return entries.map((entry) => ({
    ...entry,
    command: { ...entry.command },
    effectTypes: [...entry.effectTypes],
  }))
}

function convertLegacyDebugLog(entries: readonly LegacyDebugLogEntryV1[]): DebugLogEntry[] {
  return entries.map((entry) => ({
    seq: entry.seq,
    command: { ...entry.command },
    worldDayBefore: entry.timeMonthsBefore * DAYS_PER_MONTH,
    worldDayAfter: entry.timeMonthsAfter * DAYS_PER_MONTH,
    eventIdBefore: entry.eventIdBefore,
    eventIdAfter: entry.eventIdAfter,
    rngBefore: entry.rngBefore,
    rngAfter: entry.rngAfter,
    effectTypes: [...entry.effectTypes],
    stateDigestBefore: entry.stateDigestBefore,
    stateDigestAfter: entry.stateDigestAfter,
  }))
}

function cloneChronicle(entries: GameState['chronicle'] | undefined): GameState['chronicle'] {
  if (!Array.isArray(entries)) return []
  return entries.map((entry) => ({
    ...entry,
    changes: entry.changes.map((change) => ({ ...change })),
    check: entry.check ? { ...entry.check } : undefined,
  }))
}

function clonePendingResult(result: GameSession['pendingResult']): GameSession['pendingResult'] {
  return result
    ? { ...result, changes: result.changes.map((change) => ({ ...change })) }
    : null
}

function clonePendingAction(action: GameSession['pendingAction']): GameSession['pendingAction'] {
  return action
    ? {
        ...action,
        snapshot: {
          ...action.snapshot,
          stats: { ...action.snapshot.stats },
          relationships: { ...action.snapshot.relationships },
          tags: [...action.snapshot.tags],
          flags: { ...action.snapshot.flags },
        },
      }
    : null
}

function convertLegacyIdentity(
  identity: LegacyLifeRecordV1['identity'] | LegacyGameSessionV1['state']['identity'],
): LegacyLifeRecordV2['identity'] {
  return {
    ...identity,
    birthDay: 0,
    talentIds: [...identity.talentIds],
  }
}

function convertLegacyRecord(record: LegacyLifeRecordV1, activeAtMigration: boolean): LegacyLifeRecordV2 {
  return {
    sequence: record.sequence,
    runId: record.runId,
    runSeed: record.runSeed,
    stateDigest: record.stateDigest,
    identity: convertLegacyIdentity(record.identity),
    stats: { ...record.stats },
    resources: { ...record.resources },
    cultivation: { ...record.cultivation },
    eventHistory: [...record.eventHistory],
    chronicle: [],
    summary: { ...record.summary },
    debugLog: convertLegacyDebugLog(record.debugLog),
    legacy: {
      sourceSchemaVersion: 1,
      migrationReason: 'v2_schema_upgrade',
      activeAtMigration,
    },
  }
}

function cloneLegacyV2Record(record: LegacyLifeRecordV2): LegacyLifeRecordV2 {
  return {
    ...record,
    identity: { ...record.identity, talentIds: [...record.identity.talentIds] },
    stats: { ...record.stats },
    resources: { ...record.resources },
    cultivation: { ...record.cultivation },
    eventHistory: [...record.eventHistory],
    chronicle: cloneChronicle(record.chronicle),
    summary: { ...record.summary },
    debugLog: cloneCurrentDebugLog(record.debugLog),
    legacy: record.legacy ? { ...record.legacy } : undefined,
  }
}

function cloneCurrentRecord(record: LifeRecord): LifeRecord {
  return {
    ...record,
    identity: {
      ...record.identity,
      physiqueIds: [...record.identity.physiqueIds],
      talentIds: [...record.identity.talentIds],
    },
    stats: { ...record.stats },
    resources: { ...record.resources },
    cultivation: { ...record.cultivation },
    eventHistory: [...record.eventHistory],
    chronicle: cloneChronicle(record.chronicle),
    summary: { ...record.summary },
    debugLog: cloneCurrentDebugLog(record.debugLog),
    legacy: record.legacy ? { ...record.legacy } : undefined,
  }
}

export function upgradeGameStateV2ToV3(state: LegacyGameSessionV2['state']): GameState {
  return {
    ...state,
    schemaVersion: 3,
    lifeStage: 'legacy-adult',
    identity: {
      ...state.identity,
      physiqueIds: [],
      talentIds: [...state.identity.talentIds],
    },
    stats: { ...state.stats },
    resources: { ...state.resources },
    cultivation: { ...state.cultivation },
    world: { currentLocationId: null },
    knowledge: { locations: {} },
    tags: [...state.tags],
    flags: { ...state.flags },
    relationships: { ...state.relationships },
    events: {
      ...state.events,
      queue: [...state.events.queue],
      history: [...state.events.history],
    },
    chronicle: cloneChronicle(state.chronicle),
  }
}

function cloneCurrentSession(session: GameSession): GameSession {
  return {
    state: {
      ...session.state,
      identity: {
        ...session.state.identity,
        physiqueIds: [...session.state.identity.physiqueIds],
        talentIds: [...session.state.identity.talentIds],
      },
      stats: { ...session.state.stats },
      resources: { ...session.state.resources },
      cultivation: { ...session.state.cultivation },
      world: { ...session.state.world },
      knowledge: { locations: { ...session.state.knowledge.locations } },
      tags: [...session.state.tags],
      flags: { ...session.state.flags },
      relationships: { ...session.state.relationships },
      events: {
        ...session.state.events,
        queue: [...session.state.events.queue],
        history: [...session.state.events.history],
      },
      chronicle: cloneChronicle(session.state.chronicle),
    },
    debugLog: cloneCurrentDebugLog(session.debugLog),
    pendingResult: clonePendingResult(session.pendingResult),
    pendingAction: clonePendingAction(session.pendingAction),
  }
}

function upgradeV2SessionToV3(session: LegacyGameSessionV2): GameSession {
  return {
    state: upgradeGameStateV2ToV3(session.state),
    debugLog: cloneCurrentDebugLog(session.debugLog),
    pendingResult: clonePendingResult(session.pendingResult),
    pendingAction: clonePendingAction(session.pendingAction),
  }
}

function upgradeV2RecordToV3(record: LegacyLifeRecordV2): LifeRecord {
  return {
    ...record,
    identity: {
      ...record.identity,
      physiqueIds: [],
      talentIds: [...record.identity.talentIds],
    },
    stats: { ...record.stats },
    resources: { ...record.resources },
    cultivation: { ...record.cultivation },
    eventHistory: [...record.eventHistory],
    chronicle: cloneChronicle(record.chronicle),
    summary: { ...record.summary },
    debugLog: cloneCurrentDebugLog(record.debugLog),
    legacy: record.legacy ? { ...record.legacy } : undefined,
  }
}

function convertLegacySessionV1ToV2(session: LegacyGameSessionV1): LegacyGameSessionV2 {
  return {
    state: {
      schemaVersion: 2,
      runId: session.state.runId,
      runSeed: session.state.runSeed,
      rngState: session.state.rngState,
      status: session.state.status,
      worldDay: session.state.timeMonths * DAYS_PER_MONTH,
      identity: convertLegacyIdentity(session.state.identity),
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
      chronicle: [],
      endReason: session.state.endReason,
    },
    debugLog: convertLegacyDebugLog(session.debugLog),
    pendingResult: clonePendingResult(session.pendingResult),
    pendingAction: null,
  }
}

function getLegacyLifeTitle(session: LegacyGameSessionV1): string {
  const { state } = session
  if (state.cultivation.realm === 'golden_core') return '金丹真人（旧版存档）'
  if (state.cultivation.realm === 'foundation') return '筑基修士（旧版存档）'
  if (state.cultivation.realm === 'qi') return '炼气行者（旧版存档）'
  return '凡尘一世（旧版存档）'
}

function createLegacySessionRecord(session: LegacyGameSessionV1, sequence: number): LegacyLifeRecordV2 {
  const { state } = session
  const wasActive = state.status === 'playing'
  const outcome: LifeRecord['summary']['outcome'] = state.status === 'playing' ? 'migrated' : state.status

  return {
    sequence,
    runId: state.runId,
    runSeed: state.runSeed,
    stateDigest: digestText(stableStringify(state)),
    identity: convertLegacyIdentity(state.identity),
    stats: { ...state.stats },
    resources: { ...state.resources },
    cultivation: { ...state.cultivation },
    eventHistory: [...state.events.history],
    chronicle: [],
    summary: {
      title: getLegacyLifeTitle(session),
      finalRealm: state.cultivation.realm,
      ageYears: Math.floor(state.timeMonths / MONTHS_PER_YEAR),
      ageMonths: state.timeMonths % MONTHS_PER_YEAR,
      outcome,
      endReason: wasActive
        ? 'V1.2 升级时，此世尚未结束，已封存为旧版人生快照。'
        : (state.endReason ?? '旧版人生已经结束。'),
      largestOpportunity: '旧版人生记录已完整保留',
      regret: wasActive
        ? '此世未继续套用 V1.2 的新命运规则，以避免静默改变既有经历。'
        : '此记录来自旧版规则，保留用于回看。',
    },
    debugLog: convertLegacyDebugLog(session.debugLog),
    legacy: {
      sourceSchemaVersion: 1,
      migrationReason: 'v2_schema_upgrade',
      activeAtMigration: wasActive,
    },
  }
}

function getV2LifeTitle(session: LegacyGameSessionV2): string {
  const { realm } = session.state.cultivation
  if (realm === 'golden_core') return '金丹真人（V2 旧版存档）'
  if (realm === 'foundation') return '筑基修士（V2 旧版存档）'
  if (realm === 'qi') return '炼气行者（V2 旧版存档）'
  return '凡尘一世（V2 旧版存档）'
}

function createV2SessionRecord(session: LegacyGameSessionV2, sequence: number): LegacyLifeRecordV2 {
  const { state } = session
  const wasActive = state.status === 'playing'
  const outcome: LifeRecord['summary']['outcome'] =
    state.status === 'playing' ? 'migrated' : state.status === 'dead' ? 'dead' : 'won'
  const ageDays = Math.max(0, state.worldDay - state.identity.birthDay)

  return {
    sequence,
    runId: state.runId,
    runSeed: state.runSeed,
    stateDigest: digestText(stableStringify(state)),
    identity: { ...state.identity, talentIds: [...state.identity.talentIds] },
    stats: { ...state.stats },
    resources: { ...state.resources },
    cultivation: { ...state.cultivation },
    eventHistory: [...state.events.history],
    chronicle: cloneChronicle(state.chronicle),
    summary: {
      title: getV2LifeTitle(session),
      finalRealm: state.cultivation.realm,
      ageYears: Math.floor(ageDays / DAYS_PER_YEAR),
      ageMonths: Math.floor((ageDays % DAYS_PER_YEAR) / DAYS_PER_MONTH),
      outcome,
      endReason: wasActive
        ? 'V3 存档升级时，此世尚未结束，已封存为 V2 人生快照。'
        : (state.endReason ?? 'V2 人生已经结束。'),
      largestOpportunity: 'V2 人生记录已完整保留',
      regret: wasActive
        ? '此世没有被静默续接到 V3，以避免把旧规则运行态解释成新世界状态。'
        : '此记录来自 V2 规则，保留用于回看。',
    },
    debugLog: cloneCurrentDebugLog(session.debugLog),
    legacy: {
      sourceSchemaVersion: 2,
      migrationReason: 'v3_schema_upgrade',
      activeAtMigration: wasActive,
    },
  }
}

function isLegacyV2Session(session: LegacyGameSessionV1 | LegacyGameSessionV2): session is LegacyGameSessionV2 {
  return session.state.schemaVersion === 2
}

function isLegacyV2Record(record: LegacyLifeRecordV1 | LegacyLifeRecordV2): record is LegacyLifeRecordV2 {
  return 'birthDay' in record.identity
}

function isCurrentSession(session: LegacyGameSessionV2 | GameSession): session is GameSession {
  return session.state.schemaVersion === 3
}

function isCurrentLifeRecord(record: LegacyLifeRecordV2 | LifeRecord): record is LifeRecord {
  return 'physiqueIds' in record.identity
}

export function migratePersistentGameV1ToV2(legacy: LegacyPersistentGameV1): NormalizedPersistentGameV2 {
  const archives = legacy.archives.map((record) => convertLegacyRecord(record, false))
  const currentSession = legacy.currentSession

  if (currentSession && !archives.some((record) => record.runId === currentSession.state.runId)) {
    const sequence = Math.max(archives.length + 1, legacy.meta.totalRuns || 1)
    archives.push(createLegacySessionRecord(currentSession, sequence))
  }

  return {
    schemaVersion: 2,
    currentSession: null,
    archives,
    meta: { totalRuns: legacy.meta.totalRuns },
  }
}

export function normalizePersistentGameV2(transitional: TransitionalPersistentGameV2): NormalizedPersistentGameV2 {
  const archives = transitional.archives.map((record) =>
    isLegacyV2Record(record) ? cloneLegacyV2Record(record) : convertLegacyRecord(record, false),
  )

  const session = transitional.currentSession
  if (!session) {
    return { schemaVersion: 2, currentSession: null, archives, meta: { totalRuns: transitional.meta.totalRuns } }
  }

  if (isLegacyV2Session(session)) {
    return {
      schemaVersion: 2,
      currentSession: {
        state: { ...session.state, identity: { ...session.state.identity, talentIds: [...session.state.identity.talentIds] }, tags: [...session.state.tags], flags: { ...session.state.flags }, relationships: { ...session.state.relationships }, events: { ...session.state.events, queue: [...session.state.events.queue], history: [...session.state.events.history] }, chronicle: cloneChronicle(session.state.chronicle) },
        debugLog: cloneCurrentDebugLog(session.debugLog),
        pendingResult: clonePendingResult(session.pendingResult),
        pendingAction: clonePendingAction(session.pendingAction),
      },
      archives,
      meta: { totalRuns: transitional.meta.totalRuns },
    }
  }

  const converted = convertLegacySessionV1ToV2(session)
  if (!archives.some((record) => record.runId === converted.state.runId)) {
    const sequence = Math.max(archives.length + 1, transitional.meta.totalRuns || 1)
    archives.push(createLegacySessionRecord(session, sequence))
  }

  return { schemaVersion: 2, currentSession: null, archives, meta: { totalRuns: transitional.meta.totalRuns } }
}

export function migratePersistentGameV2ToV3(normalized: NormalizedPersistentGameV2): PersistentGame {
  const archives = normalized.archives.map((record) => {
    const upgraded = upgradeV2RecordToV3(record)
    if (upgraded.legacy) return upgraded
    return {
      ...upgraded,
      legacy: {
        sourceSchemaVersion: 2 as const,
        migrationReason: 'v3_schema_upgrade' as const,
        activeAtMigration: false,
      },
    }
  })

  const session = normalized.currentSession
  if (session && !archives.some((record) => record.runId === session.state.runId)) {
    const sequence = Math.max(archives.length + 1, normalized.meta.totalRuns || 1)
    archives.push(upgradeV2RecordToV3(createV2SessionRecord(session, sequence)))
  }

  return {
    schemaVersion: 3,
    phase: 'birth-selection',
    currentSession: null,
    archives,
    meta: { totalRuns: normalized.meta.totalRuns },
  }
}

export function normalizePersistentGameV3(transitional: TransitionalPersistentGameV3): PersistentGame {
  const archives = transitional.archives.map((record) =>
    isCurrentLifeRecord(record) ? cloneCurrentRecord(record) : upgradeV2RecordToV3(record),
  )
  const session = transitional.currentSession

  return {
    schemaVersion: 3,
    phase: transitional.phase,
    currentSession: session
      ? isCurrentSession(session)
        ? cloneCurrentSession(session)
        : upgradeV2SessionToV3(session)
      : null,
    archives,
    meta: { totalRuns: transitional.meta.totalRuns },
  }
}
