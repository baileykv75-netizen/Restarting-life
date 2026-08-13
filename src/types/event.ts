import type { StatKey } from './content'
import type { Faction, Realm } from './game'

export type EventCategory =
  | 'mortal'
  | 'cultivation'
  | 'sect'
  | 'exploration'
  | 'breakthrough'
  | 'chain'

export type EventImportance = 'ambient' | 'notable' | 'major'
export type ResourceKey = 'spiritStones' | 'cultivation'
export type FlagValue = boolean | number | string

export type Condition =
  | { type: 'ageMin'; years: number }
  | { type: 'ageMax'; years: number }
  | { type: 'realm'; realm: Realm }
  | { type: 'stageMin'; stage: number }
  | { type: 'stageMax'; stage: number }
  | { type: 'statMin'; stat: StatKey; value: number }
  | { type: 'statMax'; stat: StatKey; value: number }
  | { type: 'hasTag'; tag: string }
  | { type: 'notTag'; tag: string }
  | { type: 'flagEquals'; key: string; value: FlagValue }
  | { type: 'flagMissing'; key: string }
  | { type: 'faction'; faction: Faction }
  | { type: 'relationshipMin'; id: string; value: number }
  | { type: 'resourceMin'; resource: ResourceKey; value: number }

export type Effect =
  | { type: 'addStat'; stat: StatKey; amount: number }
  | { type: 'addSpiritStones'; amount: number }
  | { type: 'addCultivation'; amount: number }
  | { type: 'addTag'; tag: string }
  | { type: 'removeTag'; tag: string }
  | { type: 'setFlag'; key: string; value: FlagValue }
  | { type: 'addRelationship'; id: string; amount: number }
  | { type: 'advanceTime'; months: number }
  | { type: 'queueEvent'; eventId: string }
  | { type: 'killPlayer'; reason: string }
  | { type: 'changeFaction'; faction: Faction }
  | { type: 'setRealm'; realm: Realm; stage: number }

export interface EventChoice {
  id: string
  text: string
  conditions?: Condition[]
  effects: Effect[]
  nextEventId?: string
  resultText?: string
  consequenceText?: string
}

export interface GameEvent {
  id: string
  category: EventCategory
  title: string
  text: string
  weight: number
  once?: boolean
  conditions?: Condition[]
  choices: EventChoice[]
  cooldown?: number
  maxOccurrences?: number
  importance?: EventImportance
  variantGroup?: string
  chronicleText?: string
}
