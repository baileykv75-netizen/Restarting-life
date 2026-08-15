import type { GameState } from './game'

export type StatKey = keyof GameState['stats']
export type StatModifiers = Partial<Record<StatKey, number>>

export interface WeightedDefinition {
  id: string
  name: string
  weight: number
}

export interface BackgroundDefinition extends WeightedDefinition {
  description: string
  statModifiers: StatModifiers
  spiritStones: number
  tags: string[]
}

export type BirthRootBias = 'ordinary' | 'cultivator-contact' | 'cultivator-family'
export type BirthLocationSeedStatus = 'known' | 'rumored'

export interface BirthRelationSeed {
  id: string
  label: string
  description: string
}

export interface BirthLocationSeed {
  id: string
  label: string
  status: BirthLocationSeedStatus
}

export interface BirthBackgroundDefinition extends BackgroundDefinition {
  originId: string
  origin: string
  socialClass: string
  familySummary: string
  spiritStoneRange: readonly [number, number]
  resourceSummary: readonly string[]
  resourceSeedTags: readonly string[]
  relationSeeds: readonly BirthRelationSeed[]
  knownLocationSeeds: readonly BirthLocationSeed[]
  childhoodPoolId: string
  adultEntryTags: readonly string[]
  adultEntrySummary: string
  talentAffinities: readonly string[]
  rootBias: BirthRootBias
  surname?: string
}

export interface SpiritRootDefinition extends WeightedDefinition {
  cultivationMultiplier: number
}

export type SpiritElement = 'metal' | 'wood' | 'water' | 'fire' | 'earth' | 'thunder' | 'ice' | 'wind'

export interface BirthSpiritRootDefinition extends SpiritRootDefinition {
  kind: 'none' | 'elemental' | 'variant'
  elements: readonly SpiritElement[]
  description: string
  ruleTags: readonly string[]
}

export interface TalentDefinition extends WeightedDefinition {
  description: string
  statModifiers: StatModifiers
  spiritStones: number
}

export type TalentCategory = 'exploration' | 'risk' | 'travel' | 'cultivation' | 'learning' | 'combat' | 'profession' | 'social' | 'inheritance'

export interface BirthTalentDefinition extends TalentDefinition {
  mechanics: string
  categories: readonly TalentCategory[]
  ruleTags: readonly string[]
}

export interface PhysiqueDefinition extends WeightedDefinition {
  description: string
  statModifiers: StatModifiers
  ruleTags: readonly string[]
}
