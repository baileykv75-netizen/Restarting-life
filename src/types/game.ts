import type { ChronicleEntry } from './chronicle'

export type GameStatus = 'playing' | 'dead' | 'won'

export type Realm = 'mortal' | 'qi' | 'foundation' | 'golden_core'

export type Faction = 'mortal' | 'qingyun' | 'loose'

export interface GameState {
  schemaVersion: 2
  runId: string
  runSeed: string
  rngState: number

  status: GameStatus
  worldDay: number

  identity: {
    name: string
    birthDay: number
    backgroundId: string
    spiritRootId: string
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
