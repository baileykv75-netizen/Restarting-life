import type { AdultEntryProgress } from './adultEntry'
import type { ChildhoodProgress } from './childhood'
import type { ChronicleEntry } from './chronicle'
import type { ExplorationState } from './exploration'
import type { InventoryState } from './inventory'
import type { SecretRealmState } from './secretRealm'
import type { SublocationState } from './sublocation'

export type GameStatus = 'playing' | 'dead' | 'won'
export type Realm = 'mortal' | 'qi' | 'foundation' | 'golden_core'
export type Faction = 'mortal' | 'qingyun' | 'loose'
export type LifeStage = 'legacy-adult' | 'childhood' | 'adult'
export type LocationKnowledgeStatus = 'rumored' | 'discovered'

export interface GameState {
  schemaVersion: 3
  runId: string
  runSeed: string
  rngState: number
  status: GameStatus
  lifeStage: LifeStage
  worldDay: number
  /** Optional only for schema-3 saves written before R06; all new V2 lives write it explicitly. */
  childhood?: ChildhoodProgress | null
  /** Optional only for schema-3 saves written before R07; all new completed childhoods initialize it. */
  adultEntry?: AdultEntryProgress | null
  /** Optional for R05-R10 compatibility; first materialized only after a completed R11 region exploration. */
  exploration?: ExplorationState
  /** Optional for R05-R11 compatibility; materialized once when R12 sublocations are initialized. */
  sublocations?: SublocationState
  /** Optional for R05-R12 compatibility; materialized only by the explicit R13 secret-realm bootstrap command. */
  secretRealm?: SecretRealmState
  /** Optional for R05-R13 compatibility; materialized only by the explicit R14 inventory bootstrap command. */
  inventory?: InventoryState
  identity: { name: string; birthDay: number; backgroundId: string; spiritRootId: string; physiqueIds: string[]; talentIds: string[]; faction: Faction }
  stats: { constitution: number; comprehension: number; spiritSense: number; mentality: number; luck: number }
  resources: { spiritStones: number; cultivation: number }
  cultivation: { realm: Realm; stage: number }
  world: { currentLocationId: string | null }
  knowledge: { locations: Record<string, LocationKnowledgeStatus> }
  tags: string[]
  flags: Record<string, boolean | number | string>
  relationships: Record<string, number>
  events: { currentEventId: string | null; queue: string[]; history: string[] }
  chronicle: ChronicleEntry[]
  endReason: string | null
}
