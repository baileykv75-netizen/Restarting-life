import type { SessionCommand } from './command'
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

export interface GameSession {
  state: GameState
  debugLog: DebugLogEntry[]
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
