import type { PendingBirthSelection } from './birth'
import type { ChronicleEntry, StateChange } from './chronicle'
import type { PlayerAction, SessionCommand } from './command'
import type { StatKey } from './content'
import type { Faction, GameState, Realm } from './game'

export interface DebugLogEntry {
  seq: number
  command: SessionCommand
  worldDayBefore: number
  worldDayAfter: number
  eventIdBefore: string | null
  eventIdAfter: string | null
  rngBefore: number
  rngAfter: number
  effectTypes: string[]
  stateDigestBefore: string
  stateDigestAfter: string
}

export interface OutcomeSnapshot {
  worldDay: number
  spiritStones: number
  cultivation: number
  realm: GameState['cultivation']['realm']
  stage: number
  stats: Record<StatKey, number>
  relationships: Record<string, number>
  tags: string[]
  flags: Record<string, boolean | number | string>
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
  sourceSchemaVersion: 1 | 2
  migrationReason: 'v2_schema_upgrade' | 'v3_schema_upgrade'
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
  chronicle: ChronicleEntry[]
  summary: LifeSummary
  debugLog: DebugLogEntry[]
  legacy?: LegacyLifeMetadata
}

export type PersistentPhase = 'birth-selection' | 'life' | 'ended'

export interface PersistentGame {
  schemaVersion: 3
  phase: PersistentPhase
  currentSession: GameSession | null
  pendingBirthSelection?: PendingBirthSelection | null
  archives: LifeRecord[]
  meta: { totalRuns: number }
}

export interface LegacyGameStateV1 {
  schemaVersion: 1
  runId: string
  runSeed: string
  rngState: number
  status: 'playing' | 'dead' | 'won'
  timeMonths: number
  identity: { name: string; backgroundId: string; spiritRootId: string; talentIds: string[]; faction: Faction }
  stats: { constitution: number; comprehension: number; spiritSense: number; mentality: number; luck: number }
  resources: { spiritStones: number; cultivation: number }
  cultivation: { realm: Realm; stage: number }
  tags: string[]
  flags: Record<string, boolean | number | string>
  relationships: Record<string, number>
  events: { currentEventId: string | null; queue: string[]; history: string[] }
  endReason: string | null
}

export interface LegacyDebugLogEntryV1 {
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

export interface LegacyOutcomeSnapshotV1 {
  timeMonths: number
  spiritStones: number
  cultivation: number
  realm: Realm
  stage: number
  stats: Record<StatKey, number>
  relationships: Record<string, number>
  tags: string[]
  flags: Record<string, boolean | number | string>
}

export interface LegacyGameSessionV1 {
  state: LegacyGameStateV1
  debugLog: LegacyDebugLogEntryV1[]
  pendingResult: ResolvedOutcome | null
  pendingAction: { action: PlayerAction; snapshot: LegacyOutcomeSnapshotV1 } | null
}

export interface LegacyLifeRecordV1 {
  sequence: number
  runId: string
  runSeed: string
  stateDigest: string
  identity: LegacyGameStateV1['identity']
  stats: LegacyGameStateV1['stats']
  resources: LegacyGameStateV1['resources']
  cultivation: LegacyGameStateV1['cultivation']
  eventHistory: string[]
  summary: { title: string; finalRealm: Realm; ageYears: number; ageMonths: number; outcome: 'dead' | 'won' | 'migrated'; endReason: string; largestOpportunity: string; regret: string }
  debugLog: LegacyDebugLogEntryV1[]
  legacy?: LegacyLifeMetadata
}

export interface LegacyPersistentGameV1 {
  schemaVersion: 1
  currentSession: LegacyGameSessionV1 | null
  archives: LegacyLifeRecordV1[]
  meta: { totalRuns: number }
}

export interface LegacyGameStateV2 {
  schemaVersion: 2
  runId: string
  runSeed: string
  rngState: number
  status: 'playing' | 'dead' | 'won'
  worldDay: number
  identity: { name: string; birthDay: number; backgroundId: string; spiritRootId: string; talentIds: string[]; faction: Faction }
  stats: GameState['stats']
  resources: GameState['resources']
  cultivation: GameState['cultivation']
  tags: string[]
  flags: Record<string, boolean | number | string>
  relationships: Record<string, number>
  events: { currentEventId: string | null; queue: string[]; history: string[] }
  chronicle: ChronicleEntry[]
  endReason: string | null
}

export interface LegacyGameSessionV2 {
  state: LegacyGameStateV2
  debugLog: DebugLogEntry[]
  pendingResult: ResolvedOutcome | null
  pendingAction: PendingActionContext | null
}

export interface LegacyLifeRecordV2 {
  sequence: number
  runId: string
  runSeed: string
  stateDigest: string
  identity: LegacyGameStateV2['identity']
  stats: LegacyGameStateV2['stats']
  resources: LegacyGameStateV2['resources']
  cultivation: LegacyGameStateV2['cultivation']
  eventHistory: string[]
  chronicle: ChronicleEntry[]
  summary: LifeSummary
  debugLog: DebugLogEntry[]
  legacy?: LegacyLifeMetadata
}

export interface TransitionalPersistentGameV2 {
  schemaVersion: 2
  currentSession: LegacyGameSessionV1 | LegacyGameSessionV2 | null
  archives: Array<LegacyLifeRecordV1 | LegacyLifeRecordV2>
  meta: { totalRuns: number }
}

export interface NormalizedPersistentGameV2 {
  schemaVersion: 2
  currentSession: LegacyGameSessionV2 | null
  archives: LegacyLifeRecordV2[]
  meta: { totalRuns: number }
}

export interface TransitionalPersistentGameV3 {
  schemaVersion: 3
  phase: PersistentPhase
  currentSession: LegacyGameSessionV2 | GameSession | null
  pendingBirthSelection?: PendingBirthSelection | null
  archives: Array<LegacyLifeRecordV2 | LifeRecord>
  meta: { totalRuns: number }
}
