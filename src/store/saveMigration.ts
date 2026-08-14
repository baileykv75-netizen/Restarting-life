import { createLifeRecord } from '../core/lifeSummary'
import { getGameStateDigest } from '../core/stateDigest'
import { MONTHS_PER_YEAR } from '../core/timeEngine'
import type {
  DebugLogEntry,
  GameSession,
  LegacyPersistentGameV1,
  LifeRecord,
  PersistentGame,
} from '../types/persistence'

function cloneDebugLog(entries: readonly DebugLogEntry[]): DebugLogEntry[] {
  return entries.map((entry) => ({
    ...entry,
    command: { ...entry.command },
    effectTypes: [...entry.effectTypes],
  }))
}

function markLegacyRecord(record: LifeRecord, activeAtMigration: boolean): LifeRecord {
  return {
    ...record,
    identity: { ...record.identity, talentIds: [...record.identity.talentIds] },
    stats: { ...record.stats },
    resources: { ...record.resources },
    cultivation: { ...record.cultivation },
    eventHistory: [...record.eventHistory],
    summary: { ...record.summary },
    debugLog: cloneDebugLog(record.debugLog),
    legacy: {
      sourceSchemaVersion: 1,
      migrationReason: 'v2_schema_upgrade',
      activeAtMigration,
    },
  }
}

function getLegacyLifeTitle(session: GameSession): string {
  const { state } = session
  if (state.cultivation.realm === 'golden_core') return '金丹真人（旧版存档）'
  if (state.cultivation.realm === 'foundation') return '筑基修士（旧版存档）'
  if (state.cultivation.realm === 'qi') return '炼气行者（旧版存档）'
  return '凡尘一世（旧版存档）'
}

function createActiveLegacyRecord(
  session: GameSession,
  sequence: number,
): LifeRecord {
  const { state } = session

  return {
    sequence,
    runId: state.runId,
    runSeed: state.runSeed,
    stateDigest: getGameStateDigest(state),
    identity: { ...state.identity, talentIds: [...state.identity.talentIds] },
    stats: { ...state.stats },
    resources: { ...state.resources },
    cultivation: { ...state.cultivation },
    eventHistory: [...state.events.history],
    summary: {
      title: getLegacyLifeTitle(session),
      finalRealm: state.cultivation.realm,
      ageYears: Math.floor(state.timeMonths / MONTHS_PER_YEAR),
      ageMonths: state.timeMonths % MONTHS_PER_YEAR,
      outcome: 'migrated',
      endReason: 'V1.2 升级时，此世尚未结束，已封存为旧版人生快照。',
      largestOpportunity: '旧版人生记录已完整保留',
      regret: '此世未继续套用 V1.2 的新命运规则，以避免静默改变既有经历。',
    },
    debugLog: cloneDebugLog(session.debugLog),
    legacy: {
      sourceSchemaVersion: 1,
      migrationReason: 'v2_schema_upgrade',
      activeAtMigration: true,
    },
  }
}

function createMissingEndedRecord(
  session: GameSession,
  sequence: number,
): LifeRecord {
  return markLegacyRecord(createLifeRecord(session.state, session.debugLog, sequence), false)
}

/**
 * V1.2 deliberately does not reinterpret an in-progress V1/V1.1 life under
 * the new rules. Existing archives are retained, and an active life is
 * snapshotted into the archive before currentSession is cleared.
 */
export function migratePersistentGameV1ToV2(
  legacy: LegacyPersistentGameV1,
): PersistentGame {
  const archives = legacy.archives.map((record) => markLegacyRecord(record, false))
  const currentSession = legacy.currentSession

  if (currentSession && !archives.some((record) => record.runId === currentSession.state.runId)) {
    const sequence = Math.max(archives.length + 1, legacy.meta.totalRuns || 1)
    archives.push(
      currentSession.state.status === 'playing'
        ? createActiveLegacyRecord(currentSession, sequence)
        : createMissingEndedRecord(currentSession, sequence),
    )
  }

  return {
    schemaVersion: 2,
    currentSession: null,
    archives,
    meta: {
      totalRuns: legacy.meta.totalRuns,
    },
  }
}
