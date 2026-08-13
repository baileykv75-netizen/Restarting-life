export type GameStatus = 'playing' | 'dead' | 'won'

export type Realm = 'mortal' | 'qi' | 'foundation' | 'golden_core'

export type Faction = 'mortal' | 'qingyun' | 'loose'

export interface GameState {
  schemaVersion: 1
  runId: string
  runSeed: string
  rngState: number

  status: GameStatus
  timeMonths: number

  identity: {
    name: string
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

  endReason: string | null
}
