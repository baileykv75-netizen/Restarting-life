import type { PlayerAction, SessionCommand } from './command'
import type { StatKey } from './content'
import type { GameState } from './game'

export interface DebugLogEntry {
  seq: number
  command: SessionCommand
  timeMonthsBefore: number
  timeMonthsAfter: number
  eventIdBefore: string | null
  eventIdAfter: string | null
  rngBefore: number
  rngAfter: number
  effectTypes: string[]
  stateDigestBefore: string
  stateDigestAfter: string
}

export interface OutcomeSnapshot {
  timeMonths: number
  spiritStones: number
  cultivation: number
  realm: GameState['cultivation']['realm']
  stage: number
  stats: Record<StatKey, number>
  relationships: Record<string, number>
  tags: string[]
  flags: Record<string, boolean | number | string>
}

export interface StateChange {
  label: string
  value: string
  tone: 'positive' | 'negative' | 'neutral'
}

export interface ResolvedOutcome {
  title: string
  narrative: string
  changes: StateChange[]
  consequence: string | null
}

export interface PendingActionContext {
  action: PlayerAction
  snapshot: OutcomeSnapshot
}

export interface GameSession {
  state: GameState
  debugLog: DebugLogEntry[]
  pendingResult: ResolvedOutcome | null
  pendingAction: PendingActionContext | null
}

export interface LifeSummary {
  title: string
  finalRealm: GameState['cultivation']['realm']
  ageYears: number
  ageMonths: number
  outcome: 'dead' | 'won' | 'migrated'
  endReason: string
  largestOpportunity: string
  regret: string
}

export interface LegacyLifeMetadata {
  sourceSchemaVersion: 1
  migrationReason: 'v2_schema_upgrade'
  activeAtMigration: boolean
}

export interface LifeRecord {
  sequence: number
  runId: string
  runSeed: string
  stateDigest: string
  identity: GameState['identity']
  stats: GameState['stats']
  resources: GameState['resources']
  cultivation: GameState['cultivation']
  eventHistory: string[]
  summary: LifeSummary
  debugLog: DebugLogEntry[]
  legacy?: LegacyLifeMetadata
}

/**
 * Stage 1 deliberately upgrades only the persistent envelope. The live
 * GameSession still uses the V1/V1.1 GameState contract until Stage 2 moves
 * rule time from months to worldDay.
 */
export interface PersistentGame {
  schemaVersion: 2
  currentSession: GameSession | null
  archives: LifeRecord[]
  meta: {
    totalRuns: number
  }
}

/**
 * Exact top-level shape accepted from the existing localStorage save before
 * the V1.2 migration. It is read-only input to saveMigration.ts.
 */
export interface LegacyPersistentGameV1 {
  schemaVersion: 1
  currentSession: GameSession | null
  archives: LifeRecord[]
  meta: {
    totalRuns: number
  }
}
