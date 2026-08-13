import type { GameState } from './game'

export type StatKey = keyof GameState['stats']

export type StatModifiers = Partial<Record<StatKey, number>>

export interface WeightedDefinition {
  id: string
  name: string
  weight: number
}

export interface BackgroundDefinition extends WeightedDefinition {
  statModifiers: StatModifiers
  spiritStones: number
  tags: string[]
}

export interface SpiritRootDefinition extends WeightedDefinition {
  cultivationMultiplier: number
}

export interface TalentDefinition extends WeightedDefinition {
  statModifiers: StatModifiers
  spiritStones: number
}
