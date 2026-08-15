export type AdultRootRequirement = 'any' | 'has-root' | 'no-root'

export interface AdultEntryProgress {
  optionIds: string[]
  selectedOptionId: string | null
  resolved: boolean
  originLocationSeed: string
  startingLocationSeed: string | null
}

export type AdultEntryEffect =
  | { type: 'tag'; tag: string }
  | { type: 'flag'; key: string; value: boolean | number | string }
  | { type: 'relationship'; id: string; label: string; delta: number }
  | { type: 'spirit-stones'; delta: number }

export interface AdultEntryOptionDefinition {
  id: string
  label: string
  description: string
  resultText: string
  rootRequirement: AdultRootRequirement
  startingLocationSeed: string
  startingLocationLabel: string
  requiresAllTags?: readonly string[]
  accessSeed?: string
  cultivationMethodSeed?: string
  effects?: readonly AdultEntryEffect[]
}

export interface AdultEntryContextRule {
  text: string
  requiresAnyTags?: readonly string[]
  requiresAnyFlags?: readonly string[]
  relationshipAtLeast?: { id: string; value: number }
}

export interface AdultEntryDefinition {
  backgroundId: string
  title: string
  originLocationSeed: string
  originLocationLabel: string
  hasRootText: string
  noRootText: string
  contextRules?: readonly AdultEntryContextRule[]
  options: readonly AdultEntryOptionDefinition[]
}
