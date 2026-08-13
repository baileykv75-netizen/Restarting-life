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
  outcome: 'dead' | 'won'
  endReason: string
  largestOpportunity: string
  regret: string
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
}

export interface PersistentGame {
  schemaVersion: 1
  currentSession: GameSession | null
  archives: LifeRecord[]
  meta: {
    totalRuns: number
  }
}
