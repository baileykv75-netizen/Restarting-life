import { digestText, stableStringify } from '../core/stateDigest'
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../core/timeEngine'
import type { GameState } from '../types/game'
import type {
  DebugLogEntry,
  GameSession,
  LegacyDebugLogEntryV1,
  LegacyGameSessionV1,
  LegacyLifeRecordV1,
  LegacyPersistentGameV1,
  LifeRecord,
  PersistentGame,
  TransitionalPersistentGameV2,
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

function convertLegacyIdentity(
  identity: LegacyLifeRecordV1['identity'] | LegacyGameSessionV1['state']['identity'],
): GameState['identity'] {
  return {
    ...identity,
    birthDay: 0,
    talentIds: [...identity.talentIds],
  }
}

function convertLegacyRecord(record: LegacyLifeRecordV1, activeAtMigration: boolean): LifeRecord {
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

function cloneCurrentRecord(record: LifeRecord): LifeRecord {
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

function getLegacyLifeTitle(session: LegacyGameSessionV1): string {
  const { state } = session
  if (state.cultivation.realm === 'golden_core') return '金丹真人（旧版存档）'
  if (state.cultivation.realm === 'foundation') return '筑基修士（旧版存档）'
  if (state.cultivation.realm === 'qi') return '炼气行者（旧版存档）'
  return '凡尘一世（旧版存档）'
}

function createLegacySessionRecord(
  session: LegacyGameSessionV1,
  sequence: number,
): LifeRecord {
  const { state } = session
  const wasActive = state.status === 'playing'
  const outcome: LifeRecord['summary']['outcome'] =
    state.status === 'playing' ? 'migrated' : state.status

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

function isCurrentSession(session: LegacyGameSessionV1 | GameSession): session is GameSession {
  return session.state.schemaVersion === 2
}

function isCurrentLifeRecord(record: LegacyLifeRecordV1 | LifeRecord): record is LifeRecord {
  return 'birthDay' in record.identity
}

export function migratePersistentGameV1ToV2(
  legacy: LegacyPersistentGameV1,
): PersistentGame {
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

export function normalizePersistentGameV2(
  transitional: TransitionalPersistentGameV2,
): PersistentGame {
  const archives = transitional.archives.map((record) =>
    isCurrentLifeRecord(record) ? cloneCurrentRecord(record) : convertLegacyRecord(record, false),
  )

  const session = transitional.currentSession
  if (!session) {
    return {
      schemaVersion: 2,
      currentSession: null,
      archives,
      meta: { totalRuns: transitional.meta.totalRuns },
    }
  }

  if (isCurrentSession(session)) {
    return {
      schemaVersion: 2,
      currentSession: {
        state: {
          ...session.state,
          identity: { ...session.state.identity, talentIds: [...session.state.identity.talentIds] },
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
          chronicle: cloneChronicle(session.state.chronicle),
        },
        debugLog: cloneCurrentDebugLog(session.debugLog),
        pendingResult: session.pendingResult
          ? { ...session.pendingResult, changes: session.pendingResult.changes.map((change) => ({ ...change })) }
          : null,
        pendingAction: session.pendingAction
          ? {
              ...session.pendingAction,
              snapshot: {
                ...session.pendingAction.snapshot,
                stats: { ...session.pendingAction.snapshot.stats },
                relationships: { ...session.pendingAction.snapshot.relationships },
                tags: [...session.pendingAction.snapshot.tags],
                flags: { ...session.pendingAction.snapshot.flags },
              },
            }
          : null,
      },
      archives,
      meta: { totalRuns: transitional.meta.totalRuns },
    }
  }

  if (!archives.some((record) => record.runId === session.state.runId)) {
    const sequence = Math.max(archives.length + 1, transitional.meta.totalRuns || 1)
    archives.push(createLegacySessionRecord(session, sequence))
  }

  return {
    schemaVersion: 2,
    currentSession: null,
    archives,
    meta: { totalRuns: transitional.meta.totalRuns },
  }
}
