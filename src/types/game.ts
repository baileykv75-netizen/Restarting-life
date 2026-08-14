import type { ChronicleEntry } from './chronicle'

export type GameStatus = 'playing' | 'dead' | 'won'

export type Realm = 'mortal' | 'qi' | 'foundation' | 'golden_core'

export type Faction = 'mortal' | 'qingyun' | 'loose'

/**
 * `legacy-adult` keeps the currently playable V1.2-compatible flow explicit
 * during migration. R05/R06 will introduce real birth-selection/childhood
 * transitions without creating another state container.
 */
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

  identity: {
    name: string
    birthDay: number
    backgroundId: string
    spiritRootId: string
    physiqueIds: string[]
    talentIds: string[]
    faction: Faction
  }

  stats: {
    constitution: number
    comprehension: number
    spiritSense: number
    mentality: number
    luck: number
  }

  resources: {
    spiritStones: number
    cultivation: number
  }

  cultivation: {
    realm: Realm
    stage: number
  }

  world: {
    currentLocationId: string | null
  }

  knowledge: {
    locations: Record<string, LocationKnowledgeStatus>
  }

  tags: string[]
  flags: Record<string, boolean | number | string>
  relationships: Record<string, number>

  events: {
    currentEventId: string | null
    queue: string[]
    history: string[]
  }

  chronicle: ChronicleEntry[]

  endReason: string | null
}
