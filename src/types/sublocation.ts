export type SublocationArchetype = 'cave' | 'herb-valley' | 'beast-nest' | 'ruin'

export interface SublocationRuntime {
  id: string
  parentLocationId: string
  archetype: SublocationArchetype
  discoveryThresholdDays: number
  discovered: boolean
}

export interface SublocationState {
  generated: Record<string, SublocationRuntime>
}
