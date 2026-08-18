export type BeastId =
  | 'greenback_wolf'
  | 'redtail_fox'
  | 'ironhide_boar'
  | 'bishui_snake'
  | 'rock_armored_lizard'
  | 'red_maned_ape'
  | 'cold_pool_scale_python'
  | 'one_horned_azure_wolf'

export type BeastEncounterVariant = 'ordinary' | 'strong' | 'special' | 'unique'
export type BeastCombatContextTag = 'cold-pool' | 'damaged-carcass'
export type BeastPopulationPressure = 0 | 1 | 2 | 3

export interface BeastPopulationState {
  pressure: BeastPopulationPressure
  baseline: BeastPopulationPressure
  lastRecoveryCheckDay: number
}

export interface ColdPoolScalePythonState {
  generated: boolean
  instanceId: string | null
  alive: boolean
  lootClaimed: boolean
  lairCleared: boolean
}

export interface OneHornedAzureWolfState {
  uniqueId: 'one_horned_azure_wolf'
  instanceId: string
  alive: boolean
  lootClaimed: boolean
}

export interface BeastEcologyState {
  populations: Record<string, BeastPopulationState>
  specialIndividuals: {
    coldPoolScalePython: ColdPoolScalePythonState
    oneHornedAzureWolf: OneHornedAzureWolfState
  }
}

export interface PendingBeastLoot {
  lootId: string
  sourceBattleId: string
  beastId: BeastId
  beastName: string
  remaining: Record<string, number>
  instanceId?: string
}
