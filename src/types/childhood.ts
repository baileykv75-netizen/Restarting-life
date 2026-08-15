import type { StatKey } from './content'

export interface ChildhoodProgress {
  nodeIds: string[]
  currentIndex: number
  currentNodeId: string | null
  completedNodeIds: string[]
}

export type ChildhoodEffect =
  | { type: 'tag'; tag: string }
  | { type: 'flag'; key: string; value: boolean | number | string }
  | { type: 'relationship'; id: string; label: string; delta: number }
  | { type: 'stat'; stat: StatKey; delta: number }
  | { type: 'spirit-stones'; delta: number }

export interface ChildhoodChoiceDefinition {
  id: string
  label: string
  days: number
  timeText?: string
  riskText?: string
  resultText: string
  requiresAnyTags?: readonly string[]
  effects: readonly ChildhoodEffect[]
}

export interface ChildhoodInsightDefinition {
  requiresAnyTags: readonly string[]
  text: string
}

export interface ChildhoodEventDefinition {
  id: string
  backgroundId: string
  title: string
  ageYears: number
  narrative: string
  rootConfirmation?: boolean
  insights?: readonly ChildhoodInsightDefinition[]
  choices: readonly ChildhoodChoiceDefinition[]
}
