export interface StateChange {
  label: string
  value: string
  tone: 'positive' | 'negative' | 'neutral'
}

export type ChronicleImportance = 'routine' | 'notable' | 'major'
export type ChronicleSourceType =
  | 'event'
  | 'activity'
  | 'npc'
  | 'world'
  | 'fate'
  | 'lifeStage'

export interface ChronicleCheckSummary {
  label: string
  current: number
  target: number
  result: string
}

/**
 * A player-facing biography entry. It stores authored story text plus the
 * structured, engine-derived consequences that actually happened. Future
 * stages may populate location/mood/check fields without changing the basic
 * record shape.
 */
export interface ChronicleEntry {
  id: string
  startDay: number
  endDay: number

  title: string
  sceneText: string
  narrative: string
  choiceText?: string
  consequence?: string | null

  changes: StateChange[]
  check?: ChronicleCheckSummary

  locationId?: string
  moodBefore?: string
  moodAfter?: string

  importance: ChronicleImportance
  sourceType: ChronicleSourceType
  sourceId: string
}
