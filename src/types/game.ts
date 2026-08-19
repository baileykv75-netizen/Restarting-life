import type { AdultEntryProgress } from './adultEntry'
import type { BeastEcologyState, PendingBeastLoot } from './beast'
import type { ChildhoodProgress } from './childhood'
import type { ChronicleEntry } from './chronicle'
import type { CombatState } from './combat'
import type { EquipmentState } from './equipment'
import type { ExplorationState } from './exploration'
import type { InjuryState } from './injury'
import type { InventoryState } from './inventory'
import type { LifespanState } from './lifespan'
import type { PoisonState } from './poison'
import type { SecretRealmState } from './secretRealm'
import type { SectMembershipState, SectProgressState } from './sect'
import type { SublocationState } from './sublocation'

export type GameStatus = 'playing' | 'dead' | 'won'
export type Realm = 'mortal' | 'qi' | 'foundation' | 'golden_core'
export type Faction = 'mortal' | 'qingyun' | 'loose'
export type LifeStage = 'legacy-adult' | 'childhood' | 'adult'
export type LocationKnowledgeStatus = 'rumored' | 'discovered'

export interface TechniquePracticeState {
  proficiencyPoints: number
}

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
  /** Optional for R05-R14 compatibility; materialized only by the explicit R15 equipment bootstrap command. */
  equipment?: EquipmentState
  /** Optional for R05-R17 compatibility; materialized only when a real injury occurs. */
  injuries?: InjuryState
  /** Optional for R05-R18 compatibility; materialized only when a real lifespan effect or permanent penalty occurs. */
  lifespan?: LifespanState
  /** Optional for R05-R19 compatibility; exists only while a formal R20 battle is active. */
  combat?: CombatState
  /** Optional for R05-R20 compatibility; materialized only when a real poison condition is applied. */
  poison?: PoisonState
  /** Optional for R05-R21 compatibility; materialized only when beast world truth is first needed. */
  beastEcology?: BeastEcologyState
  /** Optional corpse/ground remainder after an R22 beast victory; this is not owned inventory. */
  pendingBeastLoot?: PendingBeastLoot
  /** Optional for pre-R24 schema-3 saves. R24+ writes the sole authoritative formal sect membership here. */
  sectMembership?: SectMembershipState
  /** Optional for pre-R25 schema-3 saves. Contribution and the one active sect assignment live here. */
  sectProgress?: SectProgressState
  identity: { name: string; birthDay: number; backgroundId: string; spiritRootId: string; physiqueIds: string[]; talentIds: string[]; faction: Faction }
  stats: { constitution: number; comprehension: number; spiritSense: number; mentality: number; luck: number }
  resources: { spiritStones: number; cultivation: number }
  cultivation: {
    realm: Realm
    stage: number
    /** R16+ optional practice fields. Older schema-3 saves intentionally omit them. */
    practiceInitialized?: true
    knownTechniqueIds?: string[]
    mainTechniqueId?: string | null
    /** R17 is activated by an explicit SessionCommand so old R16 replay semantics stay stable. */
    techniqueSystemInitialized?: true
    auxiliaryTechniqueIds?: string[]
    techniquePractice?: Record<string, TechniquePracticeState>
  }
  world: { currentLocationId: string | null }
  knowledge: { locations: Record<string, LocationKnowledgeStatus> }
  tags: string[]
  flags: Record<string, boolean | number | string>
  relationships: Record<string, number>
  events: { currentEventId: string | null; queue: string[]; history: string[] }
  chronicle: ChronicleEntry[]
  endReason: string | null
}
