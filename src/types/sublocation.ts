export type SublocationArchetype = 'cave' | 'herb-valley' | 'beast-nest' | 'ruin'

export interface SublocationRuntime {
  id: string
  parentLocationId: string
  archetype: SublocationArchetype
  discoveryThresholdDays: number
  discovered: boolean
  /** Optional R13+ fact: this generic R12 anchor has been entered and fully confirmed. */
  deepConfirmed?: boolean
}

export interface SublocationState {
  generated: Record<string, SublocationRuntime>
}
